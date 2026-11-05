import { describe, expect, it } from 'vitest';
import {
  computeTargetDimensions,
  extractBase64FromDataUrl,
  inferPlantHintFromFileName,
} from './image_utils';

describe('image_utils', () => {
  it('extracts mimeType and base64 payload from data URL', () => {
    const res = extractBase64FromDataUrl('data:image/jpeg;base64,aGVsbG8=');
    expect(res).toEqual({
      mimeType: 'image/jpeg',
      base64Data: 'aGVsbG8=',
    });
  });

  it('computes scaled dimensions preserving aspect ratio', () => {
    expect(computeTargetDimensions(4000, 3000, 1024)).toEqual({ width: 1024, height: 768 });
    expect(computeTargetDimensions(1500, 3000, 1024)).toEqual({ width: 512, height: 1024 });
    expect(computeTargetDimensions(800, 600, 1024)).toEqual({ width: 800, height: 600 });
  });

  it('infers plant hint from camera or named filenames', () => {
    expect(inferPlantHintFromFileName('IMG_2049.JPG')).toBe('');
    expect(inferPlantHintFromFileName('japanse_esdoorn_01.jpg')).toBe('japanse esdoorn');
  });
});
