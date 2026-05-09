# Planning

Active roadmap for Ledger.AI. Supersedes `TODO.md`.

---

## In Flight

- **GenAI security hardening** — prompt injection defense, rate limiting, Zod validation, magic bytes MIME check, sensitive data minimization (see CHANGELOG [Unreleased])

---

## Roadmap

### High Priority

**Observability & Logging**
Structured logs for service health, usage patterns, and cost tracking.
- Events to log: upload attempt, extraction result (latency, model), duplicate detected, non-receipt rejected, delete, AI query (hashed text, latency, result count), errors
- Stack: Axiom via `next-axiom` (generous free tier, native Next.js integration) or Vercel Log Drains → Datadog/Logtail
- Files: `upload/route.ts`, `receipts/[id]/route.ts`, `query/route.ts`, `extract.ts`

**PDF Receipt Support**
Accept PDF uploads in addition to images.
- Convert first page to image server-side (e.g. `pdf2pic` or Cloudflare Worker) before passing to Claude Vision
- Update magic bytes validation to accept PDF header (`%PDF`)
- Update client-side `imagePreprocess.ts` to handle PDF pass-through

---

### Medium Priority

**Vercel Deployment** *(infrastructure already compatible since 2026-05-01)*
- Add env vars to Vercel dashboard: `ANTHROPIC_API_KEY`, `VOYAGE_API_KEY`, `DATABASE_URL`, `BLOB_READ_WRITE_TOKEN`, `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `ADMIN_EMAILS`
- Configure Neon branch for preview deployments
- Configure separate R2 bucket for preview/staging

**Apple OAuth**
- Finish Apple OAuth setup in Apple Developer Console
- Add `AUTH_APPLE_ID` / `AUTH_APPLE_SECRET` env vars

**Upstash Rate Limiting** *(upgrade from in-memory)*
- Replace `src/lib/rateLimit.ts` token-bucket (resets on cold start) with `@upstash/ratelimit` + Upstash Redis
- Persistent across serverless function instances and redeployments
- Apply to `/api/query` (10 req/min) and `/api/receipts/upload` (20/day)

---

### Backlog

- **Search & filter on receipts page** — filter by date range, store, category, amount
- **Export** — CSV or PDF export of receipts / items
- **Receipt editing** — allow manual correction of extracted fields
- **Multi-currency support** — detect and store currency code, convert to USD for analytics
- **Trends page** — month-over-month spend by category, price history for specific items
- **Mobile PWA** — add `manifest.json` + service worker for installable mobile experience
- **Bulk upload** — upload multiple receipts at once
