import { FastifyInstance } from 'fastify';
import { getAuth } from 'firebase-admin/auth';
import { db } from '../../firestore.js';
import { BusinessDocument } from '../../types.js';
import { createSubscriptionAndLink, razorpay } from '../../razorpay.js';
import { createPayout } from '../../razorpayx.js';

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
      startAt,
      setupFee,
      brokerId,
      commissionPercent,
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

  // Set owner email (when business was created without one)
  app.post<{ Params: { slug: string } }>('/business/:slug/set-owner-email', async (req, reply) => {
    const { slug } = req.params;
    const { ownerEmail } = req.body as { ownerEmail: string };

    if (!ownerEmail) return reply.status(400).send({ error: 'ownerEmail is required' });

    try {
      const ref = db.collection('businesses').doc(slug);
      const doc = await ref.get();
      if (!doc.exists) return reply.status(404).send({ error: 'Business not found' });

      let ownerUid: string;
      try {
        const userRecord = await getAuth().createUser({ email: ownerEmail });
        ownerUid = userRecord.uid;
      } catch (authError: any) {
        if (authError?.code === 'auth/email-already-exists') {
          const existing = await getAuth().getUserByEmail(ownerEmail);
          ownerUid = existing.uid;
        } else {
          throw authError;
        }
      }

      await ref.update({ ownerEmail, ownerUid });
      const inviteLink = await getAuth().generatePasswordResetLink(ownerEmail);
      return reply.send({ inviteLink });
    } catch (error: any) {
      app.log.error(error);
      return reply.status(500).send({ error: 'Failed to set owner email', detail: error?.message });
    }
  });

  // Refresh Firebase password reset link
  app.post<{ Params: { slug: string } }>('/business/:slug/refresh-invite', async (req, reply) => {
    const { slug } = req.params;
    try {
      const doc = await db.collection('businesses').doc(slug).get();
      if (!doc.exists) return reply.status(404).send({ error: 'Business not found' });

      const ownerEmail = (doc.data() as any)?.ownerEmail;
      if (!ownerEmail) return reply.status(400).send({ error: 'No owner email on this business' });

      const inviteLink = await getAuth().generatePasswordResetLink(ownerEmail);
      return reply.send({ inviteLink });
    } catch (error: any) {
      app.log.error(error);
      return reply.status(500).send({ error: 'Failed to generate invite link', detail: error?.message });
    }
  });

  // Refresh Razorpay payment link
  app.post<{ Params: { slug: string } }>('/business/:slug/refresh-payment-link', async (req, reply) => {
    const { slug } = req.params;
    try {
      const ref = db.collection('businesses').doc(slug);
      const doc = await ref.get();
      if (!doc.exists) return reply.status(404).send({ error: 'Business not found' });

      const data = doc.data() as any;
      const subscriptionId = data?.razorpaySubscriptionId;
      if (!subscriptionId) return reply.status(400).send({ error: 'No Razorpay subscription on this business' });

      if (!razorpay) return reply.status(400).send({ error: 'Razorpay not configured' });

      const subscription = await razorpay.subscriptions.fetch(subscriptionId) as any;
      const paymentLink = subscription.short_url;

      await ref.update({ razorpayPaymentLink: paymentLink });
      return reply.send({ paymentLink });
    } catch (error: any) {
      app.log.error(error);
      return reply.status(500).send({ error: 'Failed to refresh payment link', detail: error?.message });
    }
  });

  // Toggle commission paid status for a business
  app.post<{ Params: { slug: string } }>('/business/:slug/toggle-commission-paid', async (req, reply) => {
    const { slug } = req.params;
    try {
      const ref = db.collection('businesses').doc(slug);
      const doc = await ref.get();
      if (!doc.exists) return reply.status(404).send({ error: 'Business not found' });
      const current = (doc.data() as any).commissionPaid ?? false;
      await ref.update({ commissionPaid: !current });
      return reply.send({ commissionPaid: !current });
    } catch (err) {
      app.log.error(err);
      return reply.status(500).send({ error: 'Failed to toggle commission paid' });
    }
  });

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

  // PATCH /admin/customer-feedback/:id/read — toggle read status
  app.patch<{ Params: { id: string } }>('/customer-feedback/:id/read', async (req, reply) => {
    const { id } = req.params;
    try {
      const doc = await db.collection('customerFeedback').doc(id).get();
      if (!doc.exists) return reply.status(404).send({ error: 'Not found' });
      const current = (doc.data() as any).read ?? false;
      await db.collection('customerFeedback').doc(id).update({ read: !current });
      return reply.send({ read: !current });
    } catch (err) {
      app.log.error(err);
      return reply.status(500).send({ error: 'Failed to update' });
    }
  });
}
