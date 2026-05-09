const MAGIC_SIGS: Array<{ mime: string; bytes: number[] }> = [
  { mime: 'image/jpeg', bytes: [0xFF, 0xD8, 0xFF] },
  { mime: 'image/png',  bytes: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A] },
  { mime: 'image/webp', bytes: [0x52, 0x49, 0x46, 0x46] },
  { mime: 'image/gif',  bytes: [0x47, 0x49, 0x46, 0x38] },
];

export function detectMimeFromBuffer(buf: Buffer): string | null {
  for (const sig of MAGIC_SIGS) {
    if (sig.bytes.every((b, i) => buf[i] === b)) {
      if (sig.mime === 'image/webp' && buf.subarray(8, 12).toString('ascii') !== 'WEBP') continue;
      return sig.mime;
    }
  }
  return null;
}
