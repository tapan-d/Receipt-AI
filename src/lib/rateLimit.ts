interface Bucket {
  tokens: number;
  lastRefill: number;
}

const buckets = new Map<string, Bucket>();

export interface RateLimitConfig {
  maxTokens: number;
  refillRate: number;     // tokens per ms
  tokensPerRequest: number;
}

export type RateLimitResult =
  | { allowed: true }
  | { allowed: false; retryAfterMs: number };

export function checkRateLimit(key: string, cfg: RateLimitConfig): RateLimitResult {
  const now = Date.now();
  const existing = buckets.get(key);
  const b: Bucket = existing ?? { tokens: cfg.maxTokens, lastRefill: now };

  b.tokens = Math.min(cfg.maxTokens, b.tokens + (now - b.lastRefill) * cfg.refillRate);
  b.lastRefill = now;
  buckets.set(key, b);

  if (b.tokens < cfg.tokensPerRequest) {
    const retryAfterMs = Math.ceil((cfg.tokensPerRequest - b.tokens) / cfg.refillRate);
    return { allowed: false, retryAfterMs };
  }

  b.tokens -= cfg.tokensPerRequest;
  return { allowed: true };
}

// 10 requests per minute per user (burst up to 10, refills 1 token/6s)
export const QUERY_LIMIT: RateLimitConfig = {
  maxTokens: 10,
  refillRate: 1 / 6000,
  tokensPerRequest: 1,
};

// 20 uploads per day per user (burst up to 5, refills 1 token/72min)
export const UPLOAD_LIMIT: RateLimitConfig = {
  maxTokens: 5,
  refillRate: 1 / 4_320_000,
  tokensPerRequest: 1,
};
