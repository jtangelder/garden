import { type EncodedPlantImage, inferPlantHintFromFileName } from './image_utils';
import {
  type CalendarEventRecord,
  type CalendarSummary,
  type DriveSpreadsheet,
  type GardenTask,
  type IdentifiedPlantResult,
  type MonthNumber,
  type PlantCareSchedule,
  type PlantRecord,
  type SyncSummary,
} from './models';
import { DEMO_SHEET_ROWS, lookupBuiltInCareSchedule } from './plant_database';
import { addOneDayIso } from './scheduler';

interface GoogleApiErrorPayload {
  error?: {
    message?: string;
    code?: number;
  };
}

async function googleFetchJson<T>(url: string, accessToken: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }
  if (init?.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, {
    ...init,
    headers,
  });

  if (!response.ok) {
    let detail = `${response.status} ${response.statusText}`;
    try {
      const errJson = (await response.json()) as GoogleApiErrorPayload;
      if (errJson.error?.message) {
        detail = errJson.error.message;
      }
    } catch {
      // Ignore JSON parse errors on error payloads
    }
    throw new Error(detail);
  }

  return (await response.json()) as T;
}

interface DriveFileListResponse {
  files?: Array<{
    id: string;
    name: string;
    modifiedTime?: string;
    webViewLink?: string;
  }>;
}

export async function listUserSpreadsheets(accessToken: string): Promise<DriveSpreadsheet[]> {
  const q = encodeURIComponent("mimeType='application/vnd.google-apps.spreadsheet' and trashed=false");
  const fields = encodeURIComponent('files(id,name,modifiedTime,webViewLink)');
  const url = `https://www.googleapis.com/drive/v3/files?q=${q}&fields=${fields}&orderBy=modifiedTime desc&pageSize=50`;
  const data = await googleFetchJson<DriveFileListResponse>(url, accessToken);
  return data.files ?? [];
}

interface SheetMetadataResponse {
  spreadsheetId: string;
  spreadsheetUrl?: string;
  properties?: { title?: string };
  sheets?: Array<{ properties?: { title?: string } }>;
}

interface SheetValuesResponse {
  values?: string[][];
}

export async function fetchSpreadsheetRows(
  accessToken: string,
  spreadsheetId: string,
): Promise<{ sheetTitle: string; firstTabName: string; rows: string[][] }> {
  const metaUrl = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}?fields=spreadsheetId,properties.title,sheets.properties.title`;
  const meta = await googleFetchJson<SheetMetadataResponse>(metaUrl, accessToken);
  const sheetTitle = meta.properties?.title ?? 'Mijn Tuinplanten';
  const firstTabName = meta.sheets?.[0]?.properties?.title ?? 'Planten';

  const range = encodeURIComponent(`${firstTabName}!A1:J500`);
  const valuesUrl = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${range}`;
  const valuesData = await googleFetchJson<SheetValuesResponse>(valuesUrl, accessToken);

  return {
    sheetTitle,
    firstTabName,
    rows: valuesData.values ?? [],
  };
}

export async function writeSpreadsheetRows(
  accessToken: string,
  spreadsheetId: string,
  firstTabName: string,
  rows: readonly (readonly string[])[],
): Promise<void> {
  const range = encodeURIComponent(`${firstTabName}!A1:J${rows.length}`);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${range}?valueInputOption=USER_ENTERED`;
  await googleFetchJson<unknown>(url, accessToken, {
    method: 'PUT',
    body: JSON.stringify({
      majorDimension: 'ROWS',
      values: rows,
    }),
  });
}

export async function createGardenTemplateSpreadsheet(
  accessToken: string,
  title = 'Mijn Tuinplanten',
): Promise<DriveSpreadsheet> {
  const createUrl = 'https://sheets.googleapis.com/v4/spreadsheets';
  const created = await googleFetchJson<SheetMetadataResponse>(createUrl, accessToken, {
    method: 'POST',
    body: JSON.stringify({
      properties: { title },
      sheets: [
        {
          properties: {
            title: 'Planten',
            gridProperties: { frozenRowCount: 1 },
          },
        },
      ],
    }),
  });

  await writeSpreadsheetRows(accessToken, created.spreadsheetId, 'Planten', DEMO_SHEET_ROWS);

  return {
    id: created.spreadsheetId,
    name: created.properties?.title ?? title,
    webViewLink: created.spreadsheetUrl ?? `https://docs.google.com/spreadsheets/d/${created.spreadsheetId}/edit`,
  };
}

interface CalendarListResponse {
  items?: Array<{
    id: string;
    summary: string;
    primary?: boolean;
    accessRole?: string;
  }>;
}

export async function listWritableCalendars(accessToken: string): Promise<CalendarSummary[]> {
  const url = 'https://www.googleapis.com/calendar/v3/users/me/calendarList?minAccessRole=writer';
  const data = await googleFetchJson<CalendarListResponse>(url, accessToken);
  return (data.items ?? []).map(item => ({
    id: item.id,
    summary: item.summary,
    primary: item.primary,
  }));
}

export async function createGardenCalendar(accessToken: string, summary = 'Tuinonderhoud'): Promise<CalendarSummary> {
  const url = 'https://www.googleapis.com/calendar/v3/calendars';
  const created = await googleFetchJson<{ id: string; summary: string }>(url, accessToken, {
    method: 'POST',
    body: JSON.stringify({
      summary,
      description: 'Automatische planning voor water geven, snoeien, knippen en bemesten van tuinplanten.',
    }),
  });
  return {
    id: created.id,
    summary: created.summary,
  };
}

interface CalendarEventsListResponse {
  items?: Array<{
    id: string;
    summary?: string;
    description?: string;
    start?: { date?: string; dateTime?: string };
    end?: { date?: string; dateTime?: string };
    extendedProperties?: {
      private?: Record<string, string>;
    };
  }>;
}

export async function listGardenCalendarEvents(
  accessToken: string,
  calendarId: string,
  startDateIso: string,
  endDateIso: string,
): Promise<CalendarEventRecord[]> {
  const timeMin = encodeURIComponent(`${startDateIso}T00:00:00Z`);
  const timeMax = encodeURIComponent(`${addOneDayIso(endDateIso)}T23:59:59Z`);
  const propFilter = encodeURIComponent('managedBy=jorik-garden');
  const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?timeMin=${timeMin}&timeMax=${timeMax}&privateExtendedProperty=${propFilter}&singleEvents=true&maxResults=2500`;
  const data = await googleFetchJson<CalendarEventsListResponse>(url, accessToken);

  return (data.items ?? []).map(item => ({
    id: item.id,
    summary: item.summary ?? '',
    description: item.description,
    startDate: item.start?.date ?? (item.start?.dateTime ?? '').slice(0, 10),
    endDate: item.end?.date ?? (item.end?.dateTime ?? '').slice(0, 10),
    gardenTaskId: item.extendedProperties?.private?.['gardenTaskId'],
  }));
}

export async function syncTasksToGoogleCalendar(
  accessToken: string,
  calendarId: string,
  tasks: readonly GardenTask[],
  onProgress?: (completed: number, total: number) => void,
): Promise<SyncSummary> {
  const actionable = tasks.filter(t => t.syncStatus === 'new' || t.syncStatus === 'update');
  const unchanged = tasks.length - actionable.length;
  let created = 0;
  let updated = 0;

  for (let i = 0; i < actionable.length; i++) {
    const task = actionable[i];
    const body = {
      summary: task.title,
      description: task.description,
      start: { date: task.date },
      end: { date: addOneDayIso(task.date) },
      transparency: 'transparent',
      extendedProperties: {
        private: {
          managedBy: 'jorik-garden',
          gardenTaskId: task.id,
        },
      },
    };

    if (task.syncStatus === 'update' && task.existingEventId) {
      const updateUrl = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(task.existingEventId)}`;
      await googleFetchJson<unknown>(updateUrl, accessToken, {
        method: 'PUT',
        body: JSON.stringify(body),
      });
      updated++;
    } else {
      const insertUrl = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`;
      await googleFetchJson<unknown>(insertUrl, accessToken, {
        method: 'POST',
        body: JSON.stringify(body),
      });
      created++;
    }

    onProgress?.(i + 1, actionable.length);
  }

  return { created, updated, unchanged };
}

interface GeminiCandidateResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
}

interface GeminiPlantScheduleItem {
  name: string;
  species: string;
  wateringDaysSummer: number;
  wateringDaysWinter: number;
  pruningMonths: number[];
  trimmingMonths: number[];
  fertilizingMonths: number[];
  careNotes: string;
}

function sanitizeMonths(months: readonly number[] | undefined): MonthNumber[] {
  if (!Array.isArray(months)) return [];
  return Array.from(
    new Set(months.map(m => Math.round(Number(m))).filter((m): m is MonthNumber => m >= 1 && m <= 12)),
  ).sort((a, b) => a - b);
}

export async function enrichPlantsCareSchedules(
  plants: readonly PlantRecord[],
  auth: { geminiApiKey?: string; accessToken?: string },
): Promise<Map<number, { schedule: PlantCareSchedule; source: 'gemini' | 'builtin' }>> {
  const results = new Map<number, { schedule: PlantCareSchedule; source: 'gemini' | 'builtin' }>();
  if (!plants.length) {
    return results;
  }

  const apiKey = auth.geminiApiKey?.trim();
  const accessToken = auth.accessToken?.trim();

  if (apiKey || accessToken) {
    try {
      const endpoint = apiKey
        ? `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`
        : 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

      const promptLines = plants.map(
        p =>
          `- Rij ${p.rowNumber}: "${p.name}" (Soort-hint: "${p.species || 'onbekend'}", Locatie: "${p.location || 'tuin'}")`,
      );

      const prompt = [
        'Je bent een ervaren hovenier en botanisch expert in Nederland/België. Geef een jaarlijks onderhoudsschema voor elke onderstaande tuinplant.',
        'Geef per plant terug:',
        '- name: exacte plantnaam uit de invoer',
        '- species: botanische Latijnse naam',
        '- wateringDaysSummer: aantal dagen tussen water geven in warme maanden (apr-sep), bijv. 2 tot 10',
        '- wateringDaysWinter: aantal dagen tussen water geven in koude maanden (okt-mrt), gebruik 0 als neerslag/winterrust volstaat',
        '- pruningMonths: lijst met maandnummers (1=jan .. 12=dec) voor hoofdsnoei/vormsnoei',
        '- trimmingMonths: lijst met maandnummers (1..12) voor knippen, toppen of uitgebloeide bloemen verwijderen',
        '- fertilizingMonths: lijst met maandnummers (1..12) voor bemesten/voeden',
        '- careNotes: beknopte praktische verzorgingsinstructie van 1 zin in het Nederlands',
        '',
        'Planten:',
        ...promptLines,
      ].join('\n');

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (!apiKey && accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: 'ARRAY',
              items: {
                type: 'OBJECT',
                properties: {
                  name: { type: 'STRING' },
                  species: { type: 'STRING' },
                  wateringDaysSummer: { type: 'INTEGER' },
                  wateringDaysWinter: { type: 'INTEGER' },
                  pruningMonths: { type: 'ARRAY', items: { type: 'INTEGER' } },
                  trimmingMonths: { type: 'ARRAY', items: { type: 'INTEGER' } },
                  fertilizingMonths: { type: 'ARRAY', items: { type: 'INTEGER' } },
                  careNotes: { type: 'STRING' },
                },
                required: [
                  'name',
                  'species',
                  'wateringDaysSummer',
                  'wateringDaysWinter',
                  'pruningMonths',
                  'trimmingMonths',
                  'fertilizingMonths',
                  'careNotes',
                ],
              },
            },
          },
        }),
      });

      if (response.ok) {
        const payload = (await response.json()) as GeminiCandidateResponse;
        const rawText = payload.candidates?.[0]?.content?.parts?.[0]?.text;
        if (rawText) {
          const parsed = JSON.parse(rawText) as GeminiPlantScheduleItem[];
          if (Array.isArray(parsed)) {
            for (let i = 0; i < plants.length; i++) {
              const plant = plants[i];
              const match = parsed.find(item => item.name.toLowerCase() === plant.name.toLowerCase()) ?? parsed[i];
              if (match) {
                results.set(plant.rowNumber, {
                  source: 'gemini',
                  schedule: {
                    species: match.species || plant.species || 'Tuinplant',
                    wateringDaysSummer: Math.max(1, Number(match.wateringDaysSummer) || 4),
                    wateringDaysWinter: Math.max(0, Number(match.wateringDaysWinter) || 0),
                    pruningMonths: sanitizeMonths(match.pruningMonths),
                    trimmingMonths: sanitizeMonths(match.trimmingMonths),
                    fertilizingMonths: sanitizeMonths(match.fertilizingMonths),
                    careNotes: match.careNotes || 'Houd de grond licht vochtig en verwijder dode takken.',
                  },
                });
              }
            }
          }
        }
      }
    } catch {
      // Fall back to built-in botanical database below for any unresolved plants
    }
  }

  for (const plant of plants) {
    if (!results.has(plant.rowNumber)) {
      results.set(plant.rowNumber, {
        source: 'builtin',
        schedule: lookupBuiltInCareSchedule(plant.name, plant.species),
      });
    }
  }

  return results;
}

interface GeminiPhotoIdentificationPayload {
  name: string;
  species: string;
  confidence?: string;
  wateringDaysSummer: number;
  wateringDaysWinter: number;
  pruningMonths: number[];
  trimmingMonths: number[];
  fertilizingMonths: number[];
  careNotes: string;
}

export async function identifyPlantFromImage(
  image: EncodedPlantImage,
  auth: { geminiApiKey?: string; accessToken?: string },
): Promise<IdentifiedPlantResult> {
  const apiKey = auth.geminiApiKey?.trim();
  const accessToken = auth.accessToken?.trim();

  if (apiKey || accessToken) {
    const endpoint = apiKey
      ? `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`
      : 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

    const prompt = [
      'Je bent een ervaren hovenier en botanisch expert in Nederland/België.',
      'Analyseer deze foto en herken welke tuinplant, struik, boom, kruid of bloem erop staat.',
      'Geef als resultaat:',
      '- name: de gangbare Nederlandse naam van de plant (bijv. "Boerenhortensia", "Japanse Esdoorn", "Olijfboom")',
      '- species: de botanische Latijnse naam (bijv. "Hydrangea macrophylla")',
      '- confidence: betrouwbaarheid van de herkenning ("hoog", "gemiddeld", of "laag")',
      '- wateringDaysSummer: aantal dagen tussen water geven in warme maanden (apr-sep), bijv. 2 tot 10',
      '- wateringDaysWinter: aantal dagen tussen water geven in koude maanden (okt-mrt), gebruik 0 als regen/winterrust volstaat',
      '- pruningMonths: lijst met maandnummers (1=jan .. 12=dec) voor hoofdsnoei/vormsnoei',
      '- trimmingMonths: lijst met maandnummers (1..12) voor knippen, toppen of uitgebloeide bloemen verwijderen',
      '- fertilizingMonths: lijst met maandnummers (1..12) voor bemesten/voeden',
      '- careNotes: beknopte praktische verzorgingsinstructie van 1 zin in het Nederlands',
    ].join('\n');

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (!apiKey && accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                inlineData: {
                  mimeType: image.mimeType || 'image/jpeg',
                  data: image.base64Data,
                },
              },
              { text: prompt },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'OBJECT',
            properties: {
              name: { type: 'STRING' },
              species: { type: 'STRING' },
              confidence: { type: 'STRING' },
              wateringDaysSummer: { type: 'INTEGER' },
              wateringDaysWinter: { type: 'INTEGER' },
              pruningMonths: { type: 'ARRAY', items: { type: 'INTEGER' } },
              trimmingMonths: { type: 'ARRAY', items: { type: 'INTEGER' } },
              fertilizingMonths: { type: 'ARRAY', items: { type: 'INTEGER' } },
              careNotes: { type: 'STRING' },
            },
            required: [
              'name',
              'species',
              'confidence',
              'wateringDaysSummer',
              'wateringDaysWinter',
              'pruningMonths',
              'trimmingMonths',
              'fertilizingMonths',
              'careNotes',
            ],
          },
        },
      }),
    });

    if (!response.ok) {
      let detail = `${response.status} ${response.statusText}`;
      try {
        const errJson = (await response.json()) as GoogleApiErrorPayload;
        if (errJson.error?.message) {
          detail = errJson.error.message;
        }
      } catch {
        // Ignore JSON parse errors
      }
      throw new Error(`Gemini fotoherkenning mislukt: ${detail}`);
    }

    const payload = (await response.json()) as GeminiCandidateResponse;
    const rawText = payload.candidates?.[0]?.content?.parts?.[0]?.text;
    if (rawText) {
      const parsed = JSON.parse(rawText) as GeminiPhotoIdentificationPayload;
      const rawConf = (parsed.confidence ?? 'hoog').toLowerCase();
      const confidence: IdentifiedPlantResult['confidence'] =
        rawConf === 'laag' ? 'laag' : rawConf === 'gemiddeld' ? 'gemiddeld' : 'hoog';

      return {
        name: parsed.name || 'Geïdentificeerde Tuinplant',
        confidence,
        source: 'gemini',
        schedule: {
          species: parsed.species || 'Tuinplant',
          wateringDaysSummer: Math.max(1, Number(parsed.wateringDaysSummer) || 4),
          wateringDaysWinter: Math.max(0, Number(parsed.wateringDaysWinter) || 0),
          pruningMonths: sanitizeMonths(parsed.pruningMonths),
          trimmingMonths: sanitizeMonths(parsed.trimmingMonths),
          fertilizingMonths: sanitizeMonths(parsed.fertilizingMonths),
          careNotes: parsed.careNotes || 'Houd de grond licht vochtig en verwijder dode takken.',
        },
      };
    }
  }

  // Fallback for Demo Mode when no Gemini API key or Google OAuth session is configured yet
  const fileHint = inferPlantHintFromFileName(image.fileName);
  const guessedName = fileHint ? capitalizeWords(fileHint) : 'Blauwe Regen (Demo Fotoherkenning)';
  const schedule = lookupBuiltInCareSchedule(guessedName);

  return {
    name: guessedName,
    confidence: fileHint ? 'gemiddeld' : 'hoog',
    source: 'builtin',
    schedule,
  };
}

function capitalizeWords(input: string): string {
  return input
    .split(/\s+/)
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}
