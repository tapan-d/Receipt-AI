# Scaling & Architecture Review

> Reviewed: 2026-05-12
> Reviewer: Claude Code (claude-sonnet-4-6)
> Codebase state: post-commit da17bac

**Linear:** https://linear.app/ledger-ai/document/scaling-and-architecture-review-b9cc0f4bbfca

**Note:** Issues #3, #4 (O(n) dup check) were fixed in commits 650d84e, 1da9b7b, 58a2eac (2026-05-15). Check status before actioning others.

---

## Priority Fix Order

```
1.  DB indexes (user_id + pgvector HNSW)       — query latency 100×+ at scale
2.  Paginate list endpoints                     — OOM risk today
3.  Fix duplicate check to targeted SQL         — O(n) → O(1)          ✓ FIXED
4.  Batch item inserts + wrap in transaction    — data integrity + perf
5.  Replace in-memory rate limiter              — useless on serverless
6.  Add sharp to package.json                  — prod deploy will break
7.  Async upload pipeline (job queue)           — timeout risk + UX
8.  Add user table with UUID                    — identity foundation   ✓ IN PROGRESS (ADR 001)
9.  Switch query model Opus → Sonnet/Haiku      — 5–10× cost reduction
10. Add error monitoring (Sentry)               — operational visibility
```

---

## P0 — Will Break Under Load

### 1. No database indexes ✓ DONE (2026-05-16)

Added to `ensureSchema()` in `src/lib/db.ts`: `idx_receipts_user_id`, `idx_receipts_user_date`, `idx_receipt_items_user_id`, `idx_receipt_items_receipt_id`, `idx_receipt_items_vector` (HNSW).

**File:** `src/lib/db.ts:14–47`

Both tables have zero indexes beyond primary key. Every query does a full sequential scan.

| Missing index | Query affected | Impact |
|---|---|---|
| `receipts(user_id)` | `getAllReceipts`, `getReceiptById`, dup check | Full table scan per user request |
| `receipts(user_id, purchase_date DESC)` | list sorted by date | Sort without index |
| `receipt_items(user_id)` | `getAllItems`, `searchItemsByVector` | Full table scan |
| `receipt_items(receipt_id)` | `getItemsByReceiptId` | Full table scan |
| `receipt_items USING hnsw (vector vector_cosine_ops)` | `searchItemsByVector` | **Exact cosine scan O(n) per query** |

At 10k users × 500 receipts × 20 items = 100M item rows — every semantic search scans all 100M vectors.

**Fix:**

```sql
CREATE INDEX ON receipts(user_id);
CREATE INDEX ON receipts(user_id, purchase_date DESC);
CREATE INDEX ON receipt_items(user_id);
CREATE INDEX ON receipt_items(receipt_id);
CREATE INDEX ON receipt_items USING hnsw (vector vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
```

The HNSW index is the most critical. Without it, pgvector performs an exact nearest-neighbor scan over every row for every query. With HNSW, search is O(log n).

---

### 2. In-memory rate limiting

**File:** `src/lib/rateLimit.ts:6`

```ts
const buckets = new Map<string, Bucket>();
```

State lives in process memory. On Vercel/serverless:
- Multiple concurrent function instances each have their own empty Map
- Cold starts reset all state
- A user can hit 20 concurrent instances → 20 × 5 burst tokens = 100 free uploads in one second
- Rate limits are **entirely bypassed** in production

**Fix:** Replace with Redis-backed token bucket (Upstash Redis or Vercel KV).

```ts
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const uploadLimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.tokenBucket(5, '72 m', 5),
});
```

---

### 3. No pagination on list endpoints ✓ CHECK STATUS

**Files:** `src/lib/db.ts:129–136`, `src/lib/db.ts:158–167`

Both `getAllReceipts()` and `getAllItems()` are unbounded `SELECT *`. User with 1000 receipts × avg 15 items = 15,000 rows serialized to JSON on every page load.

**Fix:**

```sql
SELECT * FROM receipts WHERE user_id = $1
ORDER BY purchase_date DESC, created_at DESC
LIMIT 50 OFFSET $2
```

---

### 4. Duplicate detection is O(n) ✓ FIXED (commit 650d84e)

**File:** `src/app/api/receipts/upload/route.ts`

Previously loaded all receipts into memory. Now uses targeted SQL + pg_trgm similarity.

---

### 5. Serial item inserts — N round-trips

**File:** `src/lib/db.ts:101–126`

One DB round-trip per item. No transaction — crash after item 15 of 30 = orphaned receipt with half its items.

**Fix — batch insert + transaction:**

```ts
await sql`BEGIN`;
try {
  await sql`INSERT INTO receipts ...`;
  await sql`INSERT INTO receipt_items ... (batch)`;
  await sql`COMMIT`;
} catch (e) {
  await sql`ROLLBACK`;
  throw e;
}
```

---

## P1 — Significant Performance & Reliability Issues

### 6. Fully synchronous upload pipeline — timeout risk

**File:** `src/app/api/receipts/upload/route.ts`

| Step | Typical latency |
|------|----------------|
| Sharp compress | 100–500ms |
| Claude Vision extract | 3–8s (can spike to 30s) |
| DB: dup check | 50–500ms |
| R2 upload | 200–800ms |
| Voyage AI embed | 300–1000ms |
| DB: insert receipt + N items (serial) | N × 20ms |

**Total: 5–12s minimum, can reach 20–30s+ during API slowdowns.**

**Fix:** Decouple with background job queue. Return `202 Accepted` immediately with a job ID.

Options: Inngest, Trigger.dev, QStash (Upstash)

```
POST /api/receipts/upload
  → validate image
  → enqueue job(image, userId)
  → return 202 { jobId }

Background job:
  → compress → extract → embed → save → notify user
```

---

### 7. N+1 query in `getReceiptsByIds`

**File:** `src/lib/db.ts:188–192`

100 items from vector search → up to 100 separate `SELECT` queries.

**Fix:**

```sql
SELECT * FROM receipts
WHERE id = ANY($1::text[]) AND user_id = $2
```

---

### 8. Schema init DDL on every cold start

**File:** `src/lib/db.ts:11–65`

`ensureSchema()` runs on every new process instance — DDL locks + ~100–500ms latency per cold start.

**Fix:** Proper database migrations (Drizzle ORM or raw migration scripts). Run once at deploy time, not runtime.

---

### 9. Opus 4.7 for semantic queries

**File:** `src/app/api/query/route.ts`

Opus is 6–10× more expensive and 2× slower than Sonnet for structured Q&A over pre-filtered JSON context.

**Fix:** Switch to `claude-haiku-4-5-20251001` or `claude-sonnet-4-6`. Estimated savings at 1000 queries/day: **$15–80/day**.

---

### 10. No transactions

**File:** `src/lib/db.ts:72–127`

Receipt insert and N item inserts run as independent queries. Failure mid-insert = orphaned receipt with missing items, no rollback possible.

**Fix:** Wrap all inserts in single transaction (see #5).

---

## P2 — Architectural Debt That Compounds

### 11. `user_id` is email — no user table ✓ DONE (LED-85, 2026-05-15)

UUID-backed user records implemented via NextAuth Neon adapter. See [ADR 001](../adr/001-user-identity-auth-architecture.md).

---

### 12. `sharp` missing from package.json

`sharp` is used in the upload route but absent from production `dependencies`. Native module with platform-specific binaries — Vercel builds for Linux. Will fail at build time or use incompatible binary.

**Fix:** `npm install sharp`

---

### 13. No error monitoring

All logging is dev-only (`process.env.NODE_ENV === 'development'`). Production errors silently swallowed as generic 500s.

**Fix:** Add Sentry (`sentry.server.config.ts` + `sentry.client.config.ts` + `next.config.ts`).

---

### 14. No image CDN / caching

R2 presigned URLs generated per-request with 1-hour expiry. No CDN layer, no thumbnail resizing, broken images on long-lived tabs.

**Fix options:**
- Enable Cloudflare CDN in front of R2 (public bucket + signed cookies)
- Use Cloudflare Image Resizing for thumbnails
- Extend presigned URL expiry to 7 days

---

### 15. No database connection pooling

```ts
function getDb() {
  return neon(process.env.DATABASE_URL!);
}
```

New HTTP connection to Neon on every invocation. Neon free tier: 100 concurrent connections max. Vercel can run hundreds of concurrent instances.

**Fix:** Use Neon's pooled connection string (`-pooler.neon.tech`) + `neonConfig.fetchConnectionCache = true`.

---

## P3 — Lower Priority

| # | Issue | File | Impact |
|---|-------|------|--------|
| 16 | `purchase_date` stored as `TEXT` not `DATE` | `db.ts:21` | No date range queries; lexicographic sort |
| 17 | `created_at` stored as `TEXT` not `TIMESTAMPTZ` | `db.ts:30` | Bad for analytics, retention policies |
| 18 | LanceDB files present but unused | `/data/lancedb/` | Dead code, repo bloat |
| 19 | Admin email list via env var only | `auth.ts` | Requires redeploy to add/remove admins |
| 20 | Presigned URL 1hr expiry | `r2.ts` | Long-lived pages → broken images |
| 21 | No request dedup for queries | `query/route.ts` | Same question = two Claude + two Voyage calls |
| 22 | `getReceiptsByIds` could be a JOIN | `db.ts:188` | Fixed by #7 |
| 23 | `searchItemsByVector` returns top 100 hardcoded | `query/route.ts` | No dynamic tuning |
| 24 | Base64 encoding images in memory | `upload/route.ts:100` | 33% memory overhead |
| 25 | No request ID / correlation for tracing | all API routes | Can't trace single request through logs |

---

## External Dependencies — Risk Assessment

| Service | Failure mode | Mitigation |
|---------|-------------|-----------|
| **Anthropic (Claude)** | API down/slow → upload fails, query fails | Retry with backoff; async pipeline removes timeout risk |
| **Voyage AI** | API down → no embeddings → null vector | Store items without vector, re-embed in background |
| **Neon Postgres** | DB down → total outage | Neon has built-in HA; use pooled endpoint |
| **Cloudflare R2** | Storage down → images inaccessible | Low risk; Cloudflare SLA 99.9% |
| **Google/Apple OAuth** | Auth down → users can't sign in | Session cookies still valid for signed-in users |
| **Vercel** | Platform down → total outage | Consider multi-region or edge functions |

---

## Quick Reference — Files to Change Per Fix

| Fix | Primary files |
|-----|--------------|
| DB indexes | `src/lib/db.ts` (add to `ensureSchema`) or migration script |
| Pagination | `src/lib/db.ts`, `src/app/api/receipts/route.ts`, `src/app/api/items/route.ts` |
| Batch inserts + tx | `src/lib/db.ts:saveReceipt` |
| Rate limiter | `src/lib/rateLimit.ts`, add `@upstash/ratelimit` |
| sharp dep | `package.json` |
| Async pipeline | New file: `src/lib/jobs/processReceipt.ts` + queue client |
| User table | `src/lib/db.ts`, `src/auth.ts`, all API routes |
| Model swap | `src/app/api/query/route.ts` |
| Error monitoring | `sentry.server.config.ts`, `sentry.client.config.ts`, `next.config.ts` |
