const MAX_BYTES          = 20 * 1024 * 1024;
const COMPRESS_THRESHOLD = 0.5 * 1024 * 1024;
// Target ~1.5 MB: well under Vercel's 4.5 MB function payload limit and Anthropic's 5 MB base64 limit.
// WhatsApp compresses iPhone 12 receipts to ~290 KB at 1600px — Claude reads them fine at that size.
const UPLOAD_SIZE_LIMIT  = 1.5 * 1024 * 1024;
const MAX_DIMENSION      = 1600;

const isDev = process.env.NODE_ENV === 'development';

export async function preprocessImage(file: File): Promise<File> {
  if (isDev) console.log(`[preprocess] entry: name=${file.name} type=${file.type} size=${(file.size/1024).toFixed(0)}KB`);

  if (!file.type.startsWith('image/')) {
    throw new Error('File must be an image (JPEG, PNG, WebP, HEIC, etc.).');
  }
  if (file.size > MAX_BYTES) {
    throw new Error(
      `File is ${(file.size / 1024 / 1024).toFixed(1)} MB. Maximum allowed size is 20 MB.`
    );
  }
  if (file.size <= COMPRESS_THRESHOLD) {
    if (isDev) console.log(`[preprocess] SKIPPED compression (under ${(COMPRESS_THRESHOLD/1024).toFixed(0)}KB threshold) — uploading raw with EXIF intact`);
    return file;
  }
  return compressToJpeg(file);
}

async function compressToJpeg(file: File): Promise<File> {
  // createImageBitmap with imageOrientation: 'from-image' decodes the image with EXIF
  // rotation pre-applied. bitmap.width/height reflect the correctly-oriented dimensions.
  // This avoids the headaches of manually reading EXIF and applying canvas transforms.
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });

  if (isDev) {
    if (isDev) console.log(`[preprocess] file=${file.name} ${file.type} ${(file.size/1024).toFixed(0)}KB → bitmap=${bitmap.width}x${bitmap.height}`);
  }

  const name = file.name.replace(/\.[^.]+$/, '.jpg');
  const qualitySteps = [0.82, 0.72, 0.60, 0.50, 0.40, 0.30];
  let maxDim = MAX_DIMENSION;

  try {
    while (true) {
      const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
      const w = Math.round(bitmap.width * scale);
      const h = Math.round(bitmap.height * scale);

      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(bitmap, 0, 0, w, h);

      for (let qIdx = 0; qIdx < qualitySteps.length; qIdx++) {
        const quality = qualitySteps[qIdx];
        const blob = await canvasToBlob(canvas, 'image/jpeg', quality);
        if (!blob) throw new Error('Image compression failed.');

        if (blob.size <= UPLOAD_SIZE_LIMIT) {
          if (isDev) console.log(`[preprocess] accepted ${w}x${h}@q${quality} → ${(blob.size/1024).toFixed(0)}KB`);
          return new File([blob], name, { type: 'image/jpeg' });
        }

        // Last quality step at min dimension — best effort
        if (qIdx === qualitySteps.length - 1 && maxDim <= 512) {
          if (isDev) console.warn(`[preprocess] best-effort ${w}x${h}@q${quality} → ${(blob.size/1024).toFixed(0)}KB`);
          return new File([blob], name, { type: 'image/jpeg' });
        }
      }

      if (maxDim <= 512) {
        throw new Error('Could not compress image to acceptable size.');
      }
      maxDim = Math.round(maxDim / 2);
    }
  } finally {
    bitmap.close();
  }
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise(resolve => canvas.toBlob(resolve, type, quality));
}
