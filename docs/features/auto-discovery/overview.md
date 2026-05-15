# Feature: Auto-Discovery

**Status:** Not started  
**Linear:** https://linear.app/ledger-ai/document/architecture-doc-806feec3df6d

Automatically surface receipts without manual upload — email forwarding, photo library scan, WhatsApp bot.

---

## Approaches

### Approach 1: Email Forwarding (Best Near-Term)

- Provision dedicated email per user: `tapan@[domain]`
- User sets up forwarding rule in Gmail/Apple Mail for keywords: purchase, receipt, invoice, order confirmation
- No full inbox access needed — subject-line filter only
- Parse inbound email: extract attachments (PDF/image) or HTML body
- Run receipt extraction pipeline on parsed content
- Ref: https://engineering.ramp.com/post/apple-intelligence-receipt-matching

### Approach 2: Phone Photo Library Scan

- Mobile agent scans photo library for receipt images
- On-device ML classification to identify receipts
- Upload candidates to extraction pipeline
- iOS/Android permission model — privacy-sensitive, needs clear user consent framing

### Approach 3: WhatsApp Bot

- User sends receipt photo to WhatsApp bot
- Bot authenticates user by phone number
- Forwards image to extraction pipeline
- Replies with confirmation + parsed summary

### Approach 4: Manual Upload + Credits Incentive

- Every 10 uploads = 1 credit
- Signup bonus: 50 credits
- Referral: 5 credits per referred signup
- 100 credits = $5 value
- Credits usable for premium features (AI queries, reports, etc.)

---

## Email System

### Inbound Stack

- Option A: Own mail server (Postfix / AWS SES inbound) — full control, more ops burden
- Option B: Forwarding-only (user forwards to our address) — simpler, less infrastructure
- Parse email: python email / mailparser library
- Store raw email + extracted receipt data

### Outbound Stack

- Transactional: AWS SES or SendGrid
- Report emails: attach generated PDF
- Invite emails: include short-lived signed link

---

## Shareable Links

- Option A: DB-stored tokens with expiry column — simple, revocable, queryable
- Option B: Signed JWT tokens — stateless, no DB lookup, harder to revoke
- **Recommendation:** DB-stored for invite links (need revoke), JWT for read-only share links
- Invite links: store hash in DB with expiry + single-use flag
- Share links: signed URL with expiry embedded (or permanent with revoke flag in DB)

---

## Reports — PDF Generation

- Option A: Server-side — Puppeteer/Playwright renders HTML template to PDF
- Option B: Client-side — browser print-to-PDF via `window.print()`
- **Recommendation:** server-side for consistent output and email attachment support

---

## Plans & Billing

- Payment processor: Stripe (subscriptions + usage metering)
- Enforcement: middleware checks plan limits per request
- Credits: separate ledger table, deducted per operation
- Webhook: Stripe events update subscription status in DB

---

## Admin Analytics

- Option A: Role-gated route in main app (`/admin`) — simpler, no separate deploy
- Option B: Separate internal tool (Retool, Metabase) — faster to build, less custom code
- **Recommendation:** Metabase or similar pointed at prod DB (read replica) for V1

---

## Open Questions

- Phone login — which provider? (Twilio Verify, Firebase Auth)
- Groups — receipt routing at upload: auto-assign to default group or user picks?
- Credits — real money redemption or app-credit only?
- Photo library scan — iOS/Android permission model, privacy framing?
- Plans — usage-based or flat subscription?
- User discovery opt-out — default opt-in or opt-out? Legal/privacy implications?
