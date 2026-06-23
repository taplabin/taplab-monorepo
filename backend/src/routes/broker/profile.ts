import { FastifyInstance } from 'fastify';
import { db } from '../../firestore.js';
import { getBrokerByUid, verifyBroker } from '../../middleware/verifyBroker.js';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const s3 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT!,
  credentials: {
    accessKeyId: process.env.R2_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_KEY!,
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

  // PATCH /broker/profile — update own bio + city (broker auth required)
  app.patch('/profile', { preHandler: verifyBroker }, async (req, reply) => {
    const uid = (req as any).brokerUid;
    try {
      const broker = await getBrokerByUid(uid);
      if (!broker) return reply.status(404).send({ error: 'Broker not found' });
      const { bio, city } = req.body as { bio?: string; city?: string };
      const updates: Record<string, any> = {};
      if (bio !== undefined) updates.bio = bio.trim().slice(0, 300);
      if (city !== undefined) updates.city = city.trim().slice(0, 100);
      if (Object.keys(updates).length === 0) return reply.send({ ok: true });
      await db.collection('brokers').doc(broker.id).update(updates);
      return reply.send({ ok: true });
    } catch (err) {
      app.log.error(err);
      return reply.status(500).send({ error: 'Failed to update profile' });
    }
  });

  // POST /broker/profile/photo — upload profile photo to R2 (broker auth required)
  app.post('/profile/photo', { preHandler: verifyBroker }, async (req, reply) => {
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
      if (err.code === 'FST_REQ_FILE_TOO_LARGE' || err.statusCode === 413) {
        return reply.status(400).send({ error: 'Image must be under 2MB' });
      }
      return reply.status(500).send({ error: err.message ?? 'Upload failed' });
    }
  });

  // GET /broker/team — all brokers for team page (public)
  app.get('/team', async (_req, reply) => {
    try {
      const snap = await db.collection('brokers').orderBy('createdAt', 'asc').get();
      const allDealsSnap = await db.collection('businesses')
        .where('commissionPayoutSent', '==', true)
        .get();
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const dealsByBroker = new Map<string, { allTime: number; thisMonth: number }>();
      for (const d of allDealsSnap.docs) {
        const bId = d.data().brokerId as string;
        if (!bId) continue;
        if (!dealsByBroker.has(bId)) dealsByBroker.set(bId, { allTime: 0, thisMonth: 0 });
        const entry = dealsByBroker.get(bId)!;
        entry.allTime++;
        const ts = d.data().commissionPayoutSentAt;
        if (ts && ts.toDate() >= monthStart) entry.thisMonth++;
      }
      const brokers = snap.docs.map((doc) => {
        const data = doc.data();
        const deals = dealsByBroker.get(doc.id) ?? { allTime: 0, thisMonth: 0 };
        return {
          id: doc.id,
          name: data.name,
          city: data.city ?? null,
          photoUrl: data.photoUrl ?? null,
          dealsThisMonth: deals.thisMonth,
          dealsAllTime: deals.allTime,
        };
      });
      return reply.send({ brokers });
    } catch (err) {
      app.log.error(err);
      return reply.status(500).send({ error: 'Failed to fetch team' });
    }
  });
}
