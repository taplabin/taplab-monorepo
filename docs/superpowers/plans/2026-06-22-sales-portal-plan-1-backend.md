# Sales Portal — Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add all backend infrastructure for the sales portal — RazorpayX payouts, broker auth middleware, lead management, streak/referral bonus logic, and new admin/broker routes.

**Architecture:** New `/broker` route prefix behind `verifyBroker` middleware (mirrors existing `/admin` + `verifyAdmin` pattern). Business creation logic extracted to a shared `createBusinessFromData()` function so lead approval can reuse it without duplication. Payout logic lives in `payouts.ts` and is called sequentially from the `subscription.charged` webhook handler.

**Tech Stack:** Fastify, TypeScript, Firestore (firebase-admin), Firebase Auth (firebase-admin/auth), RazorpayX REST API (native fetch), existing Razorpay npm package.

**New Railway env vars required:** `RAZORPAYX_KEY_ID`, `RAZORPAYX_KEY_SECRET`, `RAZORPAYX_ACCOUNT_NUMBER`

**Read first:** `backend/src/middleware/verifyAdmin.ts` and `backend/src/routes/webhook.ts` before starting Tasks 3 and 10.

---

## File Map

**Create:**
- `backend/src/middleware/verifyBroker.ts`
- `backend/src/razorpayx.ts`
- `backend/src/payouts.ts`
- `backend/src/routes/broker/index.ts`
- `backend/src/routes/admin/leads.ts`
- `backend/src/routes/admin/brokerReferrals.ts`
- `backend/src/routes/admin/config.ts`

**Modify:**
- `backend/src/types.ts` — new interfaces, updated BusinessDocument
- `backend/src/index.ts` — register routes, fix CORS PATCH
- `backend/src/routes/admin/brokers.ts` — update POST to create Firebase Auth + set broker claim
- `backend/src/routes/admin/business.ts` — extract createBusinessFromData(), add pay-referral-bonus
- `backend/src/routes/webhook.ts` — call payout handlers in subscription.charged

---

## Task 1: Fix CORS + update TypeScript types

**Files:**
- Modify: `backend/src/index.ts`
- Modify: `backend/src/types.ts`

- [ ] **Fix CORS in `backend/src/index.ts`** — find the methods array and add PATCH:

```typescript
// Before:
methods: ['GET', 'POST', 'PUT'],
// After:
methods: ['GET', 'POST', 'PUT', 'PATCH'],
```

- [ ] **Replace `backend/src/types.ts` entirely:**

```typescript
import { Timestamp } from 'firebase-admin/firestore';

export interface BusinessDocument {
  businessName: string;
  businessSlug: string;
  subscriptionStatus: 'active' | 'inactive' | 'cancelled';
  subscriptionEndsAt: Timestamp | null;
  freeTrialEnabled: boolean;
  trialStartDate: Timestamp | null;
  trialDurationDays: number;
  pricingAmount: number;
  billingCycle: 'monthly' | 'yearly';
  pageJsUrl: string | null;
  componentTagName: string | null;
  pageVersion: string | null;
  pageStatus: 'no_page' | 'deployed';
  lastDeployedAt: Timestamp | null;
  razorpaySubscriptionId: string | null;
  razorpayPaymentLink: string | null;
  setupFee: number | null;
  brokerId: string | null;
  brokerName: string | null;
  commissionPercent: number | null;
  commissionPaid: boolean;
  commissionPayoutSent: boolean;
  commissionPayoutId: string | null;
  commissionPayoutAmount: number | null;
  commissionPayoutSentAt: Timestamp | null;
  streakBonusSent: boolean;
  streakBonusAmount: number | null;
  streakBonusPayoutId: string | null;
  streakBonusSentAt: Timestamp | null;
  referralBonusPending: boolean;
  referralBonusAmount: number | null;
  referralBonusSent: boolean;
  referralBonusPayoutId: string | null;
  referralBonusSentAt: Timestamp | null;
  leadId: string | null;
  ownerEmail: string | null;
  ownerUid: string | null;
  content?: Record<string, string>;
  contentKeys?: string[];
  notes?: string;
  createdAt: Timestamp;
  contentUpdatedAt?: Timestamp;
}

export interface BrokerDocument {
  name: string;
  phone: string;
  email: string;
  notes?: string;
  ownerUid: string | null;
  referredBy: string | null;
  bankAccountNumber: string | null;
  bankIfsc: string | null;
  upiId: string | null;
  bankVerified: boolean;
  razorpayContactId: string | null;
  razorpayFundAccountId: string | null;
  createdAt: Timestamp;
}

export interface LeadDocument {
  brokerId: string;
  brokerName: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason: string | null;
  businessName: string;
  businessSlug: string;
  ownerName: string;
  ownerPhone: string;
  ownerEmail: string | null;
  pricingAmount: number;
  billingCycle: 'monthly' | 'yearly';
  setupFee: number;
  commissionPercent: number;
  freeTrialEnabled: boolean;
  trialDurationDays: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface BrokerReferralDocument {
  referringBrokerId: string;
  name: string;
  phone: string;
  email: string;
  status: 'pending' | 'converted' | 'rejected';
  rejectionReason?: string;
  createdAt: Timestamp;
}

export interface StreakTier {
  fromDeal: number;
  bonusAmount: number;
}

export interface StreakConfig {
  tiers: StreakTier[];
}

export interface WebhookEvent {
  eventType: string;
  subscriptionId: string;
  businessSlug: string | null;
  processedAt: Timestamp;
  rawPayload: object;
}
```

- [ ] **Verify TypeScript compiles:**
```bash
cd backend && npx tsc --noEmit
```
Expected: no errors

- [ ] **Commit:**
```bash
git add backend/src/index.ts backend/src/types.ts
git commit -m "fix: CORS PATCH + extend TypeScript types for sales portal"
```

---

## Task 2: RazorpayX client

**Files:**
- Create: `backend/src/razorpayx.ts`

- [ ] **Create `backend/src/razorpayx.ts`:**

```typescript
const BASE = 'https://api.razorpay.com/v1';

function auth(): string {
  const id = process.env.RAZORPAYX_KEY_ID;
  const secret = process.env.RAZORPAYX_KEY_SECRET;
  if (!id || !secret) throw new Error('RAZORPAYX_KEY_ID or RAZORPAYX_KEY_SECRET not set');
  return `Basic ${Buffer.from(`${id}:${secret}`).toString('base64')}`;
}

async function post(path: string, body: object): Promise<any> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: auth() },
    body: JSON.stringify(body),
  });
  const data = await res.json() as any;
  if (!res.ok) throw new Error(data?.error?.description ?? `RazorpayX ${res.status}`);
  return data;
}

export async function createContact(params: {
  name: string;
  email: string;
  referenceId: string;
}): Promise<string> {
  const data = await post('/contacts', {
    name: params.name,
    email: params.email,
    type: 'vendor',
    reference_id: params.referenceId,
  });
  return data.id;
}

export async function createFundAccount(params: {
  contactId: string;
  name: string;
  accountNumber: string;
  ifsc: string;
}): Promise<string> {
  const data = await post('/fund_accounts', {
    contact_id: params.contactId,
    account_type: 'bank_account',
    bank_account: { name: params.name, ifsc: params.ifsc, account_number: params.accountNumber },
  });
  return data.id;
}

export async function createPayout(params: {
  fundAccountId: string;
  amountInRupees: number;
  narration: string;
}): Promise<string> {
  const accountNumber = process.env.RAZORPAYX_ACCOUNT_NUMBER;
  if (!accountNumber) throw new Error('RAZORPAYX_ACCOUNT_NUMBER not set');
  const data = await post('/payouts', {
    account_number: accountNumber,
    fund_account_id: params.fundAccountId,
    amount: Math.round(params.amountInRupees * 100),
    currency: 'INR',
    mode: 'IMPS',
    purpose: 'payout',
    narration: params.narration,
  });
  return data.id;
}
```

- [ ] **Verify TypeScript compiles:**
```bash
npx tsc --noEmit
```

- [ ] **Commit:**
```bash
git add backend/src/razorpayx.ts
git commit -m "feat: RazorpayX client (createContact, createFundAccount, createPayout)"
```

---

## Task 3: verifyBroker middleware

**Files:**
- Create: `backend/src/middleware/verifyBroker.ts`

Read `backend/src/middleware/verifyAdmin.ts` first — this follows the same pattern but checks `broker: true` claim.

- [ ] **Create `backend/src/middleware/verifyBroker.ts`:**

```typescript
import { FastifyRequest, FastifyReply } from 'fastify';
import { getAuth } from 'firebase-admin/auth';
import { db } from '../firestore.js';

export async function verifyBroker(req: FastifyRequest, reply: FastifyReply) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return reply.status(401).send({ error: 'Unauthorized' });
  }
  try {
    const token = authHeader.slice(7);
    const decoded = await getAuth().verifyIdToken(token);
    if (!decoded.broker) {
      return reply.status(403).send({ error: 'Forbidden — broker access only' });
    }
    (req as any).brokerUid = decoded.uid;
  } catch {
    return reply.status(401).send({ error: 'Invalid token' });
  }
}

export async function getBrokerByUid(uid: string): Promise<({ id: string } & Record<string, any>) | null> {
  const snap = await db.collection('brokers').where('ownerUid', '==', uid).limit(1).get();
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() };
}
```

- [ ] **Verify TypeScript compiles:**
```bash
npx tsc --noEmit
```

- [ ] **Commit:**
```bash
git add backend/src/middleware/verifyBroker.ts
git commit -m "feat: verifyBroker middleware + getBrokerByUid helper"
```

---

## Task 4: Update broker creation route

**Files:**
- Modify: `backend/src/routes/admin/brokers.ts`

Update `POST /admin/brokers` to accept bank details + `referredBy`, create a Firebase Auth user with `broker: true` custom claim, and return an invite link. Email is now required.

- [ ] **Replace `backend/src/routes/admin/brokers.ts`:**

```typescript
import { FastifyInstance } from 'fastify';
import { getAuth } from 'firebase-admin/auth';
import { db } from '../../firestore.js';

export async function adminBrokerRoute(app: FastifyInstance) {
  app.get('/brokers', async (_req, reply) => {
    try {
      const snap = await db.collection('brokers').get();
      const brokers = snap.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .sort((a: any, b: any) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
      return reply.send({ brokers });
    } catch (err) {
      app.log.error(err);
      return reply.status(500).send({ error: 'Failed to fetch brokers' });
    }
  });

  app.post('/brokers', async (req, reply) => {
    const { name, phone, email, bankAccountNumber, bankIfsc, upiId, referredBy } = req.body as any;
    if (!name || !phone || !email) {
      return reply.status(400).send({ error: 'name, phone, and email are required' });
    }
    try {
      let ownerUid: string;
      try {
        const userRecord = await getAuth().createUser({ email });
        ownerUid = userRecord.uid;
      } catch (authError: any) {
        if (authError?.code === 'auth/email-already-exists') {
          ownerUid = (await getAuth().getUserByEmail(email)).uid;
        } else throw authError;
      }

      await getAuth().setCustomUserClaims(ownerUid, { broker: true });
      const inviteLink = await getAuth().generatePasswordResetLink(email);

      const ref = await db.collection('brokers').add({
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        ownerUid,
        referredBy: referredBy || null,
        bankAccountNumber: bankAccountNumber?.trim() || null,
        bankIfsc: bankIfsc?.trim() || null,
        upiId: upiId?.trim() || null,
        bankVerified: false,
        razorpayContactId: null,
        razorpayFundAccountId: null,
        createdAt: new Date(),
      });

      return reply.status(201).send({ id: ref.id, inviteLink });
    } catch (err: any) {
      app.log.error(err);
      return reply.status(500).send({ error: err.message ?? 'Failed to create broker' });
    }
  });

  app.patch<{ Params: { id: string } }>('/brokers/:id', async (req, reply) => {
    const { id } = req.params;
    const { notes } = req.body as { notes?: string };
    try {
      await db.collection('brokers').doc(id).update({ notes: notes ?? '' });
      return reply.send({ ok: true });
    } catch (err) {
      app.log.error(err);
      return reply.status(500).send({ error: 'Failed to update broker' });
    }
  });

  app.get<{ Params: { id: string } }>('/brokers/:id', async (req, reply) => {
    const { id } = req.params;
    try {
      const [brokerDoc, dealsSnap] = await Promise.all([
        db.collection('brokers').doc(id).get(),
        db.collection('businesses').where('brokerId', '==', id).get(),
      ]);
      if (!brokerDoc.exists) return reply.status(404).send({ error: 'Broker not found' });
      const deals = dealsSnap.docs
        .map((doc) => {
          const d = doc.data();
          return {
            slug: doc.id,
            businessName: d.businessName,
            setupFee: d.setupFee ?? null,
            commissionPercent: d.commissionPercent ?? null,
            commissionPaid: d.commissionPaid ?? false,
            commissionPayoutSent: d.commissionPayoutSent ?? false,
            subscriptionStatus: d.subscriptionStatus,
            createdAt: d.createdAt,
          };
        })
        .sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
      return reply.send({ id, ...brokerDoc.data(), deals });
    } catch (err) {
      app.log.error(err);
      return reply.status(500).send({ error: 'Failed to fetch broker' });
    }
  });
}
```

- [ ] **Verify TypeScript compiles:**
```bash
npx tsc --noEmit
```

- [ ] **Commit:**
```bash
git add backend/src/routes/admin/brokers.ts
git commit -m "feat: broker creation creates Firebase Auth user with broker:true claim"
```

---

## Task 5: Extract createBusinessFromData() + add pay-referral-bonus

**Files:**
- Modify: `backend/src/routes/admin/business.ts`

- [ ] **Add import at the top of `business.ts`:**

```typescript
import { createPayout } from '../../razorpayx.js';
```

- [ ] **Add the exported `createBusinessFromData` function** before the `adminBusinessRoute` function:

```typescript
export async function createBusinessFromData(data: {
  businessName: string;
  businessSlug: string;
  ownerEmail?: string;
  pricingAmount: number;
  billingCycle: 'monthly' | 'yearly';
  freeTrialEnabled?: boolean;
  trialDurationDays?: number;
  startAt?: number;
  setupFee?: number;
  brokerId?: string;
  commissionPercent?: number;
  leadId?: string;
}): Promise<{ slug: string; paymentLinkUrl: string; razorpaySubscriptionId: string; inviteLink: string | null }> {
  const { businessName, businessSlug, ownerEmail, pricingAmount, billingCycle,
    freeTrialEnabled, trialDurationDays, startAt, setupFee, brokerId, commissionPercent, leadId } = data;

  let brokerName: string | null = null;
  if (brokerId) {
    const brokerDoc = await db.collection('brokers').doc(brokerId).get();
    if (brokerDoc.exists) brokerName = (brokerDoc.data() as any).name ?? null;
  }

  const { razorpaySubscriptionId, paymentLinkUrl } = await createSubscriptionAndLink(
    businessName, pricingAmount, billingCycle, startAt,
    setupFee && setupFee > 0 ? setupFee : undefined
  );

  let ownerUid: string | null = null;
  let inviteLink: string | null = null;
  if (ownerEmail) {
    try {
      const userRecord = await getAuth().createUser({ email: ownerEmail });
      ownerUid = userRecord.uid;
      inviteLink = await getAuth().generatePasswordResetLink(ownerEmail);
    } catch (authError: any) {
      if (authError?.code === 'auth/email-already-exists') {
        const existing = await getAuth().getUserByEmail(ownerEmail);
        ownerUid = existing.uid;
        inviteLink = await getAuth().generatePasswordResetLink(ownerEmail);
      } else throw authError;
    }
  }

  await db.runTransaction(async (tx) => {
    const ref = db.collection('businesses').doc(businessSlug);
    const snap = await tx.get(ref);
    if (snap.exists) throw new Error(`Slug '${businessSlug}' is already taken`);

    const businessData: BusinessDocument = {
      businessName, businessSlug,
      ownerEmail: ownerEmail ?? null, ownerUid,
      subscriptionStatus: 'inactive', subscriptionEndsAt: null,
      freeTrialEnabled: freeTrialEnabled ?? false,
      trialStartDate: freeTrialEnabled ? new Date() as any : null,
      trialDurationDays: trialDurationDays ?? 7,
      pricingAmount, billingCycle,
      pageJsUrl: null, componentTagName: null, pageVersion: null,
      pageStatus: 'no_page', lastDeployedAt: null,
      razorpaySubscriptionId, razorpayPaymentLink: paymentLinkUrl,
      setupFee: setupFee && setupFee > 0 ? setupFee : null,
      brokerId: brokerId || null, brokerName,
      commissionPercent: brokerId && commissionPercent && commissionPercent > 0 ? commissionPercent : null,
      commissionPaid: false,
      commissionPayoutSent: false, commissionPayoutId: null, commissionPayoutAmount: null, commissionPayoutSentAt: null,
      streakBonusSent: false, streakBonusAmount: null, streakBonusPayoutId: null, streakBonusSentAt: null,
      referralBonusPending: false, referralBonusAmount: null,
      referralBonusSent: false, referralBonusPayoutId: null, referralBonusSentAt: null,
      leadId: leadId ?? null,
      createdAt: new Date() as any,
    };
    tx.set(ref, businessData);
  });

  return { slug: businessSlug, paymentLinkUrl, razorpaySubscriptionId, inviteLink };
}
```

- [ ] **Update `POST /admin/business` handler** to call `createBusinessFromData()`. Replace the entire try/catch block after validation with:

```typescript
try {
  const result = await createBusinessFromData({
    businessName, businessSlug, ownerEmail, pricingAmount, billingCycle,
    freeTrialEnabled, trialDurationDays, startAt: startAt ?? undefined,
    setupFee, brokerId, commissionPercent,
  });
  return reply.status(201).send({
    slug: result.slug,
    paymentLink: result.paymentLinkUrl,
    razorpaySubscriptionId: result.razorpaySubscriptionId,
    inviteLink: result.inviteLink,
  });
} catch (error: any) {
  const message = error?.message ?? JSON.stringify(error);
  if (message?.includes('already taken')) return reply.status(409).send({ error: message });
  app.log.error(error, 'Failed to create business');
  return reply.status(500).send({ error: 'Failed to create business', detail: message });
}
```

- [ ] **Add `POST /admin/business/:slug/pay-referral-bonus`** at the bottom of `adminBusinessRoute` (before the closing brace):

```typescript
app.post<{ Params: { slug: string } }>('/business/:slug/pay-referral-bonus', async (req, reply) => {
  const { slug } = req.params;
  const { amount } = req.body as { amount: number };
  if (!amount || amount <= 0) return reply.status(400).send({ error: 'amount must be > 0' });
  try {
    const ref = db.collection('businesses').doc(slug);
    const doc = await ref.get();
    if (!doc.exists) return reply.status(404).send({ error: 'Business not found' });
    const biz = doc.data() as any;
    if (!biz.referralBonusPending) return reply.status(400).send({ error: 'No referral bonus pending' });
    if (biz.referralBonusSent) return reply.status(400).send({ error: 'Referral bonus already sent' });

    const brokerBDoc = await db.collection('brokers').doc(biz.brokerId).get();
    if (!brokerBDoc.exists) return reply.status(404).send({ error: 'Broker not found' });
    const brokerB = brokerBDoc.data() as any;
    if (!brokerB.referredBy) return reply.status(400).send({ error: 'Broker was not referred by anyone' });

    const brokerADoc = await db.collection('brokers').doc(brokerB.referredBy).get();
    if (!brokerADoc.exists) return reply.status(404).send({ error: 'Referring broker not found' });
    const brokerA = brokerADoc.data() as any;
    if (!brokerA.razorpayFundAccountId) return reply.status(400).send({ error: 'Referring broker has no verified bank account' });

    const payoutId = await createPayout({
      fundAccountId: brokerA.razorpayFundAccountId,
      amountInRupees: amount,
      narration: `Referral bonus for ${biz.businessName}`,
    });

    await ref.update({
      referralBonusPending: false, referralBonusAmount: amount,
      referralBonusSent: true, referralBonusPayoutId: payoutId, referralBonusSentAt: new Date(),
    });

    return reply.send({ ok: true, payoutId });
  } catch (err: any) {
    app.log.error(err);
    return reply.status(500).send({ error: err.message ?? 'Failed to send referral bonus' });
  }
});
```

- [ ] **Verify TypeScript compiles:**
```bash
npx tsc --noEmit
```

- [ ] **Commit:**
```bash
git add backend/src/routes/admin/business.ts
git commit -m "feat: extract createBusinessFromData(), add pay-referral-bonus route"
```

---

## Task 6: Admin leads routes

**Files:**
- Create: `backend/src/routes/admin/leads.ts`

- [ ] **Create `backend/src/routes/admin/leads.ts`:**

```typescript
import { FastifyInstance } from 'fastify';
import { db } from '../../firestore.js';
import { LeadDocument } from '../../types.js';
import { createBusinessFromData } from './business.js';

export async function adminLeadsRoute(app: FastifyInstance) {
  app.get('/leads', async (req, reply) => {
    const { status } = req.query as { status?: string };
    try {
      let q = db.collection('leads').orderBy('createdAt', 'desc') as any;
      if (status) q = db.collection('leads').where('status', '==', status).orderBy('createdAt', 'desc');
      const snap = await q.get();
      return reply.send({ leads: snap.docs.map((d: any) => ({ id: d.id, ...d.data() })) });
    } catch (err) {
      app.log.error(err);
      return reply.status(500).send({ error: 'Failed to fetch leads' });
    }
  });

  app.get<{ Params: { id: string } }>('/leads/:id', async (req, reply) => {
    const { id } = req.params;
    try {
      const doc = await db.collection('leads').doc(id).get();
      if (!doc.exists) return reply.status(404).send({ error: 'Lead not found' });
      return reply.send({ id, ...doc.data() });
    } catch (err) {
      app.log.error(err);
      return reply.status(500).send({ error: 'Failed to fetch lead' });
    }
  });

  app.patch<{ Params: { id: string } }>('/leads/:id', async (req, reply) => {
    const { id } = req.params;
    const updates = req.body as Partial<LeadDocument>;
    delete (updates as any).status;
    delete (updates as any).brokerId;
    delete (updates as any).brokerName;
    delete (updates as any).createdAt;
    try {
      const doc = await db.collection('leads').doc(id).get();
      if (!doc.exists) return reply.status(404).send({ error: 'Lead not found' });
      if ((doc.data() as any).status !== 'pending') return reply.status(400).send({ error: 'Can only edit pending leads' });
      await db.collection('leads').doc(id).update({ ...updates, updatedAt: new Date() });
      return reply.send({ ok: true });
    } catch (err) {
      app.log.error(err);
      return reply.status(500).send({ error: 'Failed to update lead' });
    }
  });

  app.post<{ Params: { id: string } }>('/leads/:id/approve', async (req, reply) => {
    const { id } = req.params;
    try {
      const doc = await db.collection('leads').doc(id).get();
      if (!doc.exists) return reply.status(404).send({ error: 'Lead not found' });
      const lead = doc.data() as LeadDocument;
      if (lead.status !== 'pending') return reply.status(400).send({ error: 'Lead is not pending' });
      if (!/^[a-z0-9_]+$/.test(lead.businessSlug)) {
        return reply.status(400).send({ error: 'Slug must be lowercase letters, numbers, and underscores only' });
      }

      const result = await createBusinessFromData({
        businessName: lead.businessName,
        businessSlug: lead.businessSlug,
        ownerEmail: lead.ownerEmail ?? undefined,
        pricingAmount: lead.pricingAmount,
        billingCycle: lead.billingCycle,
        freeTrialEnabled: lead.freeTrialEnabled,
        trialDurationDays: lead.trialDurationDays,
        setupFee: lead.setupFee,
        brokerId: lead.brokerId,
        commissionPercent: lead.commissionPercent,
        leadId: id,
      });

      await db.collection('leads').doc(id).update({ status: 'approved', updatedAt: new Date() });

      return reply.send({ slug: result.slug, paymentLink: result.paymentLinkUrl, inviteLink: result.inviteLink });
    } catch (err: any) {
      app.log.error(err);
      const message = err?.message ?? 'Failed to approve lead';
      if (message.includes('already taken')) return reply.status(409).send({ error: message });
      return reply.status(500).send({ error: message });
    }
  });

  app.post<{ Params: { id: string } }>('/leads/:id/reject', async (req, reply) => {
    const { id } = req.params;
    const { reason } = req.body as { reason?: string };
    if (!reason?.trim()) return reply.status(400).send({ error: 'reason is required' });
    try {
      const doc = await db.collection('leads').doc(id).get();
      if (!doc.exists) return reply.status(404).send({ error: 'Lead not found' });
      if ((doc.data() as any).status !== 'pending') return reply.status(400).send({ error: 'Lead is not pending' });
      await db.collection('leads').doc(id).update({ status: 'rejected', rejectionReason: reason.trim(), updatedAt: new Date() });
      return reply.send({ ok: true });
    } catch (err) {
      app.log.error(err);
      return reply.status(500).send({ error: 'Failed to reject lead' });
    }
  });
}
```

- [ ] **Verify TypeScript compiles:**
```bash
npx tsc --noEmit
```

- [ ] **Commit:**
```bash
git add backend/src/routes/admin/leads.ts
git commit -m "feat: admin leads routes (list, get, edit, approve, reject)"
```

---

## Task 7: Admin broker referrals + config routes

**Files:**
- Create: `backend/src/routes/admin/brokerReferrals.ts`
- Create: `backend/src/routes/admin/config.ts`

- [ ] **Create `backend/src/routes/admin/brokerReferrals.ts`:**

```typescript
import { FastifyInstance } from 'fastify';
import { getAuth } from 'firebase-admin/auth';
import { db } from '../../firestore.js';

export async function adminBrokerReferralsRoute(app: FastifyInstance) {
  app.get('/broker-referrals', async (req, reply) => {
    const { status } = req.query as { status?: string };
    try {
      let q = db.collection('brokerReferrals').orderBy('createdAt', 'desc') as any;
      if (status) q = db.collection('brokerReferrals').where('status', '==', status).orderBy('createdAt', 'desc');
      const snap = await q.get();
      return reply.send({ referrals: snap.docs.map((d: any) => ({ id: d.id, ...d.data() })) });
    } catch (err) {
      app.log.error(err);
      return reply.status(500).send({ error: 'Failed to fetch referrals' });
    }
  });

  app.post<{ Params: { id: string } }>('/broker-referrals/:id/approve', async (req, reply) => {
    const { id } = req.params;
    const { bankAccountNumber, bankIfsc, upiId } = req.body as any;
    try {
      const doc = await db.collection('brokerReferrals').doc(id).get();
      if (!doc.exists) return reply.status(404).send({ error: 'Referral not found' });
      const referral = doc.data() as any;
      if (referral.status !== 'pending') return reply.status(400).send({ error: 'Referral is not pending' });

      let ownerUid: string;
      try {
        ownerUid = (await getAuth().createUser({ email: referral.email })).uid;
      } catch (e: any) {
        if (e?.code === 'auth/email-already-exists') {
          ownerUid = (await getAuth().getUserByEmail(referral.email)).uid;
        } else throw e;
      }

      await getAuth().setCustomUserClaims(ownerUid, { broker: true });
      const inviteLink = await getAuth().generatePasswordResetLink(referral.email);

      const brokerRef = await db.collection('brokers').add({
        name: referral.name, phone: referral.phone, email: referral.email,
        ownerUid, referredBy: referral.referringBrokerId,
        bankAccountNumber: bankAccountNumber?.trim() || null,
        bankIfsc: bankIfsc?.trim() || null,
        upiId: upiId?.trim() || null,
        bankVerified: false, razorpayContactId: null, razorpayFundAccountId: null,
        createdAt: new Date(),
      });

      await db.collection('brokerReferrals').doc(id).update({ status: 'converted' });
      return reply.send({ brokerId: brokerRef.id, inviteLink });
    } catch (err: any) {
      app.log.error(err);
      return reply.status(500).send({ error: err.message ?? 'Failed to approve referral' });
    }
  });

  app.post<{ Params: { id: string } }>('/broker-referrals/:id/reject', async (req, reply) => {
    const { id } = req.params;
    const { reason } = req.body as { reason?: string };
    if (!reason?.trim()) return reply.status(400).send({ error: 'reason is required' });
    try {
      const doc = await db.collection('brokerReferrals').doc(id).get();
      if (!doc.exists) return reply.status(404).send({ error: 'Referral not found' });
      await db.collection('brokerReferrals').doc(id).update({ status: 'rejected', rejectionReason: reason.trim() });
      return reply.send({ ok: true });
    } catch (err) {
      app.log.error(err);
      return reply.status(500).send({ error: 'Failed to reject referral' });
    }
  });
}
```

- [ ] **Create `backend/src/routes/admin/config.ts`:**

```typescript
import { FastifyInstance } from 'fastify';
import { db } from '../../firestore.js';
import { StreakConfig } from '../../types.js';

const DEFAULT_CONFIG: StreakConfig = {
  tiers: [
    { fromDeal: 6, bonusAmount: 500 },
    { fromDeal: 11, bonusAmount: 1000 },
    { fromDeal: 16, bonusAmount: 1500 },
  ],
};

export async function adminConfigRoute(app: FastifyInstance) {
  app.get('/config', async (_req, reply) => {
    try {
      const doc = await db.doc('config/streak').get();
      if (!doc.exists) {
        await db.doc('config/streak').set(DEFAULT_CONFIG);
        return reply.send(DEFAULT_CONFIG);
      }
      return reply.send(doc.data());
    } catch (err) {
      app.log.error(err);
      return reply.status(500).send({ error: 'Failed to fetch config' });
    }
  });

  app.put('/config', async (req, reply) => {
    const { tiers } = req.body as StreakConfig;
    if (!Array.isArray(tiers) || tiers.some((t) => typeof t.fromDeal !== 'number' || typeof t.bonusAmount !== 'number')) {
      return reply.status(400).send({ error: 'tiers must be an array of { fromDeal: number, bonusAmount: number }' });
    }
    const sorted = [...tiers].sort((a, b) => a.fromDeal - b.fromDeal);
    try {
      await db.doc('config/streak').set({ tiers: sorted });
      return reply.send({ tiers: sorted });
    } catch (err) {
      app.log.error(err);
      return reply.status(500).send({ error: 'Failed to update config' });
    }
  });
}
```

- [ ] **Verify TypeScript compiles:**
```bash
npx tsc --noEmit
```

- [ ] **Commit:**
```bash
git add backend/src/routes/admin/brokerReferrals.ts backend/src/routes/admin/config.ts
git commit -m "feat: admin broker referrals + streak config routes"
```

---

## Task 8: Broker routes

**Files:**
- Create: `backend/src/routes/broker/index.ts`

- [ ] **Create `backend/src/routes/broker/index.ts`:**

```typescript
import { FastifyInstance } from 'fastify';
import { db } from '../../firestore.js';
import { getBrokerByUid } from '../../middleware/verifyBroker.js';
import { createContact, createFundAccount } from '../../razorpayx.js';

export async function brokerRoute(app: FastifyInstance) {
  app.get('/me', async (req, reply) => {
    const uid = (req as any).brokerUid;
    try {
      const broker = await getBrokerByUid(uid);
      if (!broker) return reply.status(404).send({ error: 'Broker not found' });
      return reply.send({
        ...broker,
        bankAccountNumber: broker.bankAccountNumber ? `****${String(broker.bankAccountNumber).slice(-4)}` : null,
      });
    } catch (err) {
      app.log.error(err);
      return reply.status(500).send({ error: 'Failed to fetch profile' });
    }
  });

  app.post('/verify-bank', async (req, reply) => {
    const uid = (req as any).brokerUid;
    try {
      const broker = await getBrokerByUid(uid);
      if (!broker) return reply.status(404).send({ error: 'Broker not found' });
      if (broker.bankVerified) return reply.send({ ok: true, alreadyVerified: true });
      if (!broker.bankAccountNumber || !broker.bankIfsc) {
        return reply.status(400).send({ error: 'Bank details not set — contact admin' });
      }
      const contactId = await createContact({ name: broker.name, email: broker.email, referenceId: broker.id });
      const fundAccountId = await createFundAccount({
        contactId, name: broker.name, accountNumber: broker.bankAccountNumber, ifsc: broker.bankIfsc,
      });
      await db.collection('brokers').doc(broker.id).update({
        bankVerified: true, razorpayContactId: contactId, razorpayFundAccountId: fundAccountId,
      });
      return reply.send({ ok: true });
    } catch (err: any) {
      app.log.error(err);
      return reply.status(500).send({ error: err.message ?? 'Failed to verify bank' });
    }
  });

  app.get('/leads', async (req, reply) => {
    const uid = (req as any).brokerUid;
    try {
      const broker = await getBrokerByUid(uid);
      if (!broker) return reply.status(404).send({ error: 'Broker not found' });
      const snap = await db.collection('leads').where('brokerId', '==', broker.id).orderBy('createdAt', 'desc').get();
      return reply.send({ leads: snap.docs.map((d) => ({ id: d.id, ...d.data() })) });
    } catch (err) { app.log.error(err); return reply.status(500).send({ error: 'Failed to fetch leads' }); }
  });

  app.post('/leads', async (req, reply) => {
    const uid = (req as any).brokerUid;
    const { businessName, businessSlug, ownerName, ownerPhone, ownerEmail,
      pricingAmount, billingCycle, setupFee, commissionPercent, freeTrialEnabled, trialDurationDays } = req.body as any;
    if (!businessName || !businessSlug || !ownerName || !ownerPhone || !pricingAmount || !billingCycle || setupFee == null || commissionPercent == null) {
      return reply.status(400).send({ error: 'Missing required fields' });
    }
    if (!/^[a-z0-9_]+$/.test(businessSlug)) return reply.status(400).send({ error: 'Invalid slug format' });
    try {
      const broker = await getBrokerByUid(uid);
      if (!broker) return reply.status(404).send({ error: 'Broker not found' });
      const ref = await db.collection('leads').add({
        brokerId: broker.id, brokerName: broker.name, status: 'pending', rejectionReason: null,
        businessName: businessName.trim(), businessSlug: businessSlug.trim(),
        ownerName: ownerName.trim(), ownerPhone: ownerPhone.trim(),
        ownerEmail: ownerEmail?.trim() || null,
        pricingAmount: Number(pricingAmount), billingCycle,
        setupFee: Number(setupFee), commissionPercent: Number(commissionPercent),
        freeTrialEnabled: Boolean(freeTrialEnabled), trialDurationDays: Number(trialDurationDays) || 7,
        createdAt: new Date(), updatedAt: new Date(),
      });
      return reply.status(201).send({ id: ref.id });
    } catch (err) { app.log.error(err); return reply.status(500).send({ error: 'Failed to submit lead' }); }
  });

  app.get<{ Params: { id: string } }>('/leads/:id', async (req, reply) => {
    const uid = (req as any).brokerUid;
    const { id } = req.params;
    try {
      const broker = await getBrokerByUid(uid);
      if (!broker) return reply.status(404).send({ error: 'Broker not found' });
      const doc = await db.collection('leads').doc(id).get();
      if (!doc.exists) return reply.status(404).send({ error: 'Lead not found' });
      if ((doc.data() as any).brokerId !== broker.id) return reply.status(403).send({ error: 'Forbidden' });
      return reply.send({ id, ...doc.data() });
    } catch (err) { app.log.error(err); return reply.status(500).send({ error: 'Failed to fetch lead' }); }
  });

  app.get('/referrals', async (req, reply) => {
    const uid = (req as any).brokerUid;
    try {
      const broker = await getBrokerByUid(uid);
      if (!broker) return reply.status(404).send({ error: 'Broker not found' });
      const snap = await db.collection('brokerReferrals').where('referringBrokerId', '==', broker.id).orderBy('createdAt', 'desc').get();
      return reply.send({ referrals: snap.docs.map((d) => ({ id: d.id, ...d.data() })) });
    } catch (err) { app.log.error(err); return reply.status(500).send({ error: 'Failed to fetch referrals' }); }
  });

  app.post('/referrals', async (req, reply) => {
    const uid = (req as any).brokerUid;
    const { name, phone, email } = req.body as any;
    if (!name || !phone || !email) return reply.status(400).send({ error: 'name, phone, email required' });
    try {
      const broker = await getBrokerByUid(uid);
      if (!broker) return reply.status(404).send({ error: 'Broker not found' });
      const ref = await db.collection('brokerReferrals').add({
        referringBrokerId: broker.id, name: name.trim(), phone: phone.trim(), email: email.trim(),
        status: 'pending', createdAt: new Date(),
      });
      return reply.status(201).send({ id: ref.id });
    } catch (err) { app.log.error(err); return reply.status(500).send({ error: 'Failed to submit referral' }); }
  });

  app.get('/earnings', async (req, reply) => {
    const uid = (req as any).brokerUid;
    try {
      const broker = await getBrokerByUid(uid);
      if (!broker) return reply.status(404).send({ error: 'Broker not found' });
      const snap = await db.collection('businesses')
        .where('brokerId', '==', broker.id)
        .where('commissionPayoutSent', '==', true)
        .orderBy('commissionPayoutSentAt', 'desc')
        .get();
      const earnings = snap.docs.map((doc) => {
        const d = doc.data() as any;
        return {
          slug: doc.id, businessName: d.businessName,
          commissionAmount: d.commissionPayoutAmount, commissionPaidAt: d.commissionPayoutSentAt,
          streakBonus: d.streakBonusSent ? d.streakBonusAmount : null,
          streakBonusPaidAt: d.streakBonusSentAt ?? null,
        };
      });
      const totalEarnings = earnings.reduce((s, e) => s + (e.commissionAmount ?? 0) + (e.streakBonus ?? 0), 0);
      return reply.send({ earnings, totalEarnings });
    } catch (err) { app.log.error(err); return reply.status(500).send({ error: 'Failed to fetch earnings' }); }
  });

  app.get('/leaderboard', async (_req, reply) => {
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const [brokersSnap, allDealsSnap, monthlySnap] = await Promise.all([
        db.collection('brokers').get(),
        db.collection('businesses').where('commissionPayoutSent', '==', true).get(),
        db.collection('businesses').where('commissionPayoutSent', '==', true).where('commissionPayoutSentAt', '>=', startOfMonth).get(),
      ]);
      const nameMap = new Map(brokersSnap.docs.map((d) => [d.id, (d.data() as any).name]));
      const allTime = new Map<string, number>();
      allDealsSnap.docs.forEach((d) => { const b = (d.data() as any).brokerId; if (b) allTime.set(b, (allTime.get(b) ?? 0) + 1); });
      const monthly = new Map<string, number>();
      monthlySnap.docs.forEach((d) => { const b = (d.data() as any).brokerId; if (b) monthly.set(b, (monthly.get(b) ?? 0) + 1); });
      const ids = Array.from(new Set([...allTime.keys(), ...monthly.keys()]));
      const rows = ids.map((id) => ({ brokerId: id, name: nameMap.get(id) ?? 'Unknown', dealsThisMonth: monthly.get(id) ?? 0, dealsAllTime: allTime.get(id) ?? 0 }));
      return reply.send({
        monthly: [...rows].sort((a, b) => b.dealsThisMonth - a.dealsThisMonth),
        allTime: [...rows].sort((a, b) => b.dealsAllTime - a.dealsAllTime),
      });
    } catch (err) { app.log.error(err); return reply.status(500).send({ error: 'Failed to fetch leaderboard' }); }
  });

  app.get('/dashboard', async (req, reply) => {
    const uid = (req as any).brokerUid;
    try {
      const broker = await getBrokerByUid(uid);
      if (!broker) return reply.status(404).send({ error: 'Broker not found' });
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const [allDeals, monthlyDeals, pendingLeads, configDoc] = await Promise.all([
        db.collection('businesses').where('brokerId', '==', broker.id).where('commissionPayoutSent', '==', true).get(),
        db.collection('businesses').where('brokerId', '==', broker.id).where('commissionPayoutSent', '==', true).where('commissionPayoutSentAt', '>=', startOfMonth).get(),
        db.collection('leads').where('brokerId', '==', broker.id).where('status', '==', 'pending').get(),
        db.doc('config/streak').get(),
      ]);
      const tiers: any[] = configDoc.exists ? (configDoc.data() as any).tiers : [{ fromDeal: 6, bonusAmount: 500 }, { fromDeal: 11, bonusAmount: 1000 }, { fromDeal: 16, bonusAmount: 1500 }];
      const dealsThisMonth = monthlyDeals.size;
      const commissionThisMonth = monthlyDeals.docs.reduce((s, d) => s + ((d.data() as any).commissionPayoutAmount ?? 0), 0);
      const streakBonusThisMonth = monthlyDeals.docs.reduce((s, d) => { const x = d.data() as any; return s + (x.streakBonusSent ? (x.streakBonusAmount ?? 0) : 0); }, 0);
      const nextTier = [...tiers].sort((a, b) => a.fromDeal - b.fromDeal).find((t) => t.fromDeal > dealsThisMonth) ?? null;
      return reply.send({
        dealsThisMonth, commissionThisMonth, streakBonusThisMonth,
        nextTier: nextTier ? { fromDeal: nextTier.fromDeal, bonusAmount: nextTier.bonusAmount, dealsNeeded: nextTier.fromDeal - dealsThisMonth } : null,
        pendingLeadsCount: pendingLeads.size,
        allTimeDeals: allDeals.size,
        allTimeEarnings: allDeals.docs.reduce((s, d) => { const x = d.data() as any; return s + (x.commissionPayoutAmount ?? 0) + (x.streakBonusSent ? (x.streakBonusAmount ?? 0) : 0); }, 0),
      });
    } catch (err) { app.log.error(err); return reply.status(500).send({ error: 'Failed to fetch dashboard' }); }
  });
}
```

- [ ] **Verify TypeScript compiles:**
```bash
npx tsc --noEmit
```

- [ ] **Commit:**
```bash
git add backend/src/routes/broker/index.ts
git commit -m "feat: all broker routes (me, verify-bank, leads, referrals, earnings, leaderboard, dashboard)"
```

---

## Task 9: Payout handlers + webhook update

**Files:**
- Create: `backend/src/payouts.ts`
- Modify: `backend/src/routes/webhook.ts`

Read `backend/src/routes/webhook.ts` before editing — find exactly where `subscription.charged` sets `subscriptionStatus: 'active'` and add payout calls right after that `ref.update(...)` call.

- [ ] **Create `backend/src/payouts.ts`:**

```typescript
import { db } from './firestore.js';
import { createPayout } from './razorpayx.js';
import { StreakConfig } from './types.js';
import type { FastifyBaseLogger } from 'fastify';

export async function handleCommissionPayout(slug: string, biz: any, log: FastifyBaseLogger): Promise<void> {
  if (!biz.brokerId || biz.commissionPayoutSent || !biz.setupFee || !biz.commissionPercent) return;
  const brokerDoc = await db.collection('brokers').doc(biz.brokerId).get();
  if (!brokerDoc.exists) return;
  const broker = brokerDoc.data() as any;
  if (!broker.bankVerified || !broker.razorpayFundAccountId) return;
  const amount = Math.round((biz.commissionPercent / 100) * biz.setupFee);
  if (amount <= 0) return;
  try {
    const payoutId = await createPayout({ fundAccountId: broker.razorpayFundAccountId, amountInRupees: amount, narration: `Commission for ${biz.businessName}` });
    await db.collection('businesses').doc(slug).update({
      commissionPayoutSent: true, commissionPayoutId: payoutId, commissionPayoutAmount: amount, commissionPayoutSentAt: new Date(),
    });
  } catch (err) { log.error({ err, slug }, 'Commission payout failed'); }
}

export async function handleStreakBonus(slug: string, biz: any, log: FastifyBaseLogger): Promise<void> {
  if (!biz.brokerId || biz.streakBonusSent || !biz.commissionPayoutSent) return;
  const brokerDoc = await db.collection('brokers').doc(biz.brokerId).get();
  if (!brokerDoc.exists) return;
  const broker = brokerDoc.data() as any;
  if (!broker.bankVerified || !broker.razorpayFundAccountId) return;
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  const dealsSnap = await db.collection('businesses')
    .where('brokerId', '==', biz.brokerId)
    .where('commissionPayoutSent', '==', true)
    .where('commissionPayoutSentAt', '>=', startOfMonth)
    .where('commissionPayoutSentAt', '<=', endOfMonth)
    .get();
  const dealNumber = dealsSnap.size;
  const configDoc = await db.doc('config/streak').get();
  const tiers: StreakConfig['tiers'] = configDoc.exists ? (configDoc.data() as StreakConfig).tiers : [{ fromDeal: 6, bonusAmount: 500 }, { fromDeal: 11, bonusAmount: 1000 }, { fromDeal: 16, bonusAmount: 1500 }];
  const tier = [...tiers].sort((a, b) => b.fromDeal - a.fromDeal).find((t) => dealNumber >= t.fromDeal);
  if (!tier) return;
  try {
    const payoutId = await createPayout({ fundAccountId: broker.razorpayFundAccountId, amountInRupees: tier.bonusAmount, narration: `Streak bonus deal #${dealNumber} — ${biz.businessName}` });
    await db.collection('businesses').doc(slug).update({
      streakBonusSent: true, streakBonusAmount: tier.bonusAmount, streakBonusPayoutId: payoutId, streakBonusSentAt: new Date(),
    });
  } catch (err) { log.error({ err, slug }, 'Streak bonus payout failed'); }
}

export async function handleReferralFlag(slug: string, biz: any, log: FastifyBaseLogger): Promise<void> {
  if (!biz.brokerId || biz.referralBonusPending || biz.referralBonusSent) return;
  const brokerDoc = await db.collection('brokers').doc(biz.brokerId).get();
  if (!brokerDoc.exists) return;
  const broker = brokerDoc.data() as any;
  if (!broker.referredBy) return;
  const prev = await db.collection('businesses').where('brokerId', '==', biz.brokerId).where('commissionPayoutSent', '==', true).get();
  // prev.size includes current business (already updated), so first deal = size 1
  if (prev.size !== 1) return;
  try {
    await db.collection('businesses').doc(slug).update({ referralBonusPending: true });
  } catch (err) { log.error({ err, slug }, 'Failed to flag referral bonus'); }
}
```

- [ ] **Update `backend/src/routes/webhook.ts`** — add imports at the top:

```typescript
import { handleCommissionPayout, handleStreakBonus, handleReferralFlag } from '../payouts.js';
```

- [ ] **In the `subscription.charged` handler**, after the `await ref.update({ subscriptionStatus: 'active', ... })` call, add:

```typescript
// Reload business data after status update, then run payout pipeline
const freshDoc = await ref.get();
if (freshDoc.exists) {
  const freshData = freshDoc.data()!;
  await handleCommissionPayout(businessSlug, freshData, app.log);
  const afterCommission = (await ref.get()).data()!;
  await handleStreakBonus(businessSlug, afterCommission, app.log);
  const afterStreak = (await ref.get()).data()!;
  await handleReferralFlag(businessSlug, afterStreak, app.log);
}
```

Note: `businessSlug` and `ref` are whatever the existing handler uses to identify the business — match those variable names exactly.

- [ ] **Verify TypeScript compiles:**
```bash
npx tsc --noEmit
```

- [ ] **Commit:**
```bash
git add backend/src/payouts.ts backend/src/routes/webhook.ts
git commit -m "feat: commission, streak, and referral payout handlers in webhook"
```

---

## Task 10: Wire all new routes in index.ts

**Files:**
- Modify: `backend/src/index.ts`

- [ ] **Add imports at the top of `backend/src/index.ts`** (after existing imports):

```typescript
import { adminLeadsRoute } from './routes/admin/leads.js';
import { adminBrokerReferralsRoute } from './routes/admin/brokerReferrals.js';
import { adminConfigRoute } from './routes/admin/config.js';
import { brokerRoute } from './routes/broker/index.js';
import { verifyBroker } from './middleware/verifyBroker.js';
```

- [ ] **Inside the existing admin block**, add three lines after `adminStorageRoute`:

```typescript
await adminApp.register(adminLeadsRoute);
await adminApp.register(adminBrokerReferralsRoute);
await adminApp.register(adminConfigRoute);
```

- [ ] **After the admin block**, add broker block:

```typescript
await app.register(async (brokerApp) => {
  brokerApp.addHook('preHandler', verifyBroker);
  await brokerApp.register(brokerRoute);
}, { prefix: '/broker' });
```

- [ ] **Start the server and smoke test:**
```bash
npm run dev
```
```bash
curl http://localhost:3000/health
# Expected: {"ok":true}

curl http://localhost:3000/broker/me
# Expected: {"error":"Unauthorized"}

curl http://localhost:3000/admin/leads
# Expected: {"error":"Unauthorized"}
```

- [ ] **Verify TypeScript compiles:**
```bash
npx tsc --noEmit
```

- [ ] **Commit:**
```bash
git add backend/src/index.ts
git commit -m "feat: register broker routes + new admin routes in index.ts"
```

---

## Firestore Indexes to Create

Go to Firebase Console → Firestore → Indexes → Composite → Add index for each:

1. `businesses`: `brokerId ASC`, `commissionPayoutSent ASC`, `commissionPayoutSentAt ASC`
2. `businesses`: `brokerId ASC`, `commissionPayoutSent ASC`
3. `leads`: `brokerId ASC`, `createdAt DESC`
4. `leads`: `status ASC`, `createdAt DESC`
5. `brokerReferrals`: `referringBrokerId ASC`, `createdAt DESC`
6. `brokerReferrals`: `status ASC`, `createdAt DESC`

Alternatively, deploy and watch Railway logs — Firestore will print direct index-creation links when queries first run.
