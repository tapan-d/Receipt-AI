const MAX_BYTES           = 20 * 1024 * 1024;
const COMPRESS_THRESHOLD  = 1.5 * 1024 * 1024;
// Anthropic base64 limit is 5 MB; base64 adds ~33%, so raw must stay under ~3.75 MB
const ANTHROPIC_RAW_LIMIT = 3.75 * 1024 * 1024;
const MAX_DIMENSION       = 2048;

export async function preprocessImage(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) {
    throw new Error('File must be an image (JPEG, PNG, WebP, HEIC, etc.).');
  }
  if (file.size > MAX_BYTES) {
    throw new Error(
      `File is ${(file.size / 1024 / 1024).toFixed(1)} MB. Maximum allowed size is 20 MB.`
    );
  }
  if (file.size <= COMPRESS_THRESHOLD) return file;
  return compressToJpeg(file);
}

function compressToJpeg(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);

      const name = file.name.replace(/\.[^.]+$/, '.jpg');
      // Each pass: try qualities in order; if all fail, halve dimensions and retry
      const qualitySteps = [0.85, 0.75, 0.65, 0.60, 0.50, 0.40];
      let maxDim = MAX_DIMENSION;

      const tryWithDimension = () => {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width  = Math.round(img.width  * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);

        let qIdx = 0;
        const tryQuality = () => {
          canvas.toBlob(
            blob => {
              if (!blob) return reject(new Error('Image compression failed.'));
              if (blob.size <= ANTHROPIC_RAW_LIMIT) {
                resolve(new File([blob], name, { type: 'image/jpeg' }));
              } else if (qIdx < qualitySteps.length - 1) {
                qIdx++;
                tryQuality();
              } else if (maxDim > 512) {
                // All qualities exhausted — halve dimensions and retry
                maxDim = Math.round(maxDim / 2);
                tryWithDimension();
              } else {
                // Best effort: resolve with smallest we could produce
                resolve(new File([blob], name, { type: 'image/jpeg' }));
              }
            },
            'image/jpeg',
            qualitySteps[qIdx]
          );
        };
        tryQuality();
      };

      tryWithDimension();
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not read image.')); };
    img.src = url;
  });
}
