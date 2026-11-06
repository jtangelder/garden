import { describe, expect, it } from 'vitest';
import {
  applyCareScheduleToPlant,
  formatMonthsCell,
  formatMonthsFull,
  parseMonthsCell,
  parseSheetRows,
  SHEET_HEADERS,
  serializePlantRow,
} from './sheet_parser';

describe('sheet_parser', () => {
  it('parses month strings from Dutch/English names, numbers, and ranges', () => {
    expect(parseMonthsCell('Mrt, Aug, Sep')).toEqual([3, 8, 9]);
    expect(parseMonthsCell('Mei, Okt')).toEqual([5, 10]);
    expect(parseMonthsCell('2-4, 11')).toEqual([2, 3, 4, 11]);
    expect(parseMonthsCell('Nov-Feb')).toEqual([1, 2, 11, 12]);
    expect(parseMonthsCell('Geen')).toEqual([]);
    expect(parseMonthsCell('')).toEqual([]);
  });

  it('formats month numbers into Dutch short and full strings', () => {
    expect(formatMonthsCell([8, 3, 3])).toBe('Mrt, Aug');
    expect(formatMonthsCell([])).toBe('Geen');
    expect(formatMonthsFull([3, 5])).toBe('Maart, Mei');
    expect(formatMonthsFull([])).toBe('Geen');
  });

  it('parses sheet rows and detects plants needing enrichment', () => {
    const rows = [
      SHEET_HEADERS,
      [
        'Engelse Lavendel',
        'Lavandula angustifolia',
        'Terras',
        '7',
        '0',
        'Apr, Aug',
        'Jul, Aug',
        'Apr',
        'Knip licht terug na de bloei.',
        '2026-11-05',
      ],
      ['Olijfboom', '', 'Terraspot'],
    ];

    const records = parseSheetRows(rows);
    expect(records).toHaveLength(2);
    expect(records[0].name).toBe('Engelse Lavendel');
    expect(records[0].needsEnrichment).toBe(false);
    expect(records[0].pruningMonths).toEqual([4, 8]);

    expect(records[1].name).toBe('Olijfboom');
    expect(records[1].rowNumber).toBe(3);
    expect(records[1].needsEnrichment).toBe(true);
  });

  it('applies care schedule and serializes plant row in Dutch', () => {
    const [unenriched] = parseSheetRows([['Olijfboom', '', 'Terraspot']]);
    const enriched = applyCareScheduleToPlant(
      unenriched,
      {
        species: 'Olea europaea',
        wateringDaysSummer: 7,
        wateringDaysWinter: 21,
        pruningMonths: [3, 4],
        trimmingMonths: [7],
        fertilizingMonths: [4, 6],
        careNotes: 'Snoei in het voorjaar.',
      },
      '2026-11-05',
    );

    expect(enriched.needsEnrichment).toBe(false);
    expect(serializePlantRow(enriched)).toEqual([
      'Olijfboom',
      'Olea europaea',
      'Terraspot',
      '7',
      '21',
      'Mrt, Apr',
      'Jul',
      'Apr, Jun',
      'Snoei in het voorjaar.',
      '2026-11-05',
      '',
    ]);
  });

  it('parses and serializes plant photo data URLs and IMAGE formulas in column K', () => {
    const rows = [
      SHEET_HEADERS,
      [
        'Lavendel',
        'Lavandula',
        'Terras',
        '7',
        '0',
        'Apr',
        'Aug',
        'Apr',
        'Zonnig.',
        '2026-11-05',
        'data:image/jpeg;base64,/9j/4AAQ',
      ],
      ['Klimroos', 'Rosa', 'Pergola', '4', '0', 'Mrt', 'Jul', 'Apr', 'Klimplant.', '2026-11-05', '=IMAGE("https://example.com/rose.jpg")'],
    ];
    const parsed = parseSheetRows(rows);
    expect(parsed[0].photoUrl).toBe('data:image/jpeg;base64,/9j/4AAQ');
    expect(parsed[1].photoUrl).toBe('https://example.com/rose.jpg');
    expect(serializePlantRow(parsed[0])[10]).toBe('data:image/jpeg;base64,/9j/4AAQ');
  });
});
