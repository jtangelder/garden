import { Injectable, NgZone, computed, inject, signal } from '@angular/core';
import {
  createGardenCalendar,
  createGardenTemplateSpreadsheet,
  enrichPlantsCareSchedules,
  fetchSpreadsheetRows,
  listGardenCalendarEvents,
  listUserSpreadsheets,
  listWritableCalendars,
  syncTasksToGoogleCalendar,
  writeSpreadsheetRows,
} from '../lib/google_api';
import {
  type CalendarEventRecord,
  type CalendarSummary,
  type DriveSpreadsheet,
  type GardenTask,
  type GoogleConnectionConfig,
  type PlantRecord,
  type TaskActionType,
} from '../lib/models';
import { DEMO_SHEET_ROWS } from '../lib/plant_database';
import { addOneDayIso, generateGardenSchedule, todayIso } from '../lib/scheduler';
import { applyCareScheduleToPlant, parseSheetRows, SHEET_HEADERS, serializePlantRow } from '../lib/sheet_parser';
import { NotificationService } from './notification.service';

const STORAGE_KEY = 'garden_connection_config_v1';

const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.metadata.readonly',
  'https://www.googleapis.com/auth/calendar',
].join(' ');

interface GisTokenResponse {
  access_token?: string;
  error?: string;
  error_description?: string;
}

interface GisTokenClient {
  requestAccessToken: (overrideConfig?: { prompt?: string }) => void;
}

declare global {
  interface Window {
    google?: {
      accounts?: {
        oauth2?: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: GisTokenResponse) => void;
            error_callback?: (err: { message?: string; type?: string }) => void;
          }) => GisTokenClient;
          revoke?: (token: string, done?: () => void) => void;
        };
      };
    };
  }
}

@Injectable({ providedIn: 'root' })
export class GardenService {
  private readonly notifications = inject(NotificationService);
  private readonly zone = inject(NgZone);

  private accessToken = '';

  readonly connected = signal(false);
  readonly isDemo = signal(false);
  readonly connecting = signal(false);
  readonly loadingSheet = signal(false);
  readonly enriching = signal(false);
  readonly syncingCalendar = signal(false);
  readonly syncProgress = signal<{ completed: number; total: number } | null>(null);

  readonly config = signal<GoogleConnectionConfig>(this.loadSavedConfig());
  readonly spreadsheets = signal<DriveSpreadsheet[]>([]);
  readonly calendars = signal<CalendarSummary[]>([]);
  readonly sheetTitle = signal('Mijn Tuinplanten');
  readonly firstTabName = signal('Planten');
  readonly plants = signal<PlantRecord[]>([]);
  readonly existingCalendarEvents = signal<CalendarEventRecord[]>([]);

  readonly selectedActionFilter = signal<'all' | TaskActionType>('all');
  readonly selectedPlantRow = signal<number | null>(null);

  readonly selectedPlant = computed<PlantRecord | null>(() => {
    const row = this.selectedPlantRow();
    const list = this.plants();
    if (!list.length) {
      return null;
    }
    if (row === null) {
      return list[0];
    }
    return list.find(p => p.rowNumber === row) ?? list[0];
  });

  readonly unenrichedCount = computed(() => this.plants().filter(p => p.needsEnrichment).length);

  readonly tasks = computed<GardenTask[]>(() =>
    generateGardenSchedule(this.plants(), todayIso(), this.config().planningHorizonDays, this.existingCalendarEvents()),
  );

  readonly filteredTasks = computed<GardenTask[]>(() => {
    const filter = this.selectedActionFilter();
    const all = this.tasks();
    if (filter === 'all') {
      return all;
    }
    return all.filter(t => t.action === filter);
  });

  readonly pendingSyncCount = computed(
    () => this.tasks().filter(t => t.syncStatus === 'new' || t.syncStatus === 'update').length,
  );

  readonly syncedCount = computed(() => this.tasks().filter(t => t.syncStatus === 'synced').length);

  readonly selectedSpreadsheet = computed(() => {
    const id = this.config().selectedSpreadsheetId;
    return this.spreadsheets().find(s => s.id === id) ?? null;
  });

  readonly selectedCalendar = computed(() => {
    const id = this.config().selectedCalendarId;
    return this.calendars().find(c => c.id === id) ?? null;
  });

  enableDemo(): void {
    this.accessToken = '';
    this.connected.set(true);
    this.isDemo.set(true);

    const demoSheets: DriveSpreadsheet[] = [
      {
        id: 'demo-sheet-1',
        name: 'Mijn Tuinplanten (Demo Sheet)',
        webViewLink: 'https://docs.google.com/spreadsheets',
      },
    ];
    const demoCalendars: CalendarSummary[] = [
      { id: 'demo-cal-garden', summary: 'Tuinonderhoud (Demo)', primary: true },
      { id: 'demo-cal-family', summary: 'Gezinsagenda (Demo)' },
    ];

    this.spreadsheets.set(demoSheets);
    this.calendars.set(demoCalendars);
    this.sheetTitle.set('Mijn Tuinplanten (Demo Sheet)');
    this.firstTabName.set('Planten');

    const parsed = parseSheetRows(DEMO_SHEET_ROWS);
    this.plants.set(parsed);
    this.selectedPlantRow.set(parsed[0]?.rowNumber ?? null);
    this.existingCalendarEvents.set([]);

    this.config.update(curr => ({
      ...curr,
      selectedSpreadsheetId: 'demo-sheet-1',
      selectedCalendarId: 'demo-cal-garden',
    }));
  }

  updateConfig(partial: Partial<GoogleConnectionConfig>): void {
    this.config.update(curr => {
      const next = { ...curr, ...partial };
      this.saveConfig(next);
      return next;
    });
  }

  async connectGoogle(): Promise<boolean> {
    const clientId = this.config().clientId.trim();
    if (!clientId) {
      this.notifications.error('Stel eerst je Google OAuth Client ID in bij Instellingen.');
      return false;
    }

    this.connecting.set(true);
    try {
      await this.ensureGisScriptLoaded();

      const oauth2 = window.google?.accounts?.oauth2;
      if (!oauth2) {
        throw new Error('Google Identity Services kon niet worden geladen.');
      }

      const token = await new Promise<string>((resolve, reject) => {
        const client = oauth2.initTokenClient({
          client_id: clientId,
          scope: GOOGLE_SCOPES,
          callback: response => {
            if (response.error || !response.access_token) {
              reject(new Error(response.error_description || response.error || 'OAuth mislukt'));
              return;
            }
            resolve(response.access_token);
          },
          error_callback: err => {
            reject(new Error(err.message || err.type || 'OAuth-venster gesloten'));
          },
        });
        client.requestAccessToken({ prompt: 'consent' });
      });

      this.zone.run(() => {
        this.accessToken = token;
        this.isDemo.set(false);
        this.connected.set(true);
      });

      await this.refreshGoogleResources();
      this.notifications.info('Verbonden met Google Drive & Google Agenda.');
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.notifications.error(`Inloggen bij Google mislukt: ${msg}`);
      return false;
    } finally {
      this.zone.run(() => this.connecting.set(false));
    }
  }

  disconnect(): void {
    if (this.accessToken && window.google?.accounts?.oauth2?.revoke) {
      window.google.accounts.oauth2.revoke(this.accessToken);
    }
    this.enableDemo();
    this.notifications.info('Teruggeschakeld naar de Demo-modus.');
  }

  async refreshGoogleResources(): Promise<void> {
    if (this.isDemo() || !this.accessToken) {
      return;
    }

    this.loadingSheet.set(true);
    try {
      const [sheets, cals] = await Promise.all([
        listUserSpreadsheets(this.accessToken),
        listWritableCalendars(this.accessToken),
      ]);

      this.spreadsheets.set(sheets);
      this.calendars.set(cals);

      const currentSheetId = this.config().selectedSpreadsheetId;
      const validSheet = sheets.find(s => s.id === currentSheetId) ?? sheets[0] ?? null;

      const currentCalId = this.config().selectedCalendarId;
      const validCal = cals.find(c => c.id === currentCalId) ?? cals.find(c => c.primary) ?? cals[0] ?? null;

      this.updateConfig({
        selectedSpreadsheetId: validSheet?.id ?? '',
        selectedCalendarId: validCal?.id ?? '',
      });

      if (validSheet) {
        await this.loadSpreadsheet(validSheet.id);
      } else {
        this.plants.set([]);
      }

      if (validCal) {
        await this.loadCalendarEvents(validCal.id);
      }
    } finally {
      this.loadingSheet.set(false);
    }
  }

  async selectSpreadsheet(spreadsheetId: string): Promise<void> {
    this.updateConfig({ selectedSpreadsheetId: spreadsheetId });
    if (!this.isDemo() && this.accessToken && spreadsheetId) {
      await this.loadSpreadsheet(spreadsheetId);
    }
  }

  async selectCalendar(calendarId: string): Promise<void> {
    this.updateConfig({ selectedCalendarId: calendarId });
    if (!this.isDemo() && this.accessToken && calendarId) {
      await this.loadCalendarEvents(calendarId);
    }
  }

  async createTemplateSheet(title = 'Mijn Tuinplanten'): Promise<void> {
    if (this.isDemo() || !this.accessToken) {
      const parsed = parseSheetRows(DEMO_SHEET_ROWS);
      this.plants.set(parsed);
      this.notifications.info('Demo-spreadsheet hersteld naar de standaardplanten.');
      return;
    }

    this.loadingSheet.set(true);
    try {
      const created = await createGardenTemplateSpreadsheet(this.accessToken, title);
      this.spreadsheets.update(list => [created, ...list]);
      this.updateConfig({ selectedSpreadsheetId: created.id });
      await this.loadSpreadsheet(created.id);
      this.notifications.info(`Google Spreadsheet "${created.name}" aangemaakt in je Drive.`);
    } finally {
      this.loadingSheet.set(false);
    }
  }

  async createDedicatedCalendar(summary = 'Tuinonderhoud'): Promise<void> {
    if (this.isDemo() || !this.accessToken) {
      const demoCal: CalendarSummary = {
        id: `demo-cal-${Date.now()}`,
        summary,
      };
      this.calendars.update(list => [...list, demoCal]);
      this.updateConfig({ selectedCalendarId: demoCal.id });
      this.existingCalendarEvents.set([]);
      this.notifications.info(`Demo-agenda "${summary}" aangemaakt.`);
      return;
    }

    this.syncingCalendar.set(true);
    try {
      const created = await createGardenCalendar(this.accessToken, summary);
      this.calendars.update(list => [...list, created]);
      await this.selectCalendar(created.id);
      this.notifications.info(`Google Agenda "${created.summary}" aangemaakt.`);
    } finally {
      this.syncingCalendar.set(false);
    }
  }

  async addPlant(name: string, species: string, location: string): Promise<void> {
    const trimmedName = name.trim();
    if (!trimmedName) return;

    const current = this.plants();
    const nextRowNumber = current.length > 0 ? Math.max(...current.map(p => p.rowNumber)) + 1 : 2;

    const draft: PlantRecord = {
      rowNumber: nextRowNumber,
      name: trimmedName,
      species: species.trim(),
      location: location.trim(),
      wateringDaysSummer: null,
      wateringDaysWinter: null,
      pruningMonths: [],
      trimmingMonths: [],
      fertilizingMonths: [],
      careNotes: '',
      lastEnriched: '',
      needsEnrichment: true,
    };

    const enrichedMap = await enrichPlantsCareSchedules([draft], {
      geminiApiKey: this.config().geminiApiKey,
      accessToken: this.accessToken,
    });
    const result = enrichedMap.get(draft.rowNumber);
    const finalPlant = result ? applyCareScheduleToPlant(draft, result.schedule, todayIso()) : draft;

    const updatedList = [...current, finalPlant];
    this.plants.set(updatedList);
    this.selectedPlantRow.set(finalPlant.rowNumber);

    await this.persistPlantsToSheet(updatedList);
    this.notifications.info(`"${finalPlant.name}" toegevoegd met onderhoudsschema.`);
  }

  async removePlant(rowNumber: number): Promise<void> {
    const target = this.plants().find(p => p.rowNumber === rowNumber);
    const updated = this.plants()
      .filter(p => p.rowNumber !== rowNumber)
      .map((p, idx) => ({ ...p, rowNumber: idx + 2 }));

    this.plants.set(updated);
    if (this.selectedPlantRow() === rowNumber) {
      this.selectedPlantRow.set(updated[0]?.rowNumber ?? null);
    }

    await this.persistPlantsToSheet(updated);
    if (target) {
      this.notifications.info(`"${target.name}" verwijderd uit de spreadsheet.`);
    }
  }

  async enrichPlants(forceAll = false): Promise<void> {
    const allPlants = this.plants();
    const targets = forceAll ? allPlants : allPlants.filter(p => p.needsEnrichment);

    if (!targets.length) {
      this.notifications.info('Alle planten hebben al een volledig verzorgingsschema.');
      return;
    }

    this.enriching.set(true);
    try {
      const scheduleMap = await enrichPlantsCareSchedules(targets, {
        geminiApiKey: this.config().geminiApiKey,
        accessToken: this.accessToken,
      });

      const today = todayIso();
      let geminiCount = 0;
      const updated = allPlants.map(plant => {
        const match = scheduleMap.get(plant.rowNumber);
        if (!match) return plant;
        if (match.source === 'gemini') {
          geminiCount++;
        }
        return applyCareScheduleToPlant(
          forceAll ? { ...plant, species: '', careNotes: '' } : plant,
          match.schedule,
          today,
        );
      });

      this.plants.set(updated);
      await this.persistPlantsToSheet(updated);

      const via = geminiCount > 0 ? 'Gemini AI' : 'Botanische Plantendatabase';
      this.notifications.info(`${targets.length} plantschema('s) verrijkt via ${via} en opgeslagen in de spreadsheet.`);
    } finally {
      this.enriching.set(false);
    }
  }

  async syncToCalendar(): Promise<void> {
    const allTasks = this.tasks();
    const actionable = allTasks.filter(t => t.syncStatus === 'new' || t.syncStatus === 'update');

    if (!actionable.length) {
      this.notifications.info('Alle tuintaken zijn al gesynchroniseerd met de agenda.');
      return;
    }

    this.syncingCalendar.set(true);
    this.syncProgress.set({ completed: 0, total: actionable.length });

    try {
      if (this.isDemo() || !this.accessToken) {
        const simulatedEvents: CalendarEventRecord[] = allTasks.map(t => ({
          id: t.existingEventId ?? `demo-ev-${t.id}`,
          summary: t.title,
          description: t.description,
          startDate: t.date,
          endDate: addOneDayIso(t.date),
          gardenTaskId: t.id,
        }));
        this.existingCalendarEvents.set(simulatedEvents);
        this.notifications.info(
          `${actionable.length} onderhoudstaak/-taken gesynchroniseerd met ${this.selectedCalendar()?.summary ?? 'Demo Agenda'}.`,
        );
        return;
      }

      const calendarId = this.config().selectedCalendarId;
      if (!calendarId) {
        this.notifications.error('Selecteer eerst een Google Agenda.');
        return;
      }

      const summary = await syncTasksToGoogleCalendar(this.accessToken, calendarId, allTasks, (completed, total) => {
        this.zone.run(() => this.syncProgress.set({ completed, total }));
      });

      await this.loadCalendarEvents(calendarId);
      this.notifications.info(
        `Agendasync voltooid: ${summary.created} aangemaakt, ${summary.updated} bijgewerkt (${summary.unchanged} ongewijzigd).`,
      );
    } finally {
      this.syncingCalendar.set(false);
      this.syncProgress.set(null);
    }
  }

  private async loadSpreadsheet(spreadsheetId: string): Promise<void> {
    this.loadingSheet.set(true);
    try {
      const { sheetTitle, firstTabName, rows } = await fetchSpreadsheetRows(this.accessToken, spreadsheetId);
      this.sheetTitle.set(sheetTitle);
      this.firstTabName.set(firstTabName);
      const parsed = parseSheetRows(rows);
      this.plants.set(parsed);
      this.selectedPlantRow.set(parsed[0]?.rowNumber ?? null);

      if (parsed.some(p => p.needsEnrichment)) {
        await this.enrichPlants(false);
      }
    } finally {
      this.loadingSheet.set(false);
    }
  }

  private async loadCalendarEvents(calendarId: string): Promise<void> {
    const startIso = todayIso();
    const endIso = addOneDayIso(startIso);
    const tasks = this.tasks();
    const horizonEndIso = tasks.length > 0 ? tasks[tasks.length - 1].date : endIso;

    const events = await listGardenCalendarEvents(this.accessToken, calendarId, startIso, horizonEndIso);
    this.existingCalendarEvents.set(events);
  }

  private async persistPlantsToSheet(plants: readonly PlantRecord[]): Promise<void> {
    if (this.isDemo() || !this.accessToken) {
      return;
    }
    const spreadsheetId = this.config().selectedSpreadsheetId;
    if (!spreadsheetId) {
      return;
    }

    const rows: string[][] = [[...SHEET_HEADERS], ...plants.map(p => serializePlantRow(p))];
    await writeSpreadsheetRows(this.accessToken, spreadsheetId, this.firstTabName(), rows);
  }

  private ensureGisScriptLoaded(): Promise<void> {
    if (typeof window !== 'undefined' && window.google?.accounts?.oauth2) {
      return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
      const existing = document.querySelector<HTMLScriptElement>(
        'script[src="https://accounts.google.com/gsi/client"]',
      );
      if (existing) {
        existing.addEventListener('load', () => resolve());
        existing.addEventListener('error', () =>
          reject(new Error('Google Identity Services script kon niet worden geladen')),
        );
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Google Identity Services script kon niet worden geladen'));
      document.head.appendChild(script);
    });
  }

  private loadSavedConfig(): GoogleConnectionConfig {
    const defaults: GoogleConnectionConfig = {
      clientId: '',
      geminiApiKey: '',
      selectedSpreadsheetId: '',
      selectedCalendarId: '',
      planningHorizonDays: 90,
    };
    try {
      if (typeof localStorage === 'undefined') return defaults;
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaults;
      const parsed = JSON.parse(raw) as Partial<GoogleConnectionConfig>;
      return {
        clientId: parsed.clientId ?? '',
        geminiApiKey: parsed.geminiApiKey ?? '',
        selectedSpreadsheetId: parsed.selectedSpreadsheetId ?? '',
        selectedCalendarId: parsed.selectedCalendarId ?? '',
        planningHorizonDays: Number(parsed.planningHorizonDays) || 90,
      };
    } catch {
      return defaults;
    }
  }

  private saveConfig(config: GoogleConnectionConfig): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
      }
    } catch {
      // Ignore storage quota errors
    }
  }
}
