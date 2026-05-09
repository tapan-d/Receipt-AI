import { describe, it, expect, beforeEach, vi } from 'vitest';
import { checkRateLimit } from '../rateLimit';
import type { RateLimitConfig } from '../rateLimit';

// Small config for fast tests: burst 3, refill 1 token per 1000ms
const TEST_LIMIT: RateLimitConfig = {
  maxTokens: 3,
  refillRate: 1 / 1000,
  tokensPerRequest: 1,
};

beforeEach(() => {
  // Each test uses a unique key so buckets don't bleed between tests
});

describe('checkRateLimit', () => {
  it('allows first N requests up to burst capacity', () => {
    const key = 'test-allow-burst';
    expect(checkRateLimit(key, TEST_LIMIT).allowed).toBe(true);
    expect(checkRateLimit(key, TEST_LIMIT).allowed).toBe(true);
    expect(checkRateLimit(key, TEST_LIMIT).allowed).toBe(true);
  });

  it('blocks request exceeding burst capacity', () => {
    const key = 'test-block-after-burst';
    checkRateLimit(key, TEST_LIMIT);
    checkRateLimit(key, TEST_LIMIT);
    checkRateLimit(key, TEST_LIMIT);
    const result = checkRateLimit(key, TEST_LIMIT);
    expect(result.allowed).toBe(false);
  });

  it('returns retryAfterMs > 0 when blocked', () => {
    const key = 'test-retry-after';
    checkRateLimit(key, TEST_LIMIT);
    checkRateLimit(key, TEST_LIMIT);
    checkRateLimit(key, TEST_LIMIT);
    const result = checkRateLimit(key, TEST_LIMIT);
    expect(result.allowed).toBe(false);
    if (!result.allowed) expect(result.retryAfterMs).toBeGreaterThan(0);
  });

  it('refills tokens after time passes', () => {
    const key = 'test-refill';
    vi.useFakeTimers();

    // Drain the bucket
    checkRateLimit(key, TEST_LIMIT);
    checkRateLimit(key, TEST_LIMIT);
    checkRateLimit(key, TEST_LIMIT);
    expect(checkRateLimit(key, TEST_LIMIT).allowed).toBe(false);

    // Advance 1500ms — should refill 1.5 tokens, enough for 1 request
    vi.advanceTimersByTime(1500);
    expect(checkRateLimit(key, TEST_LIMIT).allowed).toBe(true);

    vi.useRealTimers();
  });

  it('different keys have independent buckets', () => {
    checkRateLimit('key-a', TEST_LIMIT);
    checkRateLimit('key-a', TEST_LIMIT);
    checkRateLimit('key-a', TEST_LIMIT);
    expect(checkRateLimit('key-a', TEST_LIMIT).allowed).toBe(false);

    // key-b is untouched, should still have full burst
    expect(checkRateLimit('key-b', TEST_LIMIT).allowed).toBe(true);
  });

  it('does not exceed maxTokens when idle for a long time', () => {
    const key = 'test-max-cap';
    vi.useFakeTimers();

    // First request initializes bucket at maxTokens
    checkRateLimit(key, TEST_LIMIT);

    // Advance a very long time — tokens should cap at maxTokens (3)
    vi.advanceTimersByTime(1_000_000);

    // Should still only allow maxTokens requests before blocking
    expect(checkRateLimit(key, TEST_LIMIT).allowed).toBe(true);
    expect(checkRateLimit(key, TEST_LIMIT).allowed).toBe(true);
    expect(checkRateLimit(key, TEST_LIMIT).allowed).toBe(true);
    expect(checkRateLimit(key, TEST_LIMIT).allowed).toBe(false);

    vi.useRealTimers();
  });
});
