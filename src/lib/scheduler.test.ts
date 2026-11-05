import { describe, expect, it } from 'vitest';
import { addOneDayIso, generateGardenSchedule, groupTasksByMonth, isWarmSeason } from './scheduler';
import { type PlantRecord } from './models';

describe('scheduler', () => {
  const samplePlants: PlantRecord[] = [
    {
      rowNumber: 2,
      name: 'Japanse Esdoorn',
      species: 'Acer palmatum',
      location: 'Patiotuin',
      wateringDaysSummer: 5,
      wateringDaysWinter: 0,
      pruningMonths: [11],
      trimmingMonths: [6],
      fertilizingMonths: [4],
      careNotes: 'Snoei in november tijdens winterrust.',
      lastEnriched: '2026-11-01',
      needsEnrichment: false,
    },
    {
      rowNumber: 3,
      name: "Hortensia 'Annabelle'",
      species: 'Hydrangea arborescens',
      location: 'Voortuin',
      wateringDaysSummer: 3,
      wateringDaysWinter: 14,
      pruningMonths: [3],
      trimmingMonths: [11],
      fertilizingMonths: [11],
      careNotes: 'Houd de grond vochtig.',
      lastEnriched: '2026-11-01',
      needsEnrichment: false,
    },
  ];

  it('identifies warm vs cool season accurately', () => {
    expect(isWarmSeason(3)).toBe(false);
    expect(isWarmSeason(4)).toBe(true);
    expect(isWarmSeason(9)).toBe(true);
    expect(isWarmSeason(10)).toBe(false);
  });

  it('adds one day using location-agnostic Temporal.PlainDate', () => {
    expect(addOneDayIso('2026-11-30')).toBe('2026-12-01');
    expect(addOneDayIso('2028-02-28')).toBe('2028-02-29');
  });

  it('generates Dutch watering, pruning, trimming, and fertilizing tasks and reconciles sync status', () => {
    const tasks = generateGardenSchedule(samplePlants, '2026-11-05', 30, [
      {
        id: 'cal-ev-1',
        summary: "🌿 Water geven: Hortensia 'Annabelle'",
        description:
          "Tuinonderhoud: Water geven (November 2026)\n\nPlanten:\n• Hortensia 'Annabelle' [Voortuin] — Houd de grond vochtig.",
        startDate: '2026-11-05',
        endDate: '2026-11-06',
        gardenTaskId: 'garden-water-2026-11-05',
      },
      {
        id: 'cal-ev-2',
        summary: 'Verouderde titel',
        description: 'Verouderd',
        startDate: '2026-11-07',
        endDate: '2026-11-08',
        gardenTaskId: 'garden-prune-2026-11-07',
      },
    ]);

    const firstWater = tasks.find(t => t.id === 'garden-water-2026-11-05');
    expect(firstWater).toBeDefined();
    expect(firstWater?.syncStatus).toBe('synced');

    const novPrune = tasks.find(t => t.action === 'prune');
    expect(novPrune).toBeDefined();
    expect(novPrune?.date).toBe('2026-11-07');
    expect(novPrune?.plantNames).toEqual(['Japanse Esdoorn']);
    expect(novPrune?.syncStatus).toBe('update');
    expect(novPrune?.existingEventId).toBe('cal-ev-2');

    const novTrim = tasks.find(t => t.action === 'trim');
    expect(novTrim?.date).toBe('2026-11-14');
    expect(novTrim?.syncStatus).toBe('new');
  });

  it('includes past month catch-up tasks and groups schedule by month', () => {
    const plantsWithOctober: PlantRecord[] = [
      ...samplePlants,
      {
        rowNumber: 4,
        name: 'Buxushaag',
        species: 'Buxus sempervirens',
        location: 'Oprit',
        wateringDaysSummer: 7,
        wateringDaysWinter: 0,
        pruningMonths: [],
        trimmingMonths: [],
        fertilizingMonths: [10],
        careNotes: 'Najaarsmest in oktober.',
        lastEnriched: '2026-11-01',
        needsEnrichment: false,
      },
    ];

    const tasks = generateGardenSchedule(plantsWithOctober, '2026-11-05', 30, [], true);
    const groups = groupTasksByMonth(tasks, '2026-11-05', true);

    expect(groups[0]?.yearMonth).toBe('2026-10');
    expect(groups[0]?.isPastMonth).toBe(true);
    expect(groups[0]?.label).toBe('Oktober 2026');
    expect(groups[0]?.tasks.some(t => t.action === 'fertilize' && t.plantNames.includes('Buxushaag'))).toBe(true);

    expect(groups[1]?.yearMonth).toBe('2026-11');
    expect(groups[1]?.isCurrentMonth).toBe(true);
  });
});
