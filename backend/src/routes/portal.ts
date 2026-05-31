import { FastifyInstance } from 'fastify';
import { getAuth } from 'firebase-admin/auth';
import { db } from '../firestore.js';
import { BusinessDocument } from '../types.js';
import { razorpay } from '../razorpay.js';

async function verifyPortalToken(authHeader: string | undefined): Promise<string> {
  if (!authHeader?.startsWith('Bearer ')) throw new Error('unauthorized');
  const decoded = await getAuth().verifyIdToken(authHeader.slice(7));
  return decoded.uid;
}

async function getBusinessByUid(uid: string): Promise<BusinessDocument | null> {
  const snapshot = await db.collection('businesses').where('ownerUid', '==', uid).limit(1).get();
  if (snapshot.empty) return null;
  return snapshot.docs[0].data() as BusinessDocument;
}

export async function portalRoute(app: FastifyInstance) {
  app.get('/portal/me', async (req, reply) => {
    let uid: string;
    try {
      uid = await verifyPortalToken(req.headers.authorization);
    } catch {
      return reply.status(401).send({ error: 'Invalid or expired token' });
    }

    const biz = await getBusinessByUid(uid);
    if (!biz) return reply.status(404).send({ error: 'No business found for this account' });

    return reply.send({
      slug: biz.businessSlug,
      businessName: biz.businessName,
      subscriptionStatus: biz.subscriptionStatus,
      subscriptionEndsAt: biz.subscriptionEndsAt ?? null,
      freeTrialEnabled: biz.freeTrialEnabled,
      trialStartDate: biz.trialStartDate ?? null,
      trialDurationDays: biz.trialDurationDays,
      pricingAmount: biz.pricingAmount,
      billingCycle: biz.billingCycle,
      pageStatus: biz.pageStatus,
      razorpayPaymentLink: biz.razorpayPaymentLink,
      content: biz.content ?? {},
      contentKeys: biz.contentKeys ?? Object.keys(biz.content ?? {}),
    });
  });

  app.get('/portal/billing', async (req, reply) => {
    let uid: string;
    try {
      uid = await verifyPortalToken(req.headers.authorization);
    } catch {
      return reply.status(401).send({ error: 'Invalid or expired token' });
    }

    const biz = await getBusinessByUid(uid);
    if (!biz) return reply.status(404).send({ error: 'No business found for this account' });

    const plan = { amount: biz.pricingAmount, cycle: biz.billingCycle };

    if (!razorpay || !biz.razorpaySubscriptionId) {
      return reply.send({ plan, subscription: null, invoices: [] });
    }

    try {
      const [sub, invoicesRes] = await Promise.all([
        razorpay.subscriptions.fetch(biz.razorpaySubscriptionId) as any,
        razorpay.invoices.all({ subscription_id: biz.razorpaySubscriptionId, count: 20 }) as any,
      ]);

      return reply.send({
        plan,
        subscription: {
          status: sub.status,
          currentEnd: sub.current_end,
          paidCount: sub.paid_count,
        },
        invoices: invoicesRes.items ?? [],
      });
    } catch (err) {
      app.log.error(err);
      return reply.send({ plan, subscription: null, invoices: [] });
    }
  });
}
