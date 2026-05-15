# ADR 001 — User Identity & Auth Architecture

**Status:** Implemented  
**Date:** 2026-05-15  
**Completed:** 2026-05-15 (LED-85)  
**Linear:** https://linear.app/ledger-ai/document/user-identity-and-auth-architecture-e17edc8949b3  
**Issue:** LED-33

---

## Current State

No `users` table. Identity = `session.user.email` from OAuth, stamped as `user_id` on every receipt/item row. No persistent user records.

**Gaps:**

- Email as PK breaks if OAuth provider changes it
- No stable ID for Groups feature (planned)
- No profile customization possible
- `deleteReceipt` has no `userId` guard at DB level
- No `middleware.ts` — unauthenticated users can hit page routes directly

---

## Decision: NextAuth Neon Adapter + UUID Identity

### Why

- UUID as stable PK survives email changes at the OAuth provider level
- Required for Groups feature (members need stable IDs for invites/splitting)
- Neon adapter creates `users` + `accounts` tables automatically
- `accounts` table anchors identity to `providerAccountId` (Google/Apple sub) — immutable, never changes
- Future auth methods (magic link) addable as one-line provider addition, no schema changes

### Why NOT custom usernames/handles

App is private, invite-only. No public profiles, no @mentions, no URL routing by username. Email is already the unique human-readable identifier for this user base.

---

## Auth Flow (post-implementation)

```
1. User hits app → no session → redirect /sign-in
2. Clicks "Continue with Google" / "Continue with Apple"
3. OAuth redirect → provider login
4. Provider returns: { email, name, avatar, providerAccountId }
5. NextAuth signIn callback → isEmailAllowed(email) check
6. Adapter checks accounts table for providerAccountId:
   - Not found → create users row (UUID) + accounts row  [first login = signup]
   - Found     → fetch existing users row                 [returning user = login]
7. JWT issued with users.id (UUID)
8. User lands on dashboard
```

No separate signup screen. First login = account creation. Invisible to user.

---

## DB Schema (adapter-managed)

```sql
users (
  id              TEXT PRIMARY KEY,   -- UUID, stable forever
  name            TEXT,
  email           TEXT UNIQUE,        -- display/contact only, not auth anchor
  "emailVerified" TIMESTAMPTZ,
  image           TEXT
)

accounts (
  provider            TEXT,           -- 'google' | 'apple'
  "providerAccountId" TEXT,           -- Google sub / Apple sub — never changes
  "userId"            TEXT,           -- FK → users.id
  PRIMARY KEY (provider, "providerAccountId")
)

verification_tokens  -- unused now, ready for magic links later
```

---

## Implementation Plan

### 1. Install

```bash
npm install @auth/neon-adapter
```

### 2. src/auth.ts

```ts
import NextAuth, { DefaultSession } from 'next-auth';
import Google from 'next-auth/providers/google';
import Apple from 'next-auth/providers/apple';
import { NeonAdapter } from '@auth/neon-adapter';
import { neon } from '@neondatabase/serverless';
import { isEmailAllowed, migrateUserDataIfNeeded } from '@/lib/db';

declare module 'next-auth' {
  interface Session {
    user: { id: string } & DefaultSession['user'];
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: NeonAdapter(neon(process.env.DATABASE_URL!)),
  session: { strategy: 'jwt', maxAge: 30 * 24 * 60 * 60 },
  providers: [Google, Apple],
  pages: { signIn: '/sign-in' },
  callbacks: {
    async signIn({ user }) {
      return isEmailAllowed(user.email ?? '');
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        migrateUserDataIfNeeded(user.email!, user.id); // one-time lazy migration
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id as string;
      return session;
    },
  },
});
```

### 3. src/lib/session.ts

```ts
export async function requireAuth(): Promise<{ userId: string } | NextResponse> {
  const session = await auth();
  const userId = session?.user?.id;  // was .email
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return { userId };
}
```

### 4. src/lib/db.ts — add migration function

```ts
export async function migrateUserDataIfNeeded(email: string, uuid: string): Promise<void> {
  const sql = getDb();
  const [{ count }] = await sql`
    SELECT COUNT(*)::int AS count FROM receipts WHERE user_id = ${email}
  ` as { count: number }[];
  if (count === 0) return;
  await sql`UPDATE receipts SET user_id = ${uuid} WHERE user_id = ${email}`;
  await sql`UPDATE receipt_items SET user_id = ${uuid} WHERE user_id = ${email}`;
}
```

### 5. Add src/middleware.ts (fix unprotected page routes)

```ts
export { auth as middleware } from '@/auth';

export const config = {
  matcher: ['/((?!api/auth|sign-in|_next/static|_next/image|favicon.ico).*)'],
};
```

---

## What Breaks / Compatibility

| Area | Impact | Notes |
|------|--------|-------|
| API routes | None | `requireAuth()` still returns `{ userId: string }` |
| Existing data | Transient | Email-keyed rows migrated lazily on first login per user |
| Admin page | None | Uses `session.user.email` directly |
| Rate limiting | None | Uses userId string as key regardless of format |

---

## Session Config

- **Strategy**: JWT (stateless, no DB hit per request)
- **Expiry**: 30 days rolling
- **Cookie**: `httpOnly`, `sameSite`, `secure` — set by NextAuth automatically
- **Limitation**: Cannot invalidate server-side before expiry (acceptable for this app's threat model)

---

## Future: Email / Magic Link Auth

Additive when needed. One provider addition, no schema changes:

```ts
import Email from 'next-auth/providers/email';
providers: [Google, Apple, Email({ server: process.env.EMAIL_SERVER })]
```

Adapter already creates `verification_tokens` table. Email-provider users CAN change their email (app owns that credential). OAuth users cannot (provider owns it).

---

## Portability

- Adapter swappable (Prisma, Drizzle, Supabase) — one import change
- `users` + `accounts` schema is Auth.js standard — all adapters expect same shape
- UUID-keyed data rows are universally portable
- Google/Apple app credentials reusable in any auth system
