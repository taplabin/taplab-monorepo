import { FastifyInstance } from 'fastify';
import { getAuth } from 'firebase-admin/auth';
import { db } from '../firestore.js';
import { BusinessDocument } from '../types.js';

export async function portalRoute(app: FastifyInstance) {
  app.get('/portal/me', async (req, reply) => {
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

    const snapshot = await db
      .collection('businesses')
      .where('ownerUid', '==', uid)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return reply.status(404).send({ error: 'No business found for this account' });
    }

    const biz = snapshot.docs[0].data() as BusinessDocument;

    return reply.send({
      slug: biz.businessSlug,
      businessName: biz.businessName,
      subscriptionStatus: biz.subscriptionStatus,
      razorpayPaymentLink: biz.razorpayPaymentLink,
      content: biz.content ?? {},
      contentKeys: biz.contentKeys ?? Object.keys(biz.content ?? {}),
    });
  });
}
