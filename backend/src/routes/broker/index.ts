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
