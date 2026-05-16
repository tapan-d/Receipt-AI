# ADR 002 — Monetization Strategy: Feature Flags → Limits → Stripe

**Status:** Decided  
**Date:** 2026-05-15  

---

## Decision

Three-phase approach: feature flags now, per-feature JSONB limits system when monetizing, Stripe last. No tier design until real users exist. Full per-user override capability at every stage.

---

## Context

Need to ship Groups and other premium features while preserving full flexibility to monetize later — including per-tier quotas, per-user overrides, and pricing changes without code deploys.

### Rejected: Build groups first, gate later
Grandfathering problem. Users who used groups for free get access cut at monetization time — friction and bad UX.

### Rejected: Hardcode Free/Pro/Max tiers first
- No paying users yet → no signal on what users will pay for → tier boundaries will be wrong
- `plan TEXT` on users table can't express trials, grandfathering, per-user deals, add-ons, team seats
- Feature→tier map in source code → pricing change requires redeploy
- "Max" tier for a personal receipt app has no clear definition yet

### Rejected: Binary entitlements (has/doesn't have feature)
Not flexible enough. "Groups" needs quotas (max 2 on free, 20 on pro, unlimited on max), boolean caps (can_invite_others), and per-user overrides — not just on/off.

---

## Phase 1 — Feature Flags (now, until first paying users)

```ts
// src/lib/features.ts
export const FEATURES = {
  groups:          process.env.FEATURE_GROUPS === 'true',
  auto_discovery:  process.env.FEATURE_AUTO_DISCOVERY === 'true',
  shareable_links: process.env.FEATURE_SHAREABLE_LINKS === 'true',
} as const;
```

- One env var per feature — global toggle, zero DB overhead
- Default OFF in production, ON in staging
- UI hides the feature entirely (no paywall UI yet)
- Ships features to real users → learn usage patterns before pricing

**API route pattern:**
```ts
if (!FEATURES.groups) return Response.json({ error: 'Not available' }, { status: 404 });
```

---

## Phase 2 — JSONB Limits System (when monetizing)

### Schema

```sql
-- Plan-level config: fully configurable in DB, no redeploy needed
CREATE TABLE plan_limits (
  plan    TEXT  NOT NULL,
  feature TEXT  NOT NULL,
  config  JSONB NOT NULL DEFAULT '{}',
  PRIMARY KEY (plan, feature)
);

-- Per-user partial overrides: merged on top of plan config
CREATE TABLE user_limit_overrides (
  user_id    UUID  REFERENCES users(id),
  feature    TEXT  NOT NULL,
  config     JSONB NOT NULL DEFAULT '{}',
  expires_at TIMESTAMPTZ,  -- NULL = permanent; for trials, set expiry
  PRIMARY KEY (user_id, feature)
);

-- Add plan to users table
ALTER TABLE users ADD COLUMN plan TEXT NOT NULL DEFAULT 'free';
```

### Example seed data

```sql
INSERT INTO plan_limits VALUES
('free', 'groups', '{
  "enabled": true,
  "max_groups": 2,
  "max_members_per_group": 5,
  "can_invite_others": false
}'),
('pro', 'groups', '{
  "enabled": true,
  "max_groups": 20,
  "max_members_per_group": 50,
  "can_invite_others": true
}'),
('max', 'groups', '{
  "enabled": true,
  "max_groups": -1,
  "max_members_per_group": -1,
  "can_invite_others": true
}');
```

### Resolution order (highest to lowest priority)

```
user_limit_overrides.config   ← key-level win (partial merge)
         +
plan_limits.config            ← base for user's plan
         ↓
code-level defaults           ← fallback if key missing in DB
```

User override is **partial** — only specified keys win. Plan controls `enabled`; overrides cannot bypass a fully disabled feature.

### Core library

```ts
// src/lib/limits.ts
const CODE_DEFAULTS: Record<string, Record<string, unknown>> = {
  groups: { enabled: false, max_groups: 0, max_members_per_group: 0, can_invite_others: false },
};

export async function getFeatureConfig<T>(userId: string, feature: string): Promise<T> {
  const user = await getUser(userId);
  const [planRow, overrideRow] = await Promise.all([
    db.query(`SELECT config FROM plan_limits WHERE plan = $1 AND feature = $2`, [user.plan, feature]),
    db.query(
      `SELECT config FROM user_limit_overrides WHERE user_id = $1 AND feature = $2 AND (expires_at IS NULL OR expires_at > now())`,
      [userId, feature]
    ),
  ]);
  const defaults  = CODE_DEFAULTS[feature] ?? { enabled: false };
  const planCfg   = planRow.rows[0]?.config ?? { enabled: false };
  const userCfg   = overrideRow.rows[0]?.config ?? {};
  const effective = { ...defaults, ...planCfg, ...userCfg };
  effective.enabled = planCfg.enabled;  // plan always controls access gate
  return effective as T;
}

export function withinLimit(current: number, limit: number): boolean {
  return limit === -1 || current < limit;  // -1 = unlimited
}
```

### Typed configs per feature

```ts
// src/lib/feature-configs.ts
export interface GroupsConfig {
  enabled:               boolean;
  max_groups:            number;   // -1 = unlimited
  max_members_per_group: number;   // -1 = unlimited
  can_invite_others:     boolean;
}
```

### API route pattern

```ts
// POST /api/groups/create
const cfg = await getFeatureConfig<GroupsConfig>(userId, 'groups');
if (!cfg.enabled) return Response.json({ error: 'Not available' }, { status: 404 });

// Atomic check-and-insert to prevent race condition
const result = await db.query(`
  INSERT INTO groups (id, name, created_by)
  SELECT gen_random_uuid(), $2, $1
  WHERE (SELECT COUNT(*) FROM groups WHERE created_by = $1 AND deleted_at IS NULL) < $3
  RETURNING id
`, [userId, name, cfg.max_groups === -1 ? 999999 : cfg.max_groups]);

if (result.rowCount === 0) {
  return Response.json({ error: 'Group limit reached', limit: cfg.max_groups, upgrade: '/pricing' }, { status: 403 });
}
```

### Session augmentation

```ts
// auth.ts — include effective limits so frontend renders without extra fetch
session.limits = await getUserEffectiveLimits(session.userId);
session.usage  = await getUserUsage(session.userId);
```

### Frontend pattern

```tsx
<LimitGate feature="groups" used={2} limit={2}>
  <CreateGroupButton />
</LimitGate>
// → "2/2 groups · Upgrade for more" when at limit
// → renders children normally when under limit
```

---

## Phase 3 — Stripe (when limits system is live)

- Stripe webhook `checkout.session.completed` → set `users.plan`, insert per-feature `user_limit_overrides` for any custom grants
- Stripe webhook `customer.subscription.deleted` → revert `users.plan` to 'free'
- Idempotency: store processed Stripe event IDs to handle at-least-once delivery
- Plan names ("Pro", "Max") are Stripe product labels only — not concepts in application code
- Store `price_id → plan` mapping in DB (not code) to handle multiple currencies / price IDs

Admin routes for manual management (no psql access needed):
```
PATCH /api/admin/plans/[plan]/features/[feature]  → update plan_limits.config
PATCH /api/admin/users/[id]/features/[feature]    → upsert user_limit_overrides
GET   /api/admin/users/[id]/features              → show effective config per feature
```

---

## Migration Path (Phase 1 → Phase 2)

```ts
// Phase 1
if (!FEATURES.groups) return 404;

// Phase 2 — drop-in replacement, one line per route
const cfg = await getFeatureConfig<GroupsConfig>(userId, 'groups');
if (!cfg.enabled) return 404;
```

No bulk migration. Swap per-route as monetization rolls out.

---

## Edge Cases — Decided

| # | Issue | Resolution |
|---|-------|------------|
| 1 | Race condition on limit check | Atomic DB check-and-insert (not app-level count+insert) |
| 2 | Duplicate Stripe webhooks | Idempotency key table; upsert not insert |
| 3 | User override bypasses `enabled` | Plan always controls `enabled`; overrides affect quotas only |
| 4 | Downgrade leaves user over-limit | Existing data preserved; creation blocked until under limit |
| 5 | Trial support | `expires_at` on `user_limit_overrides`; `getFeatureConfig` filters expired rows |
| 6 | JSONB key missing in DB | Always merge with code-level defaults before returning |
| 7 | Cache lag after admin config change | Explicit cache bust on every write to `plan_limits` or overrides |
| 8 | Soft deletes counting toward limit | All limit count queries filter `WHERE deleted_at IS NULL` |
| 9 | Created vs joined groups | Limit counts groups `WHERE created_by = userId` only |
| 10 | Unknown plan in `plan_limits` | Log + alert; fallback to `{ enabled: false }` |

## Edge Cases — Deferred

| # | Issue | When to address |
|---|-------|-----------------|
| 11 | Org/team billing | When first B2B customer exists |
| 12 | Stripe price ID → plan mapping | Before launch in second currency |
| 13 | Group ownership transfer on deletion | Before account deletion feature ships |

---

## Consequences

- Tier design deferred until user signal exists — no premature pricing decisions
- Phase 1 is global-only (no per-user differences) — acceptable pre-monetization
- Phase 2 requires `plan_limits` + `user_limit_overrides` tables before Stripe integration
- Pricing changes (new quotas, new features) require only a DB UPDATE — no redeploy
- Adding a new limit dimension to an existing feature requires: add key to JSONB seed + add to code defaults + add to typed interface — no migration
