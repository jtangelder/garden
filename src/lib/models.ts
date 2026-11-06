export type MonthNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

export const MONTH_NAMES: Record<MonthNumber, string> = {
  1: 'Januari',
  2: 'Februari',
  3: 'Maart',
  4: 'April',
  5: 'Mei',
  6: 'Juni',
  7: 'Juli',
  8: 'Augustus',
  9: 'September',
  10: 'Oktober',
  11: 'November',
  12: 'December',
};

export const MONTH_SHORT_NAMES: Record<MonthNumber, string> = {
  1: 'Jan',
  2: 'Feb',
  3: 'Mrt',
  4: 'Apr',
  5: 'Mei',
  6: 'Jun',
  7: 'Jul',
  8: 'Aug',
  9: 'Sep',
  10: 'Okt',
  11: 'Nov',
  12: 'Dec',
};

export type TaskActionType = 'water' | 'prune' | 'trim' | 'fertilize';

export interface PlantCareSchedule {
  species: string;
  wateringDaysSummer: number;
  wateringDaysWinter: number;
  pruningMonths: MonthNumber[];
  trimmingMonths: MonthNumber[];
  fertilizingMonths: MonthNumber[];
  careNotes: string;
}

export interface IdentifiedPlantResult {
  name: string;
  confidence: 'hoog' | 'gemiddeld' | 'laag';
  source: 'gemini' | 'builtin';
  schedule: PlantCareSchedule;
}

export interface PlantRecord {
  rowNumber: number;
  name: string;
  species: string;
  location: string;
  wateringDaysSummer: number | null;
  wateringDaysWinter: number | null;
  pruningMonths: MonthNumber[];
  trimmingMonths: MonthNumber[];
  fertilizingMonths: MonthNumber[];
  careNotes: string;
  lastEnriched: string;
  needsEnrichment: boolean;
  photoUrl?: string;
}

export type TaskSyncStatus = 'new' | 'update' | 'synced';

export interface GardenTask {
  id: string;
  date: string;
  action: TaskActionType;
  title: string;
  description: string;
  plantNames: string[];
  locations: string[];
  syncStatus: TaskSyncStatus;
  existingEventId?: string;
}

export interface DriveSpreadsheet {
  id: string;
  name: string;
  modifiedTime?: string;
  webViewLink?: string;
}

export interface CalendarSummary {
  id: string;
  summary: string;
  primary?: boolean;
}

export interface CalendarEventRecord {
  id: string;
  summary: string;
  description?: string;
  startDate: string;
  endDate: string;
  gardenTaskId?: string;
}

export interface GoogleConnectionConfig {
  clientId: string;
  geminiApiKey: string;
  selectedSpreadsheetId: string;
  selectedCalendarId: string;
  planningHorizonDays: number;
}

export interface SyncSummary {
  created: number;
  updated: number;
  unchanged: number;
}
