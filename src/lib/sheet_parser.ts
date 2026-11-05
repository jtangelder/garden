import { MONTH_NAMES, MONTH_SHORT_NAMES, type MonthNumber, type PlantCareSchedule, type PlantRecord } from './models';

export const SHEET_HEADERS: readonly string[] = [
  'Plantnaam',
  'Soort / Variëteit',
  'Locatie',
  'Watergeven Dagen (Zomer)',
  'Watergeven Dagen (Winter)',
  'Snoeimaanden',
  'Knipmaanden',
  'Bemestingsmaanden',
  'Verzorgingsinstructies',
  'Laatst Verrijkt',
];

const MONTH_LOOKUP: Record<string, MonthNumber> = {
  '1': 1,
  jan: 1,
  januari: 1,
  january: 1,
  '2': 2,
  feb: 2,
  februari: 2,
  february: 2,
  '3': 3,
  mrt: 3,
  maart: 3,
  mar: 3,
  march: 3,
  '4': 4,
  apr: 4,
  april: 4,
  '5': 5,
  mei: 5,
  may: 5,
  '6': 6,
  jun: 6,
  juni: 6,
  june: 6,
  '7': 7,
  jul: 7,
  juli: 7,
  july: 7,
  '8': 8,
  aug: 8,
  augustus: 8,
  august: 8,
  '9': 9,
  sep: 9,
  sept: 9,
  september: 9,
  '10': 10,
  okt: 10,
  oktober: 10,
  oct: 10,
  october: 10,
  '11': 11,
  nov: 11,
  november: 11,
  '12': 12,
  dec: 12,
  december: 12,
};

export function parseMonthsCell(raw: string | undefined): MonthNumber[] {
  if (!raw || !raw.trim()) {
    return [];
  }
  const normalized = raw.trim().toLowerCase();
  if (
    normalized === 'geen' ||
    normalized === 'none' ||
    normalized === '-' ||
    normalized === 'n/a' ||
    normalized === 'n.v.t.'
  ) {
    return [];
  }

  const result = new Set<MonthNumber>();
  const tokens = normalized.split(/[,;/]+/).map(t => t.trim());

  for (const token of tokens) {
    if (!token) continue;
    const rangeParts = token.split(/\s*-\s*/);
    if (rangeParts.length === 2) {
      const start = MONTH_LOOKUP[rangeParts[0]];
      const end = MONTH_LOOKUP[rangeParts[1]];
      if (start && end) {
        if (start <= end) {
          for (let m = start; m <= end; m++) {
            result.add(m as MonthNumber);
          }
        } else {
          for (let m = start; m <= 12; m++) {
            result.add(m as MonthNumber);
          }
          for (let m = 1; m <= end; m++) {
            result.add(m as MonthNumber);
          }
        }
        continue;
      }
    }

    const single = MONTH_LOOKUP[token];
    if (single) {
      result.add(single);
    }
  }

  return Array.from(result).sort((a, b) => a - b);
}

export function formatMonthsCell(months: readonly MonthNumber[]): string {
  if (!months.length) {
    return 'Geen';
  }
  const unique = Array.from(new Set(months)).sort((a, b) => a - b);
  return unique.map(m => MONTH_SHORT_NAMES[m]).join(', ');
}

export function formatMonthsFull(months: readonly MonthNumber[]): string {
  if (!months.length) {
    return 'Geen';
  }
  const unique = Array.from(new Set(months)).sort((a, b) => a - b);
  return unique.map(m => MONTH_NAMES[m]).join(', ');
}

function parsePositiveIntOrZero(raw: string | undefined): number | null {
  if (raw === undefined || raw.trim() === '') {
    return null;
  }
  const parsed = Number.parseInt(raw.trim(), 10);
  if (Number.isNaN(parsed) || parsed < 0) {
    return null;
  }
  return parsed;
}

export function isHeaderRow(row: readonly string[]): boolean {
  const first = (row[0] ?? '').trim().toLowerCase();
  return first === 'plantnaam' || first === 'plant name' || first === 'plant' || first === 'naam' || first === 'name';
}

export function parseSheetRows(rows: readonly (readonly string[])[]): PlantRecord[] {
  if (!rows.length) {
    return [];
  }

  const startIndex = isHeaderRow(rows[0]) ? 1 : 0;
  const records: PlantRecord[] = [];

  for (let i = startIndex; i < rows.length; i++) {
    const row = rows[i];
    const name = (row[0] ?? '').trim();
    if (!name) {
      continue;
    }

    const species = (row[1] ?? '').trim();
    const location = (row[2] ?? '').trim();
    const wateringDaysSummer = parsePositiveIntOrZero(row[3]);
    const wateringDaysWinter = parsePositiveIntOrZero(row[4]);
    const pruningMonths = parseMonthsCell(row[5]);
    const trimmingMonths = parseMonthsCell(row[6]);
    const fertilizingMonths = parseMonthsCell(row[7]);
    const careNotes = (row[8] ?? '').trim();
    const lastEnriched = (row[9] ?? '').trim();

    const hasScheduleData =
      wateringDaysSummer !== null &&
      wateringDaysWinter !== null &&
      (pruningMonths.length > 0 || trimmingMonths.length > 0 || fertilizingMonths.length > 0 || careNotes.length > 0);

    records.push({
      rowNumber: i + 1,
      name,
      species,
      location,
      wateringDaysSummer,
      wateringDaysWinter,
      pruningMonths,
      trimmingMonths,
      fertilizingMonths,
      careNotes,
      lastEnriched,
      needsEnrichment: !hasScheduleData,
    });
  }

  return records;
}

export function applyCareScheduleToPlant(
  plant: PlantRecord,
  schedule: PlantCareSchedule,
  enrichedDateIso: string,
): PlantRecord {
  return {
    ...plant,
    species: plant.species || schedule.species,
    wateringDaysSummer: schedule.wateringDaysSummer,
    wateringDaysWinter: schedule.wateringDaysWinter,
    pruningMonths: [...schedule.pruningMonths],
    trimmingMonths: [...schedule.trimmingMonths],
    fertilizingMonths: [...schedule.fertilizingMonths],
    careNotes: plant.careNotes || schedule.careNotes,
    lastEnriched: enrichedDateIso,
    needsEnrichment: false,
  };
}

export function serializePlantRow(plant: PlantRecord): string[] {
  return [
    plant.name,
    plant.species,
    plant.location,
    plant.wateringDaysSummer !== null ? String(plant.wateringDaysSummer) : '',
    plant.wateringDaysWinter !== null ? String(plant.wateringDaysWinter) : '',
    formatMonthsCell(plant.pruningMonths),
    formatMonthsCell(plant.trimmingMonths),
    formatMonthsCell(plant.fertilizingMonths),
    plant.careNotes,
    plant.lastEnriched,
  ];
}
