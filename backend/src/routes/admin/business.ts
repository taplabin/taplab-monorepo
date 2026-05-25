import { FastifyInstance } from 'fastify';
import { getAuth } from 'firebase-admin/auth';
import { db } from '../../firestore.js';
import { BusinessDocument } from '../../types.js';
import { createSubscriptionAndLink } from '../../razorpay.js';

export async function adminBusinessRoute(app: FastifyInstance) {
  // Create new business
  app.post('/business', async (req, reply) => {
    const {
      businessName,
      businessSlug,
      ownerEmail,
      pricingAmount,
      billingCycle,
      freeTrialEnabled,
      trialDurationDays,
    } = req.body as any;

    // Validate slug format
    if (!/^[a-z0-9_]+$/.test(businessSlug)) {
      return reply.status(400).send({
        error: 'Slug must be lowercase letters, numbers, and underscores only',
      });
    }

    // Validate required fields
    if (!businessName || !businessSlug || !pricingAmount || !billingCycle) {
      return reply.status(400).send({
        error: 'Missing required fields: businessName, businessSlug, pricingAmount, billingCycle',
      });
    }

    // Validate billing cycle
    if (billingCycle !== 'monthly' && billingCycle !== 'yearly') {
      return reply.status(400).send({
        error: 'billingCycle must be either "monthly" or "yearly"',
      });
    }

    try {
      // Create Razorpay subscription and payment link
      const { razorpaySubscriptionId, paymentLinkUrl } =
        await createSubscriptionAndLink(businessName, pricingAmount, billingCycle);

      // Create Firebase Auth user for the business owner (if email provided)
      let ownerUid: string | null = null;
      let inviteLink: string | null = null;

      if (ownerEmail) {
        try {
          const userRecord = await getAuth().createUser({ email: ownerEmail });
          ownerUid = userRecord.uid;
          inviteLink = await getAuth().generatePasswordResetLink(ownerEmail);
        } catch (authError: any) {
          // If user already exists, fetch their UID and generate a new invite link
          if (authError?.code === 'auth/email-already-exists') {
            const existing = await getAuth().getUserByEmail(ownerEmail);
            ownerUid = existing.uid;
            inviteLink = await getAuth().generatePasswordResetLink(ownerEmail);
          } else {
            throw authError;
          }
        }
      }

      // Use Firestore transaction to ensure slug uniqueness
      await db.runTransaction(async (tx) => {
        const ref = db.collection('businesses').doc(businessSlug);
        const snap = await tx.get(ref);

        if (snap.exists) {
          throw new Error(`Slug '${businessSlug}' is already taken`);
        }

        const businessData: BusinessDocument = {
          businessName,
          businessSlug,
          ownerEmail: ownerEmail ?? null,
          ownerUid,
          subscriptionStatus: 'inactive',
          freeTrialEnabled: freeTrialEnabled ?? false,
          trialStartDate: null,
          trialDurationDays: trialDurationDays ?? 7,
          pricingAmount,
          billingCycle,
          pageJsUrl: null,
          componentTagName: null,
          pageVersion: null,
          pageStatus: 'no_page',
          lastDeployedAt: null,
          razorpaySubscriptionId,
          razorpayPaymentLink: paymentLinkUrl,
          createdAt: new Date() as any,
        };

        tx.set(ref, businessData);
      });

      return reply.status(201).send({
        slug: businessSlug,
        paymentLink: paymentLinkUrl,
        razorpaySubscriptionId,
        inviteLink,
      });
    } catch (error: any) {
      const message = error?.message ?? error?.error?.description ?? JSON.stringify(error);
      if (message?.includes('already taken')) {
        return reply.status(409).send({ error: message });
      }
      app.log.error({ razorpayError: error?.error ?? error, message }, 'Failed to create business');
      return reply.status(500).send({ error: 'Failed to create business', detail: message });
    }
  });

  // Update business
  app.put<{ Params: { slug: string } }>('/business/:slug', async (req, reply) => {
    const { slug } = req.params;
    const updates = req.body as Partial<BusinessDocument>;

    // Don't allow updating certain fields
    const disallowedFields = [
      'businessSlug',
      'createdAt',
      'razorpaySubscriptionId',
      'razorpayPaymentLink',
    ];

    for (const field of disallowedFields) {
      if (field in updates) {
        delete (updates as any)[field];
      }
    }

    try {
      const ref = db.collection('businesses').doc(slug);
      const doc = await ref.get();

      if (!doc.exists) {
        return reply.status(404).send({ error: 'Business not found' });
      }

      await ref.update(updates);

      return reply.send({
        slug,
        message: 'Business updated successfully',
      });
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({ error: 'Failed to update business' });
    }
  });

  // List all businesses
  app.get('/business', async (req, reply) => {
    try {
      const snapshot = await db.collection('businesses').get();

      const businesses = snapshot.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id,
      }));

      return reply.send({ businesses });
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch businesses' });
    }
  });

  // Get single business
  app.get<{ Params: { slug: string } }>('/business/:slug', async (req, reply) => {
    const { slug } = req.params;

    try {
      const doc = await db.collection('businesses').doc(slug).get();

      if (!doc.exists) {
        return reply.status(404).send({ error: 'Business not found' });
      }

      return reply.send({
        ...doc.data(),
        id: doc.id,
      });
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch business' });
    }
  });
}
