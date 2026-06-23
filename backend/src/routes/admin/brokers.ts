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

  // POST /admin/brokers/:id/reset-invite — generate a fresh invite link for a broker
  app.post<{ Params: { id: string } }>('/brokers/:id/reset-invite', async (req, reply) => {
    const { id } = req.params;
    try {
      const doc = await db.collection('brokers').doc(id).get();
      if (!doc.exists) return reply.status(404).send({ error: 'Broker not found' });
      const email = doc.data()!.email;
      if (!email) return reply.status(400).send({ error: 'Broker has no email set' });
      const inviteLink = await getAuth().generatePasswordResetLink(email);
      return reply.send({ inviteLink });
    } catch (err: any) {
      app.log.error(err);
      return reply.status(500).send({ error: err.message ?? 'Failed to generate invite link' });
    }
  });

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
}
