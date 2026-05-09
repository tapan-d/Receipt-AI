import { describe, it, expect } from 'vitest';
import { detectMimeFromBuffer } from '../mimeDetect';

function makeBuffer(bytes: number[]): Buffer {
  return Buffer.from(bytes);
}

describe('detectMimeFromBuffer', () => {
  it('detects JPEG', () => {
    const buf = makeBuffer([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10]);
    expect(detectMimeFromBuffer(buf)).toBe('image/jpeg');
  });

  it('detects PNG', () => {
    const buf = makeBuffer([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00]);
    expect(detectMimeFromBuffer(buf)).toBe('image/png');
  });

  it('detects GIF', () => {
    const buf = makeBuffer([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]); // GIF89a
    expect(detectMimeFromBuffer(buf)).toBe('image/gif');
  });

  it('detects WebP', () => {
    // RIFF....WEBP
    const header = [0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50];
    const buf = makeBuffer(header);
    expect(detectMimeFromBuffer(buf)).toBe('image/webp');
  });

  it('rejects RIFF without WEBP marker', () => {
    // RIFF header but WAVE instead of WEBP (audio file)
    const header = [0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x41, 0x56, 0x45];
    const buf = makeBuffer(header);
    expect(detectMimeFromBuffer(buf)).toBeNull();
  });

  it('returns null for plain text', () => {
    const buf = Buffer.from('hello world');
    expect(detectMimeFromBuffer(buf)).toBeNull();
  });

  it('returns null for PDF (not an accepted image type)', () => {
    const buf = makeBuffer([0x25, 0x50, 0x44, 0x46]); // %PDF
    expect(detectMimeFromBuffer(buf)).toBeNull();
  });

  it('returns null for empty buffer', () => {
    expect(detectMimeFromBuffer(Buffer.alloc(0))).toBeNull();
  });

  it('returns null for buffer too short to match any signature', () => {
    expect(detectMimeFromBuffer(makeBuffer([0xFF, 0xD8]))).toBeNull();
  });
});
