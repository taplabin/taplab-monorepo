# Sales Portal — Design Spec
**Date:** 2026-06-22
**Status:** Approved

---

## Overview

A new broker-facing portal at `sales.taplab.in` that allows TapLab's sales network to submit client leads, refer new brokers, track their earnings, and compete on a leaderboard. Admin retains full control over business creation, broker onboarding, and commission payouts. Automated RazorpayX payouts fire on subscription activation. Built as Option A — new `sales/` Vite app in the monorepo, same Firebase project, new backend routes.

---

## Section 1 — Data Model

### `brokers` collection (new fields added to existing)

```
ownerUid: string | null           — Firebase UID for sales portal login
referredBy: string | null         — brokerId of the broker who referred this one

bankAccountNumber: string | null
bankIfsc: string | null
upiId: string | null
bankVerified: boolean             — broker confirmed details in sales portal

razorpayContactId: string | null  — created on RazorpayX when broker verifies
razorpayFundAccountId: string | null
```

### `leads` collection (new)

Broker-submitted business client details.

```
brokerId: string
brokerName: string                — denormalized
status: 'pending' | 'approved' | 'rejected'
rejectionReason: string | null

businessName: string
businessSlug: string              — suggested by broker, admin can edit
ownerName: string
ownerPhone: string
ownerEmail: string | null
pricingAmount: number
billingCycle: 'monthly' | 'yearly'
setupFee: number
commissionPercent: number
freeTrialEnabled: boolean
trialDurationDays: number

createdAt: Timestamp
updatedAt: Timestamp
```

Admin edits fields directly on the lead before approving. Broker sees the final state post-approval.

### `brokerReferrals` collection (new)

Broker-submitted requests to onboard a new broker.

```
referringBrokerId: string
name: string
phone: string
email: string
status: 'pending' | 'converted' | 'rejected'
createdAt: Timestamp
```

When admin creates a broker account from a referral, status becomes `converted` and `referredBy` on the new broker doc is pre-filled automatically.

### `businesses` collection (new payout tracking fields)

```
commissionPayoutSent: boolean
commissionPayoutId: string | null      — RazorpayX payout ID for audit trail
commissionPayoutAmount: number | null
commissionPayoutSentAt: Timestamp | null  — used for monthly streak counting + earnings display
streakBonusSent: boolean
streakBonusAmount: number | null
streakBonusPayoutId: string | null
streakBonusSentAt: Timestamp | null
referralBonusPending: boolean          — admin needs to set amount and trigger payout
referralBonusAmount: number | null     — admin sets this manually
referralBonusSent: boolean
referralBonusPayoutId: string | null
referralBonusSentAt: Timestamp | null
leadId: string | null                  — reference back to originating lead
```

### `config` document (new)

Single Firestore document (`config/streak`) storing streak tier configuration so thresholds and amounts can be adjusted without a deployment.

```
tiers: [
  { fromDeal: 6,  bonusAmount: 500  },
  { fromDeal: 11, bonusAmount: 1000 },
  { fromDeal: 16, bonusAmount: 1500 },  — admin sets this
]
```

---

## Section 2 — Auth and Account Creation

### Admin creates a broker account

1. Admin fills broker form in admin panel — name, phone, email, bank account number, IFSC, UPI ID, `referredBy` (pre-filled if coming from a `brokerReferrals` approval)
2. Backend creates Firebase Auth user with `broker: true` custom claim — same pattern as `admin: true` today
3. Backend generates a password reset invite link — same pattern as business owner invite flow
4. Admin copies and shares link with broker

### Broker first login

1. Broker clicks invite link, sets password, lands on `sales.taplab.in`
2. Frontend checks `broker: true` claim on the Firebase ID token — if absent, signs out immediately
3. Broker is gated behind a **bank verification screen** before any other route is accessible
4. Broker sees their bank details as entered by admin (partially masked), confirms they are correct
5. Backend calls RazorpayX to create a Contact + Fund Account, stores `razorpayContactId` and `razorpayFundAccountId` on the broker doc, sets `bankVerified: true`
6. Full dashboard access granted

**Hard guard:** No payout of any kind fires for a broker until `bankVerified: true`. This is enforced in the webhook handler, not just the frontend.

---

## Section 3 — Lead Lifecycle

### Broker submits a business lead

Broker fills the submission form in the sales portal: business name, suggested slug, owner name, phone, email, pricing amount, billing cycle, setup fee, commission %, free trial toggle and duration. Creates a `leads` document with `status: 'pending'`. Broker immediately sees it in their Submissions list as Pending.

### Admin reviews

A "Leads" nav item in admin (with badge for pending count) surfaces all pending leads. Admin clicks into a lead, sees all fields editable inline. Admin can change any field — pricing, slug, commission %, anything. Then:

- **Approve** — runs existing `POST /admin/business` logic with the lead's (possibly edited) data. `brokerId` and `commissionPercent` from the lead are carried into the business document automatically. Business is created, Razorpay subscription + payment link generated. Lead `status` → `approved`.
- **Reject** — admin writes a short rejection reason. Lead `status` → `rejected`.

Approved and rejected leads remain visible in the list under filtered tabs for history.

### Broker sees the outcome

Lead status updates in their Submissions list. Approved leads show final details including admin edits. Rejected leads show the rejection reason.

### Broker referral lifecycle (mirrors the above)

Broker submits name, phone, email of a person they want to refer as a broker. Creates a `brokerReferrals` document with `status: 'pending'`. Admin sees it in the Leads page under the Broker Referrals sub-tab. Admin approves (creates broker account with `referredBy` pre-filled) or rejects with reason. Broker sees outcome in their Submissions → Brokers tab.

---

## Section 4 — Payout Flows

All three payout types are triggered from the `subscription.charged` webhook handler, running in sequence. Each step is a guard-gated function so a failure in one does not affect the others.

### Commission payout (fully automatic)

**Trigger:** `subscription.charged` webhook

**Guards:** `brokerId` exists on business + `commissionPayoutSent: false` + broker's `bankVerified: true`

**Amount:** `Math.round((commissionPercent / 100) * setupFee)`

**Action:** RazorpayX payout to broker's `razorpayFundAccountId`

**After:** Set `commissionPayoutSent: true`, `commissionPayoutId`, `commissionPayoutAmount` on business doc

Commission is on the one-time setup fee only. Recurring subscription payments do not generate commission.

### Streak bonus (fully automatic, same webhook)

Runs immediately after commission payout step.

**Deal count:** Query `businesses` where `brokerId = this broker` AND `commissionPayoutSent: true` AND `commissionPayoutSentAt` falls within the current calendar month, excluding the current business. Count + 1 = this broker's deal number for the month.

**Tier lookup:** Read `config/streak` tiers. Find the highest tier whose `fromDeal` is ≤ deal number. If none applies, no bonus.

**Action:** RazorpayX payout for `tier.bonusAmount`

**After:** Set `streakBonusSent: true`, `streakBonusAmount`, `streakBonusPayoutId` on business doc

Streak counts reset naturally each calendar month since the query is month-scoped.

### Referral bonus (manual, admin-triggered)

Runs as the third step in the same webhook.

**Check:** Is this broker's `referredBy` set? Is this their first ever deal (`commissionPayoutSent: true` count across all time, excluding current = 0)?

**If yes:** Set `referralBonusPending: true` on the business doc.

Admin sees a highlighted "Referral bonus owed to [Broker A name]" section on the business detail page. Admin enters the amount (₹500 minimum, ₹1000+ for large setup fees — admin judgment call) and clicks Pay.

**Action:** RazorpayX payout to Broker A's fund account

**After:** Set `referralBonusSent: true`, `referralBonusAmount`, `referralBonusPayoutId` on business doc

---

## Section 5 — sales.taplab.in Screens

New `sales/` Vite app in the monorepo. Reuses portal's Layout pattern — fixed sidebar on desktop, bottom tab bar on mobile. Four nav sections.

### Bank Verification (first-login gate)
Shown before any other route until `bankVerified: true`. Displays bank details entered by admin (account number and IFSC partially masked, UPI ID shown). Single confirm button. On confirm, backend creates RazorpayX Contact + Fund Account.

### Dashboard (home)
- This month: deals closed, commission earned, streak bonuses earned
- Streak progress indicator — e.g. "2 more deals this month to unlock ₹500 bonus"
- All-time: total deals, total earnings
- Quick action to submit a new lead

### Submissions
Two sub-tabs — Clients and Brokers.

- **Clients:** All business leads with status badges. Approved leads show final details including any admin edits. Rejected leads show rejection reason. Submit button at top.
- **Brokers:** All broker referral requests with status. Submit button at top.

### Leaderboard
- Monthly tab: all brokers ranked by deals closed this calendar month. Broker's own row highlighted.
- All-time tab: ranked by total deals ever closed.
- Shows real names — anonymising defeats the motivational purpose.

### Earnings
Full payout history — commission payouts, streak bonuses, referral bonuses — each as a line item with date, amount, and which business it relates to. Running total at the top.

---

## Section 6 — Admin Panel Additions

### New "Leads" nav item
Badge shows pending lead count. Sits between Alerts and Add Business in the sidebar.

### Leads page
Two sub-tabs — Client Leads and Broker Referrals.

**Client Leads:** Lists all leads with status filter tabs (Pending / Approved / Rejected). Click into a lead to edit any field inline and approve or reject. Approve runs existing business creation logic automatically — `brokerId` and `commissionPercent` carried over automatically. Reject requires a reason.

**Broker Referrals:** Lists all broker referral submissions. Approve opens broker creation form pre-filled with referral details and `referredBy` set. Reject requires a reason.

### Updated broker creation form
Adds: bank account number, IFSC, UPI ID fields. Adds `referredBy` combobox (reuses existing `BrokerCombobox` component).

### Updated broker detail page
- Bank details section (partially masked display)
- Bank verification status badge
- RazorpayX fund account status
- Existing deals, notes, and payout sections retained

### Updated business detail page
If `referralBonusPending: true`, shows a highlighted card — "Referral bonus owed to [Broker A name]". Admin enters amount, clicks Pay — triggers RazorpayX payout to Broker A.

### Streak configuration page
Simple settings page (or section within Overview) where admin sets tier thresholds and bonus amounts. Reads/writes `config/streak` in Firestore. Changes take effect immediately for subsequent webhook events.

---

## Section 7 — Backend Routes

### New `verifyBroker` middleware
Checks Firebase ID token for `broker: true` custom claim. Identical pattern to existing `verifyAdmin`.

### New `/broker` routes (protected by `verifyBroker`)

```
GET  /broker/me                          — own profile + bank verification status
POST /broker/verify-bank                 — confirm bank details, create RazorpayX Contact + Fund Account
GET  /broker/leads                       — own submitted leads
POST /broker/leads                       — submit new business lead
GET  /broker/leads/:id                   — single lead detail
GET  /broker/referrals                   — own submitted broker referrals
POST /broker/referrals                   — submit broker referral
GET  /broker/earnings                    — payout history across all their businesses
GET  /broker/leaderboard                 — all brokers ranked, monthly + all-time
GET  /broker/dashboard                   — summary stats for home screen
```

### New admin routes

```
GET    /admin/leads                               — all leads with status filter
PATCH  /admin/leads/:id                           — edit lead fields
POST   /admin/leads/:id/approve                   — create business from lead data
POST   /admin/leads/:id/reject                    — reject with reason
GET    /admin/broker-referrals                    — all broker referral requests
POST   /admin/broker-referrals/:id/approve        — create broker account
POST   /admin/broker-referrals/:id/reject         — reject with reason
POST   /admin/business/:slug/pay-referral-bonus   — trigger RazorpayX payout to referring broker
GET    /admin/config                              — fetch streak tier config
PUT    /admin/config                              — update streak config
```

### Updated webhook handler

`subscription.charged` handler updated to run three sequential steps:
1. Commission payout (guard-gated)
2. Streak bonus check and payout (guard-gated)
3. Referral bonus flag (guard-gated)

Each step fails silently and independently — one failure does not block the others.

### New `razorpayx.ts`

RazorpayX API client alongside existing `razorpay.ts`. Exports three functions: `createContact`, `createFundAccount`, `createPayout`.

### CORS fix

Add `PATCH` to the allowed methods list in `backend/src/index.ts` (existing bug — currently breaks broker notes saving).

---

## Out of Scope (for this phase)

- Broker editing their own contact info (name, phone, email) — admin-only for now
- Broker deleting their own leads after submission
- Automated referral bonus (stays manual admin-triggered by design)
- Multi-level referral chains (only one level: A refers B, B's first deal pays A)
