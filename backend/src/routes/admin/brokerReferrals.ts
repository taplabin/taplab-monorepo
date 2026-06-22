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
