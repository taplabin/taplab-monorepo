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
