# TODO

## Deploy to Vercel

Two parts of the current architecture are incompatible with Vercel and must be replaced first.

### Blockers

**1. LanceDB → Neon + pgvector**
LanceDB writes to `data/lancedb/` on the local filesystem. Vercel's serverless functions have an ephemeral read-only filesystem — data is lost after every function call.

Replace with **Neon (serverless Postgres) + pgvector extension**.
Vercel has a native "Vercel Postgres" integration built on Neon — one database handles both the relational data (receipts, items) and vector similarity search (replaces Voyage embeddings + LanceDB vector search).

Main file to rewrite: `src/lib/db.ts` (SQL queries instead of LanceDB calls).

**2. Local image uploads → Vercel Blob**
Images are written to `public/uploads/` at runtime, which is read-only on Vercel.

Replace with **Vercel Blob** (`@vercel/blob`). Each uploaded image gets a permanent public URL. The upload route change is ~5 lines.

`src/app/api/uploads/[filename]/route.ts` can be deleted once Blob is in place (Blob provides direct URLs).

### What stays the same
- All UI and API route logic
- Anthropic Claude (vision extraction + AI queries)
- Voyage AI (embeddings)
- Next.js App Router

### Vercel environment variables to add
| Variable | Where to get it |
|---|---|
| `ANTHROPIC_API_KEY` | console.anthropic.com |
| `VOYAGE_API_KEY` | dash.voyageai.com |
| `DATABASE_URL` | Vercel Postgres / Neon dashboard |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob dashboard |

### File change summary
| File | Action |
|---|---|
| `src/lib/db.ts` | Full rewrite for Neon/pgvector |
| `src/app/api/receipts/upload/route.ts` | Use Vercel Blob instead of `writeFile` |
| `src/app/api/uploads/[filename]/route.ts` | Delete (Blob gives public URLs) |
| `package.json` | Add `@vercel/blob`, `@neondatabase/serverless`; remove `@lancedb/lancedb` |

---

## Auth & Access Control

### Login
Add authentication before this is accessible to anyone.
- Use **NextAuth.js** (Auth.js v5) — minimal setup with App Router, supports OAuth + credentials
- Protect all pages via middleware (`src/middleware.ts`) — redirect unauthenticated users to `/login`
- Store session in a cookie; no DB changes needed if using JWT strategy

### Invite-only access (phase 1)
Lock down registration before opening broadly.
- Maintain a hard-coded allowlist of emails (env var `ALLOWED_EMAILS=a@x.com,b@x.com`) or a DB table
- Middleware or sign-in callback checks if authenticated email is in the allowlist; reject if not
- Switch to open registration later by removing the check

---

## Rate Limiting

Cap uploads per user to prevent abuse and runaway API costs.

Suggested limits (adjust based on real usage):
- **Per second:** 1 upload/sec (debounce rapid taps)
- **Per hour:** 20 uploads/hr
- **Per day:** 50 uploads/day

Implementation options:
- **Simple:** `@upstash/ratelimit` + Upstash Redis — serverless-friendly, works on Vercel Edge
- **Alternative:** store upload timestamps in Neon; query count within window on each request

Apply in `src/app/api/receipts/upload/route.ts`. Return `429 Too Many Requests` with a `Retry-After` header.

---

## Observability & Logging

Structured logs to track service health, usage patterns, and bottlenecks.

### What to log
| Event | Fields |
|---|---|
| Upload attempt | `user_id`, `file_size`, `mime_type`, `timestamp` |
| Extraction result | `receipt_id`, `store_name`, `is_receipt`, `latency_ms`, `model` |
| Duplicate detected | `receipt_id`, `matched_id` |
| Non-receipt rejected | `rejection_reason` |
| Delete | `receipt_id` |
| AI query | `query_text` (hashed), `latency_ms`, `results_count` |
| Errors | `route`, `error_code`, `message`, `stack` |

### Stack options
- **Vercel Log Drains** → pipe to Axiom, Datadog, or Logtail (free tiers available)
- **Axiom** — recommended: generous free tier, good Next.js integration via `next-axiom`
- Wrap key operations in `try/catch`; always log error + context, never swallow silently

### Files to update
- `src/app/api/receipts/upload/route.ts` — log upload + extraction + duplicate/rejection
- `src/app/api/receipts/[id]/route.ts` — log delete
- `src/app/api/query/route.ts` — log AI query latency + result count
- `src/lib/extract.ts` — log Claude latency
