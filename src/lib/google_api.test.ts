import { describe, expect, it, vi } from 'vitest';
import {
  enrichPlantsCareSchedules,
  identifyPlantFromImage,
  syncTasksToGoogleCalendar,
} from './google_api';
import { type GardenTask, type PlantRecord } from './models';

describe('google_api', () => {
  it('falls back to built-in database when no Gemini key or token is provided', async () => {
    const plants: PlantRecord[] = [
      {
        rowNumber: 2,
        name: 'Olive Tree',
        species: '',
        location: 'Patio',
        wateringDaysSummer: null,
        wateringDaysWinter: null,
        pruningMonths: [],
        trimmingMonths: [],
        fertilizingMonths: [],
        careNotes: '',
        lastEnriched: '',
        needsEnrichment: true,
      },
    ];

    const map = await enrichPlantsCareSchedules(plants, {});
    const item = map.get(2);
    expect(item?.source).toBe('builtin');
    expect(item?.schedule.species).toBe('Olea europaea');
  });

  it('syncs new and updated tasks to Google Calendar', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async () => new Response(JSON.stringify({ id: 'ev-123' }), { status: 200 }));

    const tasks: GardenTask[] = [
      {
        id: 'garden-water-2026-11-05',
        date: '2026-11-05',
        action: 'water',
        title: 'Water plants',
        description: 'Desc',
        plantNames: ['Rose'],
        locations: ['Border'],
        syncStatus: 'new',
      },
      {
        id: 'garden-prune-2026-11-07',
        date: '2026-11-07',
        action: 'prune',
        title: 'Prune plants',
        description: 'Desc',
        plantNames: ['Rose'],
        locations: ['Border'],
        syncStatus: 'update',
        existingEventId: 'existing-99',
      },
      {
        id: 'garden-trim-2026-11-14',
        date: '2026-11-14',
        action: 'trim',
        title: 'Trim plants',
        description: 'Desc',
        plantNames: ['Rose'],
        locations: ['Border'],
        syncStatus: 'synced',
      },
    ];

    const summary = await syncTasksToGoogleCalendar('token-xyz', 'primary', tasks);
    expect(summary).toEqual({ created: 1, updated: 1, unchanged: 1 });
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    fetchSpy.mockRestore();
  });

  it('identifies a plant from a photo using Gemini multimodal JSON response', async () => {
    const geminiResponse = {
      candidates: [
        {
          content: {
            parts: [
              {
                text: JSON.stringify({
                  name: 'Japanse Esdoorn',
                  species: 'Acer palmatum',
                  confidence: 'hoog',
                  wateringDaysSummer: 5,
                  wateringDaysWinter: 0,
                  pruningMonths: [11, 12],
                  trimmingMonths: [6],
                  fertilizingMonths: [4],
                  careNotes: 'Alleen snoeien in de winterrust.',
                }),
              },
            ],
          },
        },
      ],
    };

    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async () => new Response(JSON.stringify(geminiResponse), { status: 200 }));

    const result = await identifyPlantFromImage(
      {
        fileName: 'IMG_1001.jpg',
        mimeType: 'image/jpeg',
        base64Data: 'ZmFrZQ==',
        dataUrl: 'data:image/jpeg;base64,ZmFrZQ==',
      },
      { geminiApiKey: 'AIzaTestKey' },
    );

    expect(result.name).toBe('Japanse Esdoorn');
    expect(result.confidence).toBe('hoog');
    expect(result.source).toBe('gemini');
    expect(result.schedule.species).toBe('Acer palmatum');
    expect(result.schedule.pruningMonths).toEqual([11, 12]);
    fetchSpy.mockRestore();
  });
});
