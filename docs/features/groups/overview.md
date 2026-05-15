# Feature: Groups & User Discovery

**Status:** Design in progress. Decisions marked **DECIDED** are locked. Items marked **TODO** need product decisions before implementation.

**Note:** DB schema uses `user_id TEXT` (email). Will need updating after UUID migration — see [ADR 001](../../adr/001-user-identity-auth-architecture.md).

---

## User Discovery

### DECIDED
- **Primary mechanism: Invite link** — group creator generates a shareable link, sends via WhatsApp/iMessage/email. Recipient clicks → signs up if needed → auto-joins group.
- **Secondary: Opt-in email search** — profile toggle "Allow others to find me by email", default OFF. Search only returns results if target has opted in. Prevents account enumeration.
- **Contacts-based discovery** — future only, requires native mobile app (iOS/Android). Web Contact Picker API not supported on iOS Safari. Save for mobile app roadmap.
- **Hashing for contacts:** when contacts discovery is built, phone/email hashes sent to server (never raw contacts). Server matches against hashed user records only.

### TODO
- What does an invite link show before the recipient accepts? (sender name? group name? receipt count? nothing?)
- Does an invite link expire? If yes, how long? (24h, 7 days, never?)
- Is an invite link single-use or multi-use (shareable to a group chat)?
- What info is visible in opt-in email search results? (name only? avatar? member since?)
- Can you search for users who haven't opted in but share the same email domain (e.g. company)?

---

## Groups

### DECIDED
- **Groups are optional.** Solo users unaffected. No forced onboarding.
- **Group types:** Household, Event, Business — same underlying model, just a label.
- **Ownership:** Receipts always owned by uploader. Group membership = read-only visibility. Never transfers ownership.
- **Uploader = payer by default.** A `payer_user_id` field (separate from uploader) handles "upload on behalf of" scenarios.
- **Leaving a group:** your receipts untagged from group automatically. You keep your receipts. Others lose visibility to yours. Their receipts unaffected.
- **Disbanding:** group lead disbands → all receipts revert to personal-only. No data lost.
- **Orphaned group:** if lead leaves, must transfer leadership first OR disband. Cannot leave without resolving this.
- **Currency:** currency field + exchange rate at upload time required for cross-currency expense splits (international trips).

### TODO — Group Creation & Membership
- What roles exist? Lead + Member enough, or do we need Admin/Viewer?
- Can a member invite others or only the lead?
- Is there a member limit per group?
- Can you be in multiple groups simultaneously?
- When you join a group, do you see receipts tagged before you joined? (retroactive visibility yes/no?)

### TODO — Receipt Tagging
- Can a member tag any receipt they uploaded to the group, or does lead need to approve?
- Can a member tag another member's receipt to the group (e.g. "this dinner was ours")?
- Can the group lead untag a member's receipt from the group?
- Can a receipt be tagged to multiple groups simultaneously?

### TODO — Permissions Matrix
Needs decisions on roles first, then fill this out:

| Action | Lead | Member |
|---|---|---|
| Create group | ✓ | — |
| Invite members | ✓ | TODO |
| Remove members | ✓ | — |
| Tag own receipt to group | ✓ | ✓ |
| Tag another's receipt | TODO | TODO |
| Untag own receipt | ✓ | ✓ |
| Untag another's receipt | TODO | — |
| View all group receipts | ✓ | ✓ |
| Disband group | ✓ | — |
| Transfer leadership | ✓ | — |

---

## Expense Splitting

### DECIDED
- Split calculation: sum receipts per member within group ÷ N members (or custom split)
- Uploader = payer by default; overridable via `payer_user_id`
- "Mark as settled" needed — track who has paid whom
- Currency normalization needed for international groups

### TODO
- Equal split only, or custom percentages per person?
- Does the app integrate with Venmo/PayPal/UPI for settlement, or just track who owes what?
- Can you exclude certain receipts from the split (e.g. personal items on a group trip)?
- Split by item (you had the steak, I had the salad) or by receipt total only?

---

## DB Schema (when ready to build)

> **Warning:** `user_id TEXT` below assumes email identity. Update to UUID after [ADR 001](../../adr/001-user-identity-auth-architecture.md) is implemented.

```sql
CREATE TABLE groups (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT, -- 'household' | 'event' | 'business'
  created_by TEXT NOT NULL, -- user_id (email → UUID post-migration)
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE group_members (
  group_id UUID REFERENCES groups(id),
  user_id TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member', -- 'lead' | 'member'
  joined_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (group_id, user_id)
);

CREATE TABLE group_receipts (
  group_id UUID REFERENCES groups(id),
  receipt_id UUID REFERENCES receipts(id),
  tagged_by TEXT NOT NULL,      -- user_id who tagged it
  payer_user_id TEXT,           -- who actually paid (defaults to uploader)
  tagged_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (group_id, receipt_id)
);

-- For invite links
CREATE TABLE group_invites (
  id UUID PRIMARY KEY,
  group_id UUID REFERENCES groups(id),
  created_by TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ,       -- NULL = no expiry (TODO: decide)
  max_uses INT,                 -- NULL = unlimited (TODO: decide)
  use_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## Shareable Read-Only Receipt Link

### DECIDED
- User can share a single receipt via a time-limited link — no account needed to view
- Link shows receipt data (store, items, total) but no edit/delete controls
- Expires after 24h (or configurable — 1h / 24h / 7 days)
- Useful for: warranty claims, reimbursement proof, sharing with someone not on the app

### TODO
- What exactly is visible to the link recipient? (full receipt + items? image? or summary only?)
- Can the owner revoke the link before expiry?
- Can recipient upload/import the receipt to their own account from the link?

### DB Schema
```sql
CREATE TABLE receipt_shares (
  token TEXT PRIMARY KEY,
  receipt_id UUID REFERENCES receipts(id),
  created_by TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## Build Order (when ready)
1. User profile page + discoverability toggle
2. Invite link generation + redemption
3. Groups CRUD (create, join, leave, disband)
4. Receipt tagging to groups
5. Group receipt feed
6. Expense split calculation
7. Settlement tracking
8. Contacts-based discovery (native mobile app only)
