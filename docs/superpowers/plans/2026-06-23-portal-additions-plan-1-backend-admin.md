# Portal Additions — Plan 1: Backend + Admin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add backend routes and admin UI for broker profiles, broker feedback wall, and customer feedback — supporting the sales portal and customer portal additions in Plan 2.

**Architecture:** New Firestore collections (`brokerFeedback`, `customerFeedback`). New fields on `brokers` collection (`bio`, `city`, `photoUrl`). New backend routes under `/broker` and `/portal` prefixes. Admin panel gets two new pages: Broker Feedback and Customer Feedback. Profile photo uploads go to R2 at `https://media.taplab.in/pfps/{brokerId}`.

**Tech Stack:** Fastify + TypeScript, Firestore, Firebase Admin SDK, existing R2 upload pattern from `backend/src/routes/admin/storage.ts`, React + Vite + Tailwind in admin.

**Read first:**
- `backend/src/index.ts` — route registration pattern
- `backend/src/routes/admin/storage.ts` — R2 upload pattern to reuse
- `backend/src/routes/broker/index.ts` — existing broker route patterns
- `backend/src/types.ts` — existing interfaces
- `admin/src/App.tsx` — route registration
- `admin/src/components/Layout.tsx` — nav registration

---

## File Map

**New files:**
- `backend/src/routes/broker/profile.ts` — broker profile GET/PATCH + photo upload
- `backend/src/routes/broker/feedback.ts` — broker feedback wall CRUD + votes
- `backend/src/routes/portal/feedback.ts` — customer feedback POST + GET own
- `backend/src/routes/portal/index.ts` — portal route aggregator (new, currently portal routes are inline)
- `admin/src/pages/BrokerFeedback.tsx` — admin view of broker feedback wall
- `admin/src/pages/CustomerFeedback.tsx` — admin view of customer feedback

**Modified files:**
- `backend/src/types.ts` — new interfaces: BrokerFeedbackDocument, CustomerFeedbackDocument, updated BrokerDocument
- `backend/src/routes/broker/index.ts` — register profile + feedback sub-routes
- `backend/src/index.ts` — register portal feedback route, add DELETE to CORS
- `backend/src/routes/portal.ts` — add GET /portal/feedback + POST /portal/feedback
- `admin/src/App.tsx` — add /broker-feedback and /customer-feedback routes
- `admin/src/components/Layout.tsx` — add Broker Feedback + Customer Feedback nav items

---

## Task 1: Update types.ts with new interfaces

**Files:**
- Modify: `backend/src/types.ts`

- [ ] **Add new fields to BrokerDocument** — open `backend/src/types.ts` and add `bio`, `city`, `photoUrl` after `createdAt`:

```typescript
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
  bio: string | null;
  city: string | null;
  photoUrl: string | null;
  createdAt: Timestamp;
}
```

- [ ] **Add BrokerFeedbackDocument interface** after BrokerDocument:

```typescript
export interface BrokerFeedbackDocument {
  brokerId: string;
  brokerName: string;
  brokerPhotoUrl: string | null;
  content: string;
  tag: 'Suggestion' | 'Complaint' | 'Question' | 'Win';
  upvotes: number;
  downvotes: number;
  status: 'open' | 'under_review' | 'implemented' | 'wont_fix';
  adminReply: string | null;
  createdAt: Timestamp;
  weekKey: string; // format: "2026-W25" — used for one-per-week enforcement
}
```

- [ ] **Add CustomerFeedbackDocument interface**:

```typescript
export interface CustomerFeedbackDocument {
  businessSlug: string;
  businessName: string;
  ownerUid: string;
  content: string;
  createdAt: Timestamp;
}
```

- [ ] **Build to verify no TypeScript errors:**
```bash
cd backend && npm run build
```
Expected: clean build

- [ ] **Commit:**
```bash
git add backend/src/types.ts
git commit -m "feat: add BrokerFeedbackDocument, CustomerFeedbackDocument, broker bio/city/photoUrl types"
```

---

## Task 2: Broker profile route (GET own profile, PATCH bio/city, upload photo)

**Files:**
- Create: `backend/src/routes/broker/profile.ts`

R2 upload pattern: read `backend/src/routes/admin/storage.ts` to understand how files are uploaded to R2 — it uses `@aws-sdk/client-s3` with `PutObjectCommand`. Reuse that exact pattern. The bucket is `taplab-media`, key is `pfps/{brokerId}`, public URL is `https://media.taplab.in/pfps/{brokerId}`.

- [ ] **Create `backend/src/routes/broker/profile.ts`:**

```typescript
import { FastifyInstance } from 'fastify';
import { db } from '../../firestore.js';
import { getBrokerByUid } from '../../middleware/verifyBroker.js';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const s3 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT!,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

export async function brokerProfileRoute(app: FastifyInstance) {
  // GET /broker/profile/:id — public profile for any broker (used by team page + leaderboard click)
  app.get('/profile/:id', async (req, reply) => {
    try {
      const { id } = req.params as { id: string };
      const doc = await db.collection('brokers').doc(id).get();
      if (!doc.exists) return reply.status(404).send({ error: 'Broker not found' });
      const data = doc.data()!;
      // Get deal stats
      const allTimeSnap = await db.collection('businesses')
        .where('brokerId', '==', id)
        .where('commissionPayoutSent', '==', true)
        .get();
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthDeals = allTimeSnap.docs.filter(d => {
        const ts = d.data().commissionPayoutSentAt;
        return ts && ts.toDate() >= monthStart;
      }).length;
      return reply.send({
        id: doc.id,
        name: data.name,
        city: data.city ?? null,
        bio: data.bio ?? null,
        photoUrl: data.photoUrl ?? null,
        dealsThisMonth: monthDeals,
        dealsAllTime: allTimeSnap.size,
        createdAt: data.createdAt,
      });
    } catch (err) {
      app.log.error(err);
      return reply.status(500).send({ error: 'Failed to fetch profile' });
    }
  });

  // PATCH /broker/profile — update own bio + city
  app.patch('/profile', async (req, reply) => {
    const uid = (req as any).brokerUid;
    try {
      const broker = await getBrokerByUid(uid);
      if (!broker) return reply.status(404).send({ error: 'Broker not found' });
      const { bio, city } = req.body as { bio?: string; city?: string };
      const updates: Record<string, any> = {};
      if (bio !== undefined) updates.bio = bio.slice(0, 300);
      if (city !== undefined) updates.city = city.slice(0, 100);
      if (Object.keys(updates).length === 0) return reply.send({ ok: true });
      await db.collection('brokers').doc(broker.id).update(updates);
      return reply.send({ ok: true });
    } catch (err) {
      app.log.error(err);
      return reply.status(500).send({ error: 'Failed to update profile' });
    }
  });

  // POST /broker/profile/photo — upload profile photo to R2
  app.post('/profile/photo', async (req, reply) => {
    const uid = (req as any).brokerUid;
    try {
      const broker = await getBrokerByUid(uid);
      if (!broker) return reply.status(404).send({ error: 'Broker not found' });
      const data = await req.file();
      if (!data) return reply.status(400).send({ error: 'No file uploaded' });
      const allowed = ['image/jpeg', 'image/png', 'image/webp'];
      if (!allowed.includes(data.mimetype)) {
        return reply.status(400).send({ error: 'Only JPEG, PNG, or WebP images allowed' });
      }
      const buffer = await data.toBuffer();
      if (buffer.length > 2 * 1024 * 1024) {
        return reply.status(400).send({ error: 'Image must be under 2MB' });
      }
      const key = `pfps/${broker.id}`;
      await s3.send(new PutObjectCommand({
        Bucket: 'taplab-media',
        Key: key,
        Body: buffer,
        ContentType: data.mimetype,
        CacheControl: 'no-cache',
      }));
      const photoUrl = `https://media.taplab.in/${key}`;
      await db.collection('brokers').doc(broker.id).update({ photoUrl });
      return reply.send({ ok: true, photoUrl });
    } catch (err: any) {
      app.log.error(err);
      return reply.status(500).send({ error: err.message ?? 'Upload failed' });
    }
  });

  // GET /broker/team — all brokers for team page
  app.get('/team', async (_req, reply) => {
    try {
      const snap = await db.collection('brokers').orderBy('createdAt', 'asc').get();
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const brokers = await Promise.all(snap.docs.map(async (doc) => {
        const data = doc.data();
        const dealsSnap = await db.collection('businesses')
          .where('brokerId', '==', doc.id)
          .where('commissionPayoutSent', '==', true)
          .get();
        const monthDeals = dealsSnap.docs.filter(d => {
          const ts = d.data().commissionPayoutSentAt;
          return ts && ts.toDate() >= monthStart;
        }).length;
        return {
          id: doc.id,
          name: data.name,
          city: data.city ?? null,
          photoUrl: data.photoUrl ?? null,
          dealsThisMonth: monthDeals,
          dealsAllTime: dealsSnap.size,
        };
      }));
      return reply.send({ brokers });
    } catch (err) {
      app.log.error(err);
      return reply.status(500).send({ error: 'Failed to fetch team' });
    }
  });
}
```

- [ ] **Register `@fastify/multipart`** — check if it's already in `backend/package.json`. If not:
```bash
cd backend && npm install @fastify/multipart
```
Then register it in `backend/src/index.ts` after the rate limit registration:
```typescript
import multipart from '@fastify/multipart';
// ...
await app.register(multipart, { limits: { fileSize: 2 * 1024 * 1024 } });
```

- [ ] **Register profile route in `backend/src/routes/broker/index.ts`** — add at the top of the file:
```typescript
import { brokerProfileRoute } from './profile.js';
// Inside brokerRoute function, at the top:
await app.register(brokerProfileRoute);
```

- [ ] **Build:**
```bash
cd backend && npm run build
```
Expected: clean build

- [ ] **Commit:**
```bash
git add backend/src/routes/broker/profile.ts backend/src/routes/broker/index.ts backend/src/index.ts backend/package.json
git commit -m "feat: broker profile routes (GET own, PATCH bio/city, photo upload, team list)"
```

---

## Task 3: Broker feedback wall route

**Files:**
- Create: `backend/src/routes/broker/feedback.ts`

One feedback per broker per week enforced via `weekKey` field (format: `"2026-W25"`). Upvotes/downvotes tracked in a subcollection `brokerFeedback/{id}/votes/{brokerId}` with `{ vote: 1 | -1 }`.

- [ ] **Create `backend/src/routes/broker/feedback.ts`:**

```typescript
import { FastifyInstance } from 'fastify';
import { db } from '../../firestore.js';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getBrokerByUid } from '../../middleware/verifyBroker.js';

function getWeekKey(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

const VALID_TAGS = ['Suggestion', 'Complaint', 'Question', 'Win'];

export async function brokerFeedbackRoute(app: FastifyInstance) {
  // GET /broker/feedback — all feedback sorted by (upvotes - downvotes) desc
  app.get('/feedback', async (_req, reply) => {
    try {
      const snap = await db.collection('brokerFeedback').orderBy('createdAt', 'desc').get();
      const items = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Sort by net votes descending
      items.sort((a: any, b: any) => (b.upvotes - b.downvotes) - (a.upvotes - a.downvotes));
      return reply.send({ feedback: items });
    } catch (err) {
      app.log.error(err);
      return reply.status(500).send({ error: 'Failed to fetch feedback' });
    }
  });

  // POST /broker/feedback — submit new feedback (one per broker per week)
  app.post('/feedback', async (req, reply) => {
    const uid = (req as any).brokerUid;
    try {
      const broker = await getBrokerByUid(uid);
      if (!broker) return reply.status(404).send({ error: 'Broker not found' });
      const { content, tag } = req.body as { content: string; tag: string };
      if (!content || content.trim().length < 10) {
        return reply.status(400).send({ error: 'Feedback must be at least 10 characters' });
      }
      if (!VALID_TAGS.includes(tag)) {
        return reply.status(400).send({ error: `Tag must be one of: ${VALID_TAGS.join(', ')}` });
      }
      const weekKey = getWeekKey(new Date());
      // Check one-per-week limit
      const existing = await db.collection('brokerFeedback')
        .where('brokerId', '==', broker.id)
        .where('weekKey', '==', weekKey)
        .limit(1)
        .get();
      if (!existing.empty) {
        return reply.status(429).send({ error: 'You can only submit one feedback per week' });
      }
      const ref = db.collection('brokerFeedback').doc();
      await ref.set({
        brokerId: broker.id,
        brokerName: broker.name,
        brokerPhotoUrl: (broker as any).photoUrl ?? null,
        content: content.trim().slice(0, 1000),
        tag,
        upvotes: 0,
        downvotes: 0,
        status: 'open',
        adminReply: null,
        weekKey,
        createdAt: Timestamp.now(),
      });
      return reply.status(201).send({ id: ref.id });
    } catch (err: any) {
      app.log.error(err);
      return reply.status(500).send({ error: err.message ?? 'Failed to submit feedback' });
    }
  });

  // POST /broker/feedback/:id/vote — upvote or downvote
  app.post('/feedback/:id/vote', async (req, reply) => {
    const uid = (req as any).brokerUid;
    try {
      const broker = await getBrokerByUid(uid);
      if (!broker) return reply.status(404).send({ error: 'Broker not found' });
      const { id } = req.params as { id: string };
      const { vote } = req.body as { vote: 1 | -1 };
      if (vote !== 1 && vote !== -1) return reply.status(400).send({ error: 'vote must be 1 or -1' });
      const feedbackRef = db.collection('brokerFeedback').doc(id);
      const voteRef = feedbackRef.collection('votes').doc(broker.id);
      const existing = await voteRef.get();
      await db.runTransaction(async (tx) => {
        if (existing.exists) {
          const prev = existing.data()!.vote as 1 | -1;
          if (prev === vote) {
            // Remove vote
            tx.delete(voteRef);
            tx.update(feedbackRef, {
              [vote === 1 ? 'upvotes' : 'downvotes']: FieldValue.increment(-1),
            });
          } else {
            // Switch vote
            tx.set(voteRef, { vote });
            tx.update(feedbackRef, {
              [vote === 1 ? 'upvotes' : 'downvotes']: FieldValue.increment(1),
              [vote === 1 ? 'downvotes' : 'upvotes']: FieldValue.increment(-1),
            });
          }
        } else {
          tx.set(voteRef, { vote });
          tx.update(feedbackRef, {
            [vote === 1 ? 'upvotes' : 'downvotes']: FieldValue.increment(1),
          });
        }
      });
      return reply.send({ ok: true });
    } catch (err) {
      app.log.error(err);
      return reply.status(500).send({ error: 'Failed to record vote' });
    }
  });

  // GET /broker/feedback/my-vote/:id — check if current broker voted on an item
  app.get('/feedback/my-vote/:id', async (req, reply) => {
    const uid = (req as any).brokerUid;
    try {
      const broker = await getBrokerByUid(uid);
      if (!broker) return reply.status(404).send({ error: 'Broker not found' });
      const { id } = req.params as { id: string };
      const voteDoc = await db.collection('brokerFeedback').doc(id).collection('votes').doc(broker.id).get();
      return reply.send({ vote: voteDoc.exists ? voteDoc.data()!.vote : null });
    } catch (err) {
      app.log.error(err);
      return reply.status(500).send({ error: 'Failed to fetch vote' });
    }
  });
}
```

- [ ] **Register feedback route in `backend/src/routes/broker/index.ts`:**
```typescript
import { brokerFeedbackRoute } from './feedback.js';
// Inside brokerRoute function:
await app.register(brokerFeedbackRoute);
```

- [ ] **Build:**
```bash
cd backend && npm run build
```

- [ ] **Commit:**
```bash
git add backend/src/routes/broker/feedback.ts backend/src/routes/broker/index.ts
git commit -m "feat: broker feedback wall routes with one-per-week limit and upvote/downvote"
```

---

## Task 4: Admin routes for feedback management

**Files:**
- Modify: `backend/src/routes/admin/brokers.ts` — add GET /admin/brokers/feedback, PATCH /admin/broker-feedback/:id

Admin needs to:
1. See all broker feedback with tag/status filtering
2. Post a reply to any feedback item
3. Change status (open → under_review → implemented / wont_fix)

- [ ] **Add to `backend/src/routes/admin/brokers.ts`** — append these routes inside the `adminBrokerRoute` function:

```typescript
  // GET /admin/broker-feedback — all broker feedback
  app.get('/broker-feedback', async (req, reply) => {
    try {
      const { status, tag } = req.query as { status?: string; tag?: string };
      let query: any = db.collection('brokerFeedback').orderBy('createdAt', 'desc');
      const snap = await query.get();
      let items = snap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
      if (status) items = items.filter((i: any) => i.status === status);
      if (tag) items = items.filter((i: any) => i.tag === tag);
      items.sort((a: any, b: any) => (b.upvotes - b.downvotes) - (a.upvotes - a.downvotes));
      return reply.send({ feedback: items });
    } catch (err) {
      app.log.error(err);
      return reply.status(500).send({ error: 'Failed to fetch feedback' });
    }
  });

  // PATCH /admin/broker-feedback/:id — update status and/or reply
  app.patch('/broker-feedback/:id', async (req, reply) => {
    try {
      const { id } = req.params as { id: string };
      const { status, adminReply } = req.body as { status?: string; adminReply?: string };
      const VALID_STATUSES = ['open', 'under_review', 'implemented', 'wont_fix'];
      const updates: Record<string, any> = {};
      if (status) {
        if (!VALID_STATUSES.includes(status)) return reply.status(400).send({ error: 'Invalid status' });
        updates.status = status;
      }
      if (adminReply !== undefined) updates.adminReply = adminReply.slice(0, 500);
      if (Object.keys(updates).length === 0) return reply.send({ ok: true });
      await db.collection('brokerFeedback').doc(id).update(updates);
      return reply.send({ ok: true });
    } catch (err) {
      app.log.error(err);
      return reply.status(500).send({ error: 'Failed to update feedback' });
    }
  });
```

- [ ] **Build:**
```bash
cd backend && npm run build
```

- [ ] **Commit:**
```bash
git add backend/src/routes/admin/brokers.ts
git commit -m "feat: admin broker feedback management routes (list, status, reply)"
```

---

## Task 5: Customer feedback route

**Files:**
- Modify: `backend/src/routes/portal.ts`

Customers are authenticated portal users. Their businessSlug and ownerUid are known from the portal auth flow. POST creates feedback, GET returns their own submissions.

- [ ] **Read `backend/src/routes/portal.ts`** to find the `verifyPortal` middleware and existing route structure, then add these two routes inside the existing `portalRoute` function:

```typescript
  // POST /portal/feedback — submit customer feedback
  app.post('/feedback', async (req, reply) => {
    try {
      const uid = (req as any).portalUid; // set by existing verifyPortal middleware
      const slug = (req as any).portalSlug; // set by existing verifyPortal middleware
      const { content } = req.body as { content: string };
      if (!content || content.trim().length < 10) {
        return reply.status(400).send({ error: 'Feedback must be at least 10 characters' });
      }
      // Get business name for denormalization
      const bizDoc = await db.collection('businesses').doc(slug).get();
      const businessName = bizDoc.exists ? bizDoc.data()!.businessName : slug;
      const ref = db.collection('customerFeedback').doc();
      await ref.set({
        businessSlug: slug,
        businessName,
        ownerUid: uid,
        content: content.trim().slice(0, 2000),
        createdAt: Timestamp.now(),
      });
      return reply.status(201).send({ id: ref.id });
    } catch (err) {
      app.log.error(err);
      return reply.status(500).send({ error: 'Failed to submit feedback' });
    }
  });

  // GET /portal/feedback — get own feedback submissions
  app.get('/feedback', async (req, reply) => {
    try {
      const uid = (req as any).portalUid;
      const snap = await db.collection('customerFeedback')
        .where('ownerUid', '==', uid)
        .orderBy('createdAt', 'desc')
        .get();
      return reply.send({ feedback: snap.docs.map(d => ({ id: d.id, ...d.data() })) });
    } catch (err) {
      app.log.error(err);
      return reply.status(500).send({ error: 'Failed to fetch feedback' });
    }
  });
```

**Important:** First read `backend/src/routes/portal.ts` to confirm the exact variable names for `portalUid` and `portalSlug` as set by the middleware. Use those exact names.

- [ ] **Add customer feedback admin route** to `backend/src/routes/admin/business.ts` — append inside `adminBusinessRoute`:

```typescript
  // GET /admin/customer-feedback — all customer feedback
  app.get('/customer-feedback', async (_req, reply) => {
    try {
      const snap = await db.collection('customerFeedback').orderBy('createdAt', 'desc').get();
      return reply.send({ feedback: snap.docs.map(d => ({ id: d.id, ...d.data() })) });
    } catch (err) {
      app.log.error(err);
      return reply.status(500).send({ error: 'Failed to fetch customer feedback' });
    }
  });
```

- [ ] **Build:**
```bash
cd backend && npm run build
```

- [ ] **Commit:**
```bash
git add backend/src/routes/portal.ts backend/src/routes/admin/business.ts
git commit -m "feat: customer feedback POST/GET routes + admin list endpoint"
```

---

## Task 6: Admin pages — Broker Feedback + Customer Feedback

**Files:**
- Create: `admin/src/pages/BrokerFeedback.tsx`
- Create: `admin/src/pages/CustomerFeedback.tsx`
- Modify: `admin/src/App.tsx`
- Modify: `admin/src/components/Layout.tsx`

- [ ] **Create `admin/src/pages/BrokerFeedback.tsx`:**

```typescript
import { useState } from 'react';
import useSWR from 'swr';
import { adminFetch } from '../lib/api';
import Layout from '../components/Layout';
import { useToast } from '../components/Toast';

const TAGS = ['All', 'Suggestion', 'Complaint', 'Question', 'Win'];
const STATUSES = ['open', 'under_review', 'implemented', 'wont_fix'];
const STATUS_LABELS: Record<string, string> = {
  open: 'Open', under_review: 'Under Review', implemented: 'Implemented', wont_fix: "Won't Fix",
};
const STATUS_COLORS: Record<string, string> = {
  open: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400',
  under_review: 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400',
  implemented: 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400',
  wont_fix: 'bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400',
};
const TAG_COLORS: Record<string, string> = {
  Suggestion: 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400',
  Complaint: 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400',
  Question: 'bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400',
  Win: 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400',
};

export default function BrokerFeedback() {
  const toast = useToast();
  const [tagFilter, setTagFilter] = useState('All');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [replyDraft, setReplyDraft] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);

  const { data, mutate } = useSWR('/admin/broker-feedback', async (url) => {
    const res = await adminFetch(url);
    return (await res.json()).feedback as any[];
  });

  const filtered = data
    ? tagFilter === 'All' ? data : data.filter((f: any) => f.tag === tagFilter)
    : null;

  const update = async (id: string, updates: object) => {
    setSaving(id);
    try {
      const res = await adminFetch(`/admin/broker-feedback/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast('Updated');
      mutate();
    } catch (err: any) {
      toast(err.message || 'Failed', 'error');
    } finally {
      setSaving(null);
    }
  };

  return (
    <Layout>
      <div className="max-w-3xl space-y-5">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Broker Feedback</h1>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">Suggestions, complaints, and wins from the sales team</p>
        </div>

        {/* Tag filter */}
        <div className="flex gap-2 flex-wrap">
          {TAGS.map((t) => (
            <button
              key={t}
              onClick={() => setTagFilter(t)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                tagFilter === t ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {!filtered ? (
            [1, 2, 3].map((i) => <div key={i} className="h-20 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />)
          ) : filtered.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 py-8 text-center">No feedback yet.</p>
          ) : filtered.map((item: any) => (
            <div key={item.id} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${TAG_COLORS[item.tag] ?? ''}`}>{item.tag}</span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[item.status]}`}>{STATUS_LABELS[item.status]}</span>
                    <span className="text-xs text-gray-400 dark:text-gray-500">{item.brokerName}</span>
                  </div>
                  <p className="text-sm text-gray-800 dark:text-gray-200">{item.content}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-xs text-gray-400">👍 {item.upvotes}</span>
                    <span className="text-xs text-gray-400">👎 {item.downvotes}</span>
                    <span className="text-xs text-gray-400">Net: {item.upvotes - item.downvotes}</span>
                  </div>
                  {item.adminReply && (
                    <div className="mt-3 pl-3 border-l-2 border-indigo-300 dark:border-indigo-700">
                      <p className="text-xs text-indigo-700 dark:text-indigo-400">{item.adminReply}</p>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex-shrink-0"
                >
                  {expandedId === item.id ? 'Close' : 'Manage'}
                </button>
              </div>

              {expandedId === item.id && (
                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Status</label>
                    <div className="flex gap-2 flex-wrap">
                      {STATUSES.map((s) => (
                        <button
                          key={s}
                          onClick={() => update(item.id, { status: s })}
                          disabled={saving === item.id}
                          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                            item.status === s ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200'
                          }`}
                        >
                          {STATUS_LABELS[s]}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Reply</label>
                    <textarea
                      value={replyDraft[item.id] ?? item.adminReply ?? ''}
                      onChange={(e) => setReplyDraft({ ...replyDraft, [item.id]: e.target.value })}
                      rows={2}
                      className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Write a reply visible to all brokers…"
                    />
                    <button
                      onClick={() => update(item.id, { adminReply: replyDraft[item.id] ?? item.adminReply ?? '' })}
                      disabled={saving === item.id}
                      className="mt-1.5 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-lg disabled:opacity-50 transition-colors"
                    >
                      {saving === item.id ? 'Saving…' : 'Save Reply'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
```

- [ ] **Create `admin/src/pages/CustomerFeedback.tsx`:**

```typescript
import useSWR from 'swr';
import { adminFetch } from '../lib/api';
import Layout from '../components/Layout';

export default function CustomerFeedback() {
  const { data } = useSWR('/admin/customer-feedback', async (url) => {
    const res = await adminFetch(url);
    return (await res.json()).feedback as any[];
  });

  function formatDate(ts: { seconds: number } | null): string {
    if (!ts) return '—';
    return new Date(ts.seconds * 1000).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  return (
    <Layout>
      <div className="max-w-3xl space-y-5">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Customer Feedback</h1>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">Private feedback submitted by portal customers</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          {!data ? (
            [1, 2, 3].map((i) => (
              <div key={i} className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 animate-pulse">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-2" />
                <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-3/4" />
              </div>
            ))
          ) : data.length === 0 ? (
            <div className="px-5 py-12 text-center"><p className="text-sm text-gray-500 dark:text-gray-400">No customer feedback yet.</p></div>
          ) : data.map((item: any) => (
            <div key={item.id} className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 last:border-0">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">{item.businessName}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500">{formatDate(item.createdAt)}</p>
              </div>
              <p className="text-sm text-gray-800 dark:text-gray-200">{item.content}</p>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
```

- [ ] **Add routes to `admin/src/App.tsx`** — add imports and routes:

```typescript
import BrokerFeedback from './pages/BrokerFeedback';
import CustomerFeedback from './pages/CustomerFeedback';
// Inside Routes:
<Route path="/broker-feedback"   element={<BrokerFeedback />} />
<Route path="/customer-feedback" element={<CustomerFeedback />} />
```

- [ ] **Add nav items to `admin/src/components/Layout.tsx`** — add after the Streak Config entry:

```typescript
  {
    to: '/broker-feedback',
    label: 'Broker Feedback',
    icon: (
      <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
  },
  {
    to: '/customer-feedback',
    label: 'Customer Feedback',
    icon: (
      <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
      </svg>
    ),
  },
```

- [ ] **Build admin:**
```bash
cd admin && npm run build
```
Expected: clean build

- [ ] **Commit:**
```bash
git add admin/src/pages/BrokerFeedback.tsx admin/src/pages/CustomerFeedback.tsx admin/src/App.tsx admin/src/components/Layout.tsx
git commit -m "feat: admin Broker Feedback + Customer Feedback pages"
```

---

## Self-Review

**Spec coverage:**
- ✅ Broker profile (bio, city, photo via R2) — Tasks 1 + 2
- ✅ Team listing endpoint — Task 2 (GET /broker/team)
- ✅ Broker feedback wall, one-per-week, upvotes/downvotes — Task 3
- ✅ Tags (Suggestion/Complaint/Question/Win) — Task 3
- ✅ Admin reply + status badge on feedback — Tasks 4 + 6
- ✅ Customer feedback POST + GET own — Task 5
- ✅ Admin sees all customer feedback — Task 5 + 6
- ✅ Admin sees all broker feedback, can filter, reply, change status — Tasks 4 + 6

**Type consistency check:**
- `BrokerFeedbackDocument.status` values match exactly between types.ts, broker/feedback.ts, and BrokerFeedback.tsx
- `weekKey` format `"2026-W25"` used consistently
- `photoUrl` field name consistent across types, profile route, and feedback route
