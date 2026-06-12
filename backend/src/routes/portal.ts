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

async function getBusinessBySlug(slug: string, uid: string): Promise<BusinessDocument | null> {
  const doc = await db.collection('businesses').doc(slug).get();
  if (!doc.exists) return null;
  const data = doc.data() as BusinessDocument;
  if (data.ownerUid !== uid) return null;
  return data;
}

async function getBusinessForUser(uid: string, slug?: string): Promise<BusinessDocument | null> {
  if (slug) return getBusinessBySlug(slug, uid);
  return getBusinessByUid(uid);
}

export async function portalRoute(app: FastifyInstance) {
  // List all businesses for the authenticated user
  app.get('/portal/businesses', async (req, reply) => {
    let uid: string;
    try {
      uid = await verifyPortalToken(req.headers.authorization);
    } catch {
      return reply.status(401).send({ error: 'Invalid or expired token' });
    }

    try {
      const snapshot = await db.collection('businesses').where('ownerUid', '==', uid).get();
      const businesses = snapshot.docs.map((doc) => {
        const d = doc.data() as BusinessDocument;
        return {
          slug: d.businessSlug,
          businessName: d.businessName,
          pageStatus: d.pageStatus,
          subscriptionStatus: d.subscriptionStatus,
          freeTrialEnabled: d.freeTrialEnabled,
          trialStartDate: d.trialStartDate ?? null,
          trialDurationDays: d.trialDurationDays,
          pricingAmount: d.pricingAmount,
          billingCycle: d.billingCycle,
        };
      });
      return reply.send({ businesses });
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch businesses' });
    }
  });

  // Get full business data for the portal — accepts ?slug= to select a specific business
  app.get('/portal/me', async (req, reply) => {
    let uid: string;
    try {
      uid = await verifyPortalToken(req.headers.authorization);
    } catch {
      return reply.status(401).send({ error: 'Invalid or expired token' });
    }

    const { slug } = req.query as { slug?: string };
    const biz = await getBusinessForUser(uid, slug);
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
      setupFee: biz.setupFee ?? null,
      content: biz.content ?? {},
      contentKeys: biz.contentKeys ?? Object.keys(biz.content ?? {}),
    });
  });

  // Billing data — accepts ?slug= to select a specific business
  app.get('/portal/billing', async (req, reply) => {
    let uid: string;
    try {
      uid = await verifyPortalToken(req.headers.authorization);
    } catch {
      return reply.status(401).send({ error: 'Invalid or expired token' });
    }

    const { slug } = req.query as { slug?: string };
    const biz = await getBusinessForUser(uid, slug);
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
