# Changelog

All notable changes to Ledger.AI are documented here. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [2026-05-15] (2)

### Added
- Preflight hash deduplication: client hashes raw file via Web Crypto API before upload; `GET /api/receipts/preflight?hash=` checks against stored SHA-256 hashes; duplicate re-uploads rejected instantly without Sharp, Claude, R2, or DB write (~20s saved)
- `image_hash TEXT` column in `receipts` table; stored on every new upload

---

## [2026-05-15]

### Changed
- Upload pipeline: R2 upload and Voyage embeddings now run concurrently via `Promise.all`
- Duplicate receipt detection: replaced `getAllReceipts` full scan with targeted `findDuplicateReceipt` — queries by `purchase_date` + `total` exact match, then ranks candidates by `pg_trgm` store name similarity (threshold 0.7). Catches OCR typos like "New India Bazar" vs "New India Bazaar". All candidates and similarity scores logged server-side for debugging.
- Extraction prompt: instruct Claude to transcribe store names, addresses, and item names exactly as printed — prevents spelling "corrections" like "Bazar" → "Bazaar"

---

## [2026-05-14]

### Added
- `src/instrumentation.ts` — runs `ensureSchema` at server startup so auth adapter tables (`users`, `accounts`, `sessions`, `verification_tokens`) exist before the first OAuth callback fires
- `migrateUserDataIfNeeded(email, uuid)` in `src/lib/db.ts` — lazy per-user one-time migration re-keys old email-keyed `receipts` and `receipt_items` rows to UUID on first login after deploy

### Changed
- Auth: wired `@auth/neon-adapter` (v1.11.2) — creates `users`, `accounts`, `verification_tokens` tables in Neon on first boot; user identity now UUID-backed instead of email-as-ID
- `src/auth.ts`: JWT strategy (30-day expiry), `session.user.id` now exposed as UUID from `users` table; `migrateUserDataIfNeeded` called on first login
- `src/lib/session.ts`: `requireAuth()` now returns `session.user.id` (UUID) instead of `session.user.email`
- `deleteReceipt(id, userId)` in `src/lib/db.ts` now scopes the DELETE to the owning user — prevents accidental cross-user deletion from future callers

---

## [2026-05-10]

### Fixed
- Image orientation: server-side Sharp now calls `.rotate()` on every upload (resize + no-resize paths) — auto-applies EXIF rotation and strips the orientation tag. iPhone portrait photos no longer display sideways.

### Changed
- Image compression targets reduced: max dimension 2048→1600px, target size 3.75MB→1.5MB, compress threshold 1.5MB→0.5MB. Matches WhatsApp's compression — Claude reads receipts fine at this resolution and Vercel's 4.5MB function payload limit is no longer a risk.
- Server Sharp passes updated to match: 1600/1200/900/700px ladder.
- Client-side compression switched from `<img>` element + `canvas.drawImage` to `createImageBitmap({ imageOrientation: 'from-image' })` for cleaner orientation handling.
- Dev-only `[preprocess]` logs in client (gated on `NODE_ENV`, silent in prod).

### Security / Privacy
- EXIF metadata (including GPS coordinates, camera serial, timestamps) now stripped from stored images via Sharp's `.rotate()` side effect. Old receipts in R2 retain original EXIF.

---

## [2026-05-09]

### Added
- Dev-only logger (`src/lib/log.ts`): `log`, `logWarn`, `logError` — silent in production; instrumented upload, receipt detail, query, and items routes with safe log points (no PII)

### Changed
- Server-side image compression: replaced hard 3.75MB rejection with transparent Sharp compression (4 passes: 2048@q80 → 1600@q70 → 1024@q65 → 768@q55); users never see a size error for images under 10MB
- R2 storage: stores compressed image instead of original full-size file
- Client-side compression (`imagePreprocess.ts`): extended quality ladder to 0.40 and added dimension halving (2048→1024→512) to guarantee images stay under 3.75MB

### Fixed
- Upload components: added `.catch()` on `res.json()` to handle non-JSON 413 responses gracefully (prevented "SyntaxError: Unexpected token" crash)

### Project
- `CLAUDE.md`: added standing rule to update CHANGELOG before every commit

---

## [Unreleased]

### Security
- Prompt injection defense: user questions sanitized (500-char limit, control char stripping, injection phrase neutralization) before reaching Claude
- XML structural separation in query prompt — `<receipt_data>` and `<user_question>` tags prevent data from being misread as instructions
- Hardened `QUERY_SYSTEM` prompt: explicit rules banning instruction-following from data sections, card number echoing, and scope drift
- Indirect prompt injection prevention: all text fields extracted from receipt images sanitized before DB write (strips structural chars and injection phrases from store names, item names, etc.)
- Server-side MIME validation via magic bytes — file type verified from buffer header, not spoofable `Content-Type`
- Rate limiting: 10 queries/min per user on `/api/query`; 20 uploads/day per user on `/api/receipts/upload` (429 + `Retry-After` header)
- Zod runtime schema validation on Claude extraction output — replaces unsafe `as ExtractedReceipt` cast; unknown fields stripped, missing fields defaulted
- Removed `card_last4` suffix from Claude query context — payment method type retained, card number suffix excluded
- Hardened extraction system prompt: explicit rule to ignore in-image instructions and always return JSON, even when receipt contains injection text
- Graceful fallback when Claude returns prose instead of JSON (injection confusion) — returns `is_receipt: false` with 422 instead of crashing with 500

---

## [2026-05-08]

### Added
- Expanded receipt acceptance: more store and service categories accepted
- Quantity and category display on receipt items

### Fixed
- Dashboard delta percentage overflow on large spend changes

---

## [2026-05-06]

### Added
- Per-item discount extraction and display
- Multi-payment support: split tenders (gift card + card, etc.) extracted and stored
- Tip and gratuity fields extracted separately (customer tip vs. auto-added gratuity)
- Admin panel at `/admin` (admin-only): manage allowed emails without redeployment
- DB-backed email allowlist: invite list stored in Neon, editable via admin panel

### Security
- Hardened API error responses: internal error details no longer leaked to clients

---

## [2026-05-04]

### Changed
- Receipt extraction model switched from `claude-opus-4-7` to `claude-sonnet-4-6` (faster, lower cost, same accuracy)

### Added
- Client-side image preprocessing pipeline: JPEG compression, max 2048px resize before upload; rejects non-image files early

---

## [2026-05-03]

### Changed
- Dashboard spend chart replaced sparkline with bar chart for better period comparison
- Added 1Y (one year) period pill to dashboard period selector

---

## [2026-05-02]

### Added
- Period-aware dashboard: spend and category data filtered by selected time period (1W / 1M / 3M / 6M / 1Y)
- Vercel Analytics integration
- Vercel Speed Insights integration
- Receipt detail page: Store Information, Transaction Details, and Rewards & Savings sections

### Changed
- Full UI redesign per Ledger.AI design handoff: typography, color palette, card layout, spacing

### Fixed
- Duplicate `Other` key in donut chart category data causing incorrect totals

---

## [2026-05-01]

### Infrastructure
- Migrated from LanceDB (local filesystem) to Neon + pgvector for Vercel-compatible vector search
- Migrated from local `public/uploads/` to Cloudflare R2 private bucket for receipt image storage
- Receipt images served via auth-gated presigned URLs (1hr expiry)

### Added
- Floating action bar: persistent Ask AI and Upload buttons on every page
- Ask AI visibility improvements: accessible from dashboard and all pages

### Fixed
- Next.js 16 middleware compatibility: renamed `middleware.ts` → `proxy.ts`

---

## [2026-04-30]

### Added
- Authentication: Google OAuth and Apple OAuth via NextAuth.js v5
- Invite-only access mode: email allowlist (env var `ALLOWED_EMAILS` or DB table)
- User-scoped data isolation: all receipts, items, and images isolated per `user_id`
- Items page: browse and search individual line items across all receipts
- Receipt management: delete receipts from the receipts list

### Changed
- Dashboard redesign: monthly spend card, category donut chart, recent receipts list

---

## [2026-04-28] — Initial Release

### Added
- Receipt scanning: upload an image, Claude Vision extracts store, items, tax, payment, rewards, POS details
- Non-receipt rejection: bank statements, invoices, tickets, etc. rejected before storage
- Duplicate detection: same store + date + total rejected with redirect to existing receipt
- AI query (RAG): natural language questions answered using Voyage AI embeddings + pgvector similarity search + Claude
- Ask AI: query spending history in natural language from any page
- Receipts page: list and view all scanned receipts
- Architecture: Next.js 15 App Router, Neon Postgres, Voyage AI, Anthropic Claude, Cloudflare R2
