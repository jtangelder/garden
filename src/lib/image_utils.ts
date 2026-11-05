export interface EncodedPlantImage {
  fileName: string;
  mimeType: string;
  base64Data: string;
  dataUrl: string;
}

export function extractBase64FromDataUrl(dataUrl: string): {
  mimeType: string;
  base64Data: string;
} {
  const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
  if (!match) {
    throw new Error('Ongeldig afbeeldingsformaat.');
  }
  return {
    mimeType: match[1],
    base64Data: match[2],
  };
}

export function inferPlantHintFromFileName(fileName: string): string {
  const withoutExt = fileName.replace(/\.[^.]+$/, '');
  const cleaned = withoutExt
    .replace(/^(img|dsc|pxl|photo|foto|image|pic)[_-]?\d*/i, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\d+\b/g, '')
    .trim();
  return cleaned;
}

export async function compressAndEncodeImageFile(
  file: File,
  maxDimension = 1024,
  quality = 0.82,
): Promise<EncodedPlantImage> {
  const rawDataUrl = await readFileAsDataUrl(file);

  if (typeof document === 'undefined' || typeof Image === 'undefined') {
    const { mimeType, base64Data } = extractBase64FromDataUrl(rawDataUrl);
    return {
      fileName: file.name,
      mimeType,
      base64Data,
      dataUrl: rawDataUrl,
    };
  }

  try {
    const img = await loadImageElement(rawDataUrl);
    const { width, height } = computeTargetDimensions(img.width, img.height, maxDimension);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      const { mimeType, base64Data } = extractBase64FromDataUrl(rawDataUrl);
      return { fileName: file.name, mimeType, base64Data, dataUrl: rawDataUrl };
    }

    ctx.drawImage(img, 0, 0, width, height);
    const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
    const { mimeType, base64Data } = extractBase64FromDataUrl(compressedDataUrl);
    return {
      fileName: file.name,
      mimeType,
      base64Data,
      dataUrl: compressedDataUrl,
    };
  } catch {
    const { mimeType, base64Data } = extractBase64FromDataUrl(rawDataUrl);
    return {
      fileName: file.name,
      mimeType,
      base64Data,
      dataUrl: rawDataUrl,
    };
  }
}

export function computeTargetDimensions(
  width: number,
  height: number,
  maxDimension: number,
): { width: number; height: number } {
  if (width <= 0 || height <= 0) {
    return { width: maxDimension, height: maxDimension };
  }
  if (width <= maxDimension && height <= maxDimension) {
    return { width, height };
  }
  if (width >= height) {
    return {
      width: maxDimension,
      height: Math.max(1, Math.round((height * maxDimension) / width)),
    };
  }
  return {
    width: Math.max(1, Math.round((width * maxDimension) / height)),
    height: maxDimension,
  };
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Kon bestand niet lezen.'));
      }
    };
    reader.onerror = () => reject(new Error('Fout bij het lezen van de foto.'));
    reader.readAsDataURL(file);
  });
}

function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Kon afbeelding niet laden.'));
    img.src = src;
  });
}
