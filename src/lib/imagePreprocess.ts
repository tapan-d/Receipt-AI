const MAX_BYTES       = 20 * 1024 * 1024; // 20 MB hard reject
const COMPRESS_THRESHOLD = 1.5 * 1024 * 1024; // compress above 1.5 MB
const MAX_DIMENSION   = 2048;
const JPEG_QUALITY    = 0.85;

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
      const scale = Math.min(1, MAX_DIMENSION / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width  = Math.round(img.width  * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        blob => {
          if (!blob) return reject(new Error('Image compression failed.'));
          const name = file.name.replace(/\.[^.]+$/, '.jpg');
          resolve(new File([blob], name, { type: 'image/jpeg' }));
        },
        'image/jpeg',
        JPEG_QUALITY
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not read image.')); };
    img.src = url;
  });
}
