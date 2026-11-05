import { Temporal } from 'temporal-polyfill';
import {
  MONTH_NAMES,
  type CalendarEventRecord,
  type GardenTask,
  type MonthNumber,
  type PlantRecord,
  type TaskActionType,
} from './models';

export function isWarmSeason(month: number): boolean {
  return month >= 4 && month <= 9;
}

export function addOneDayIso(dateIso: string): string {
  return Temporal.PlainDate.from(dateIso).add({ days: 1 }).toString();
}

export function todayIso(): string {
  return Temporal.Now.plainDateISO().toString();
}

function findNthSaturdayOfMonth(year: number, month: number, nth: number): Temporal.PlainDate {
  const firstOfMonth = Temporal.PlainDate.from({ year, month, day: 1 });
  // In Temporal, dayOfWeek is 1 (Monday) to 7 (Sunday); Saturday is 6.
  const daysUntilFirstSaturday = (6 - firstOfMonth.dayOfWeek + 7) % 7;
  const firstSaturday = firstOfMonth.add({ days: daysUntilFirstSaturday });
  return firstSaturday.add({ days: (nth - 1) * 7 });
}

interface ActionBucket {
  plants: PlantRecord[];
}

function buildActionTask(
  action: TaskActionType,
  date: Temporal.PlainDate,
  plants: readonly PlantRecord[],
  existingByTaskId: ReadonlyMap<string, CalendarEventRecord>,
): GardenTask {
  const dateIso = date.toString();
  const id = `garden-${action}-${dateIso}`;
  const plantNames = plants.map(p => p.name);
  const locations = Array.from(new Set(plants.map(p => p.location).filter(Boolean)));

  const actionVerb: Record<TaskActionType, string> = {
    water: 'Water geven',
    prune: 'Snoeien',
    trim: 'Knippen & Toppen',
    fertilize: 'Bemesten',
  };

  const summaryPlants =
    plantNames.length <= 3
      ? plantNames.join(', ')
      : `${plantNames.slice(0, 2).join(', ')} +${plantNames.length - 2} meer`;

  const title = `🌿 ${actionVerb[action]}: ${summaryPlants}`;

  const lines: string[] = [
    `Tuinonderhoud: ${actionVerb[action]} (${MONTH_NAMES[date.month as MonthNumber]} ${date.year})`,
    '',
    'Planten:',
    ...plants.map(p => {
      const loc = p.location ? ` [${p.location}]` : '';
      const note = p.careNotes ? ` — ${p.careNotes}` : '';
      return `• ${p.name}${loc}${note}`;
    }),
  ];
  const description = lines.join('\n');

  const existing = existingByTaskId.get(id);
  let syncStatus: GardenTask['syncStatus'] = 'new';
  if (existing) {
    const isSame =
      existing.summary === title && (existing.description ?? '') === description && existing.startDate === dateIso;
    syncStatus = isSame ? 'synced' : 'update';
  }

  return {
    id,
    date: dateIso,
    action,
    title,
    description,
    plantNames,
    locations,
    syncStatus,
    existingEventId: existing?.id,
  };
}

export interface ScheduleMonthGroup {
  yearMonth: string;
  year: number;
  month: MonthNumber;
  label: string;
  isPastMonth: boolean;
  isCurrentMonth: boolean;
  tasks: GardenTask[];
}

export function groupTasksByMonth(
  tasks: readonly GardenTask[],
  referenceDateIso: string,
  includePreviousMonth = true,
): ScheduleMonthGroup[] {
  const refDate = Temporal.PlainDate.from(referenceDateIso);
  const currentYm = refDate.toPlainYearMonth();
  const prevYm = currentYm.subtract({ months: 1 });

  const grouped = new Map<string, GardenTask[]>();
  if (includePreviousMonth) {
    grouped.set(prevYm.toString(), []);
  }
  grouped.set(currentYm.toString(), []);

  for (const task of tasks) {
    const ymKey = task.date.slice(0, 7);
    const list = grouped.get(ymKey);
    if (list) {
      list.push(task);
    } else {
      grouped.set(ymKey, [task]);
    }
  }

  const sortedKeys = Array.from(grouped.keys()).sort((a, b) => a.localeCompare(b));

  return sortedKeys.map(ymKey => {
    const ym = Temporal.PlainYearMonth.from(ymKey);
    const monthNum = ym.month as MonthNumber;
    const cmp = Temporal.PlainYearMonth.compare(ym, currentYm);
    return {
      yearMonth: ymKey,
      year: ym.year,
      month: monthNum,
      label: `${MONTH_NAMES[monthNum]} ${ym.year}`,
      isPastMonth: cmp < 0,
      isCurrentMonth: cmp === 0,
      tasks: grouped.get(ymKey) ?? [],
    };
  });
}

export function generateGardenSchedule(
  plants: readonly PlantRecord[],
  startDateIso: string,
  horizonDays: number,
  existingEvents: readonly CalendarEventRecord[] = [],
  includePreviousMonth = false,
): GardenTask[] {
  const activePlants = plants.filter(p => p.name.trim().length > 0);
  if (!activePlants.length || horizonDays <= 0) {
    return [];
  }

  const start = Temporal.PlainDate.from(startDateIso);
  const end = start.add({ days: horizonDays });
  const monthlyStart = includePreviousMonth ? start.subtract({ months: 1 }).with({ day: 1 }) : start;

  const existingByTaskId = new Map<string, CalendarEventRecord>();
  for (const ev of existingEvents) {
    if (ev.gardenTaskId) {
      existingByTaskId.set(ev.gardenTaskId, ev);
    }
  }

  const tasks: GardenTask[] = [];

  // 1. Generate Watering Tasks across the upcoming horizon
  for (let dayOffset = 0; dayOffset <= horizonDays; dayOffset++) {
    const current = start.add({ days: dayOffset });
    const warm = isWarmSeason(current.month);

    const plantsToWater = activePlants.filter(plant => {
      const interval = warm ? plant.wateringDaysSummer : plant.wateringDaysWinter;
      if (!interval || interval <= 0) {
        return false;
      }
      return dayOffset % interval === 0;
    });

    if (plantsToWater.length > 0) {
      tasks.push(buildActionTask('water', current, plantsToWater, existingByTaskId));
    }
  }

  // 2. Collect unique Year-Months in [monthlyStart, end] for Prune, Trim, Fertilize
  const seenYearMonths = new Set<string>();
  const yearMonths: Temporal.PlainYearMonth[] = [];

  let cursor = monthlyStart;
  while (Temporal.PlainDate.compare(cursor, end) <= 0) {
    const ym = cursor.toPlainYearMonth();
    const key = ym.toString();
    if (!seenYearMonths.has(key)) {
      seenYearMonths.add(key);
      yearMonths.push(ym);
    }
    cursor = cursor.add({ days: 7 });
  }
  const endYm = end.toPlainYearMonth();
  if (!seenYearMonths.has(endYm.toString())) {
    yearMonths.push(endYm);
  }

  const monthlyActionNthSaturday: Record<Exclude<TaskActionType, 'water'>, number> = {
    prune: 1,
    trim: 2,
    fertilize: 3,
  };

  for (const ym of yearMonths) {
    const monthNum = ym.month as MonthNumber;

    const buckets: Record<Exclude<TaskActionType, 'water'>, ActionBucket> = {
      prune: { plants: [] },
      trim: { plants: [] },
      fertilize: { plants: [] },
    };

    for (const plant of activePlants) {
      if (plant.pruningMonths.includes(monthNum)) {
        buckets.prune.plants.push(plant);
      }
      if (plant.trimmingMonths.includes(monthNum)) {
        buckets.trim.plants.push(plant);
      }
      if (plant.fertilizingMonths.includes(monthNum)) {
        buckets.fertilize.plants.push(plant);
      }
    }

    for (const action of ['prune', 'trim', 'fertilize'] as const) {
      const bucketPlants = buckets[action].plants;
      if (!bucketPlants.length) continue;

      let targetDate = findNthSaturdayOfMonth(ym.year, ym.month, monthlyActionNthSaturday[action]);
      if (
        !includePreviousMonth &&
        ym.year === start.year &&
        ym.month === start.month &&
        Temporal.PlainDate.compare(targetDate, start) < 0
      ) {
        const daysToNextSaturday = (6 - start.dayOfWeek + 7) % 7;
        const candidate = start.add({ days: daysToNextSaturday });
        if (candidate.month === start.month) {
          targetDate = candidate;
        }
      }

      if (
        Temporal.PlainDate.compare(targetDate, monthlyStart) >= 0 &&
        Temporal.PlainDate.compare(targetDate, end) <= 0
      ) {
        tasks.push(buildActionTask(action, targetDate, bucketPlants, existingByTaskId));
      }
    }
  }

  return tasks.sort((a, b) => {
    const cmp = a.date.localeCompare(b.date);
    if (cmp !== 0) return cmp;
    return a.action.localeCompare(b.action);
  });
}
