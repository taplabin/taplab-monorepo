import { FastifyRequest, FastifyReply } from 'fastify';
import { getAuth } from 'firebase-admin/auth';
import { db } from '../firestore.js';

export async function verifyBroker(req: FastifyRequest, reply: FastifyReply) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return reply.status(401).send({ error: 'Unauthorized' });
  }
  try {
    const token = authHeader.slice(7);
    const decoded = await getAuth().verifyIdToken(token);
    if (!decoded.broker) {
      return reply.status(403).send({ error: 'Forbidden — broker access only' });
    }
    (req as any).brokerUid = decoded.uid;
  } catch {
    return reply.status(401).send({ error: 'Invalid token' });
  }
}

export async function getBrokerByUid(uid: string): Promise<({ id: string } & Record<string, any>) | null> {
  const snap = await db.collection('brokers').where('ownerUid', '==', uid).limit(1).get();
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() };
}
