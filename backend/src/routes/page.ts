import { FastifyInstance } from 'fastify';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue } from 'firebase-admin/firestore';
import { db } from '../firestore.js';
import { BusinessDocument } from '../types.js';

export async function pageRoute(app: FastifyInstance) {
  // Public endpoint — returns the editable content map for a page
  app.get<{ Params: { slug: string } }>('/page/:slug/content', async (req, reply) => {
    const { slug } = req.params;

    reply.header('Access-Control-Allow-Origin', '*');
    reply.header('Cache-Control', 'public, max-age=30');

    const doc = await db.collection('businesses').doc(slug).get();

    if (!doc.exists) {
      return reply.status(404).send({ error: 'Not found' });
    }

    const content = (doc.data() as BusinessDocument).content ?? {};

    // Fire-and-forget — don't delay the response
    doc.ref.update({ pageViews: FieldValue.increment(1) }).catch(() => {});

    return reply.send(content);
  });

  // Owner-authenticated endpoint — update editable content for a page
  app.put<{ Params: { slug: string } }>('/page/:slug/content', async (req, reply) => {
    const { slug } = req.params;

    // Verify Firebase token
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return reply.status(401).send({ error: 'Missing authorization header' });
    }

    let uid: string;
    try {
      const decoded = await getAuth().verifyIdToken(authHeader.slice(7));
      uid = decoded.uid;
    } catch {
      return reply.status(401).send({ error: 'Invalid or expired token' });
    }

    // Verify ownership
    const doc = await db.collection('businesses').doc(slug).get();
    if (!doc.exists) {
      return reply.status(404).send({ error: 'Not found' });
    }

    const biz = doc.data() as BusinessDocument;
    if (biz.ownerUid !== uid) {
      return reply.status(403).send({ error: 'Forbidden' });
    }

    const updates = req.body as Record<string, string>;
    await doc.ref.update({ content: updates, contentUpdatedAt: new Date() });

    return reply.send({ ok: true });
  });

  app.get<{ Params: { businessSlug: string } }>(
    '/page/:businessSlug',
    async (req, reply) => {
      const { businessSlug } = req.params;

      reply.header('Access-Control-Allow-Origin', '*');
      reply.header('Cache-Control', 'public, max-age=60');

      const doc = await db.collection('businesses').doc(businessSlug).get();

      if (!doc.exists) {
        return reply.status(404).send({ status: 'inactive' });
      }

      const biz = doc.data() as BusinessDocument;

      const isActive = checkIsActive(biz);

      if (!isActive || biz.pageStatus !== 'deployed') {
        return reply.send({ status: 'inactive' });
      }

      return reply.send({
        status: 'active',
        jsUrl: biz.pageJsUrl,
        componentTagName: biz.componentTagName,
      });
    }
  );
}

function checkIsActive(biz: BusinessDocument): boolean {
  if (biz.subscriptionStatus === 'active') return true;

  // Cancelled but still within paid period — keep page live
  if (biz.subscriptionStatus === 'cancelled' && biz.subscriptionEndsAt) {
    const endsAt = biz.subscriptionEndsAt instanceof Date
      ? biz.subscriptionEndsAt
      : (biz.subscriptionEndsAt as any).toDate();
    if (Date.now() < endsAt.getTime()) return true;
  }

  // Free trial
  if (biz.freeTrialEnabled === true && biz.trialStartDate !== null) {
    const trialEndTime =
      biz.trialStartDate.toDate().getTime() +
      biz.trialDurationDays * 24 * 60 * 60 * 1000;
    if (Date.now() < trialEndTime) return true;
  }

  return false;
}
