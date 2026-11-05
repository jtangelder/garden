import { describe, expect, it } from 'vitest';
import { lookupBuiltInCareSchedule } from './plant_database';

describe('plant_database', () => {
  it('matches known plants by keyword', () => {
    const hydrangea = lookupBuiltInCareSchedule("Hydrangea 'Annabelle'");
    expect(hydrangea.pruningMonths).toContain(3);
    expect(hydrangea.wateringDaysSummer).toBe(3);

    const wisteria = lookupBuiltInCareSchedule('Chinese Wisteria');
    expect(wisteria.pruningMonths).toEqual([2, 8]);
  });

  it('uses category heuristics for hedges, trees, herbs, and unknown perennials', () => {
    const hedge = lookupBuiltInCareSchedule('Yew Hedge');
    expect(hedge.trimmingMonths).toEqual([6, 9]);

    const tree = lookupBuiltInCareSchedule('Silver Birch Tree');
    expect(tree.pruningMonths).toEqual([2, 11]);

    const herb = lookupBuiltInCareSchedule('Sweet Basil Herb');
    expect(herb.wateringDaysSummer).toBe(3);

    const generic = lookupBuiltInCareSchedule('Mystery cultivar');
    expect(generic.wateringDaysSummer).toBeGreaterThan(0);
    expect(generic.pruningMonths.length).toBeGreaterThan(0);
  });
});
