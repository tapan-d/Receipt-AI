# Dependency Map & Implementation Priority

Last updated: 2026-05-15

Use this doc to answer "what should I implement next?" — it maps what blocks what and why order matters.

---

## Dependency Graph

```
UUID Identity (ADR 001)
  └── blocks: Groups feature
  └── blocks: Shareable receipt links (stable owner ID needed)
  └── blocks: Billing/Plans (user table required for Stripe customer ID)
  └── blocks: Account deletion (can't do user-level ops without user table)
  └── partially done — migrateUserDataIfNeeded + instrumentation landed 2026-05-14

DB Indexes (scaling-review #1)
  └── blocks: pagination being useful (index-less pagination still slow)
  └── blocks: production readiness at any real scale
  └── blocks: HNSW index critical for semantic search beyond ~1k items

Redis Rate Limiter (scaling-review #2)
  └── blocks: production deploy (in-memory rate limiter is bypassed on serverless)
  └── independent of identity/features

Pagination (scaling-review #3)
  └── depends on: DB indexes (otherwise pagination is slow anyway)
  └── blocks: production readiness (OOM risk on large accounts)

Async Upload Pipeline (scaling-review #6)
  └── depends on: nothing upstream
  └── blocks: reliable production uploads (timeout risk today)
  └── enables: better UX (instant response, background processing)

Auto-Discovery — Email Forwarding (features/auto-discovery)
  └── depends on: nothing upstream (standalone inbound email pipeline)
  └── blocks: core product value (frictionless receipt capture)

Groups (features/groups)
  └── depends on: UUID Identity ← hard blocker
  └── depends on: Shareable receipt links (for invite flow)
  └── blocks: expense splitting, household tracking use cases

Shareable Receipt Links (features/groups)
  └── depends on: UUID Identity ← hard blocker
  └── blocks: Groups invite flow

Billing / Plans
  └── depends on: UUID Identity ← hard blocker (Stripe customer ID needs user row)
  └── depends on: Auto-Discovery (gives users a reason to pay)
```

---

## Priority Order

### Tier 1 — Do first, unblocks everything else

| # | Item | Why first |
|---|------|-----------|
| 1 | **Finish UUID Identity** (ADR 001) | Blocks Groups, Sharing, Billing. Already partially done — finish it. |
| 2 | **DB Indexes** | OOM + query latency risk today. Fast to add. |
| 3 | **Redis Rate Limiter** | In-memory limiter is a no-op on Vercel. Security gap in production. |

### Tier 2 — High value, no upstream blockers

| # | Item | Why |
|---|------|-----|
| 4 | **Pagination** | OOM risk on large accounts. Depends on indexes being in place. |
| 5 | **Auto-Discovery: Email Forwarding** | Core product differentiator. Fully independent — can build anytime. |
| 6 | **Async Upload Pipeline** | Eliminates timeout risk + better UX. Independent. |

### Tier 3 — After identity is solid

| # | Item | Depends on |
|---|------|-----------|
| 7 | **Shareable Receipt Links** | UUID Identity |
| 8 | **Groups** | UUID Identity + Shareable Links |
| 9 | **Billing / Plans** | UUID Identity + Auto-Discovery |

---

## Current State Snapshot (2026-05-15)

| Item | Status |
|------|--------|
| UUID Identity | ✓ Done — LED-85 completed 2026-05-15 |
| Duplicate detection (fuzzy + preflight hash) | ✓ Done — LED-89, LED-90 completed 2026-05-15 |
| Delete receipt | ✓ Done — LED-20 completed 2026-05-15 |
| DB Indexes | Not started |
| Redis Rate Limiter | Not started |
| Pagination | Not started |
| Auto-Discovery | Not started |
| Async Upload Pipeline | Not started |
| Groups | Not started — UUID Identity now unblocked ✓ |
| Shareable Links | Not started — UUID Identity now unblocked ✓ |
| Billing | Not started — UUID Identity now unblocked ✓ |

---

## How to query

Open a session, ask:

> "Read docs/planning/dependency-map.md and the relevant design docs. What's the highest-leverage thing to implement next, and what's the minimal scope to unblock downstream work?"
