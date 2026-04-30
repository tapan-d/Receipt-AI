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
