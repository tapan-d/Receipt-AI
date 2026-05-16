# Ledger.AI

A personal receipt scanning app. Snap a receipt, AI extracts everything, query your purchase history in natural language.

## Architecture

```mermaid
flowchart TD
    subgraph Browser["Browser (Next.js Pages)"]
        UI_DASH["Dashboard"]
        UI_RX["Receipts / Detail"]
        UI_ITEMS["Items"]
        UI_QUERY["Query (/query)"]
        UI_SIGNIN["Sign In"]
        FAB["Floating Action Bar\n✨ Ask AI · 📷 Upload"]
    end

    subgraph API["Next.js API Routes (all auth-gated)"]
        RT_UP["POST /api/receipts/upload"]
        RT_RX["GET  /api/receipts\nGET  /api/receipts/[id]\nDELETE /api/receipts/[id]"]
        RT_ITEMS["GET /api/items"]
        RT_QR["POST /api/query"]
        RT_AUTH["GET|POST /api/auth/[...nextauth]"]
    end

    subgraph Lib["Library Layer"]
        EXTRACT["extract.ts — Claude Vision"]
        EMBED["embed.ts — Voyage AI"]
        DB["db.ts — Neon/pgvector"]
        R2_LIB["r2.ts — Cloudflare R2"]
        SESSION["session.ts — requireAuth()"]
    end

    subgraph External["External APIs"]
        CLAUDE["Anthropic claude-opus-4-7"]
        VOYAGE["Voyage AI voyage-3\n1024-dim embeddings"]
        GOOGLE["Google OAuth"]
        APPLE["Apple OAuth"]
    end

    subgraph CloudStorage["Cloud Storage"]
        NEON[("Neon Postgres\n+ pgvector\nreceipts · receipt_items\n(user_id scoped)")]
        R2[("Cloudflare R2\nPrivate bucket\nReceipt images")]
    end

    UI_SIGNIN -->|OAuth| RT_AUTH
    RT_AUTH <--> GOOGLE
    RT_AUTH <--> APPLE

    FAB -->|upload| RT_UP
    FAB -->|question| UI_QUERY
    UI_DASH --> RT_RX
    UI_DASH --> RT_QR
    UI_RX --> RT_RX
    UI_ITEMS --> RT_ITEMS
    UI_QUERY --> RT_QR

    RT_UP --> SESSION
    RT_UP --> EXTRACT
    RT_UP --> EMBED
    RT_UP --> R2_LIB
    RT_UP --> DB

    RT_RX --> SESSION
    RT_RX --> DB
    RT_RX -->|image_path key| R2_LIB

    RT_QR --> SESSION
    RT_QR --> EMBED
    RT_QR --> DB
    RT_QR -->|items + receipt context| CLAUDE

    EXTRACT -->|base64 image| CLAUDE
    EMBED -->|text → vectors| VOYAGE
    DB <-->|SQL + pgvector| NEON
    R2_LIB <-->|S3-compatible API| R2
```

### Upload flow
`image` → base64 in memory → **Claude Vision** extracts structured JSON → validates it's a receipt → deduplication check → **Voyage AI** embeds each item (1024-dim) → upload image to **Cloudflare R2** → save receipt + items (with vectors) to **Neon**

### Query (RAG) flow
`question` → **Voyage AI** embeds query → **pgvector** cosine similarity search in Neon (filtered by `user_id`, top 100 items) → fetch parent receipts → **Claude** reads full context and answers

### Image access flow
`GET /api/receipts/[id]` → verify session owns receipt → generate **R2 presigned URL** (1hr expiry, HMAC-signed) → returned alongside receipt data → browser renders image directly

---

## Features

- **Authentication** — Google and Apple OAuth via NextAuth; invite-only mode via DB-backed email allowlist
- **Admin panel** — `/admin` tab (visible only to admin) to manage allowed emails on the fly — no redeploy needed
- **Scan receipts** — upload or snap a receipt via the floating action bar; Claude extracts store, items, tax, payment, rewards, POS details
- **Non-receipt rejection** — non-receipt images are rejected before any data is stored
- **Duplicate detection** — same store + date + total is rejected with a redirect to the existing receipt
- **Dashboard** — monthly spend, category breakdown by item, recent receipts
- **Ask AI from anywhere** — floating action bar on every page; ask anything in natural language about your spending
- **Receipts** — browse and delete all scanned receipts
- **Items** — search and filter individual line items across all receipts
- **Private image storage** — receipt images in Cloudflare R2 private bucket; served via auth-gated presigned URLs (1hr expiry)
- **User-scoped data** — all receipts, items, and images isolated per user account

## Tech Stack

- [Next.js 16](https://nextjs.org) — frontend and API routes (App Router)
- [NextAuth.js v5](https://authjs.dev) — Google and Apple OAuth
- [Claude](https://anthropic.com) (`claude-opus-4-7`) — receipt extraction and natural language queries
- [Neon](https://neon.tech) — serverless Postgres with pgvector extension for relational data and vector search
- [Voyage AI](https://voyageai.com) (`voyage-3`) — 1024-dim semantic embeddings for RAG vector search
- [Cloudflare R2](https://developers.cloudflare.com/r2/) — S3-compatible private object storage for receipt images

## Prerequisites

- Node.js 18+
- [Anthropic API key](https://console.anthropic.com)
- [Voyage AI API key](https://dash.voyageai.com)
- [Neon](https://neon.tech) account — create a project, copy the connection string (free tier sufficient)
- [Cloudflare](https://dash.cloudflare.com) account with R2 enabled — create a private bucket and API token (free tier: 10 GB)
- Google OAuth credentials — [console.cloud.google.com](https://console.cloud.google.com) → APIs & Services → Credentials → OAuth 2.0 Client

## Setup

1. **Clone and install**

   ```bash
   git clone https://github.com/tapan-d/Receipt-AI.git
   cd Receipt-AI
   npm install
   ```

2. **Provision Neon**

   - Go to [neon.tech](https://neon.tech) → create a project
   - Copy the connection string from the dashboard (`postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require`)
   - Schema is created automatically on first request — no manual migration needed
   - **Environment isolation:** create a `development` branch in Neon (Branches → New Branch — it's a free copy-on-write fork). Use the dev branch connection string in `.env.local`; use the `main` branch connection string in Vercel env vars. Schema changes and test data in local dev never touch production.

3. **Provision Cloudflare R2**

   - Go to [dash.cloudflare.com](https://dash.cloudflare.com) → R2 → Create bucket (keep access **Private**)
   - R2 → Manage R2 API Tokens → Create API Token
     - Permission: **Object Read & Write**
     - Scope: your specific bucket only
   - Note your **Account ID** (top-right of the Cloudflare dashboard)
   - Copy the **Access Key ID** and **Secret Access Key** (secret shown once)
   - **Environment isolation:** create a second bucket (e.g. `receipt-ai-development`) for local dev. Set `R2_BUCKET_NAME=receipt-ai-development` in `.env.local` and `R2_BUCKET_NAME=receipt-ai-prod` in Vercel env vars. R2 API credentials are account-level — same keys work for both buckets.

4. **Configure environment**

   ```bash
   cp .env.local.example .env.local
   ```

   Edit `.env.local`:

   ```bash
   # AI APIs
   ANTHROPIC_API_KEY=sk-ant-...
   VOYAGE_API_KEY=pa-...

   # Auth (generate secret: openssl rand -hex 32)
   AUTH_SECRET=your-random-secret

   # Google OAuth — add http://localhost:3000/api/auth/callback/google
   # as an authorized redirect URI in Google Cloud Console
   AUTH_GOOGLE_ID=your-client-id.apps.googleusercontent.com
   AUTH_GOOGLE_SECRET=your-client-secret

   # Invite-only allowlist — seeded into DB on first run, can be removed after
   # Remove entirely to open access to all authenticated users
   ALLOWED_EMAILS=you@example.com,friend@example.com

   # Admin panel — server-side only, never exposed to the browser
   ADMIN_EMAILS=you@example.com

   # Neon
   DATABASE_URL=postgresql://user:pass@ep-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require

   # Cloudflare R2
   CLOUDFLARE_ACCOUNT_ID=your-account-id
   R2_ACCESS_KEY_ID=your-access-key-id
   R2_SECRET_ACCESS_KEY=your-secret-access-key
   R2_BUCKET_NAME=your-bucket-name
   ```

5. **Start the dev server**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## Data Storage

All data lives in cloud services — runs identically locally and on Vercel.

| Service | Contents | Notes |
|---|---|---|
| Neon (Postgres + pgvector) | Receipts, line items, 1024-dim vectors | Portable via `pg_dump`; standard SQL |
| Cloudflare R2 | Receipt images | S3-compatible; portable to AWS S3, MinIO, etc. |

For staging environments: create a Neon branch (copy-on-write fork) and a separate R2 bucket, then point preview deployments at those credentials.

## Usage

1. Sign in with Google (or Apple once configured)
2. Upload a receipt using the floating action bar at the bottom of every page — drag-and-drop, file picker, or the Upload button
3. Claude extracts all details in a few seconds; non-receipts are rejected automatically
4. Browse receipts under **Receipts**, individual items under **Items**
5. Ask anything using the **Ask AI** button in the floating bar — available on every page

### Example questions

- How much did I spend on dairy products this month?
- Show me the price history of olive oil from Costco.
- What are my top 5 most purchased items?
- How much tax did I pay at Trader Joe's?
- Total spent on groceries last quarter?
