import { FastifyRequest, FastifyReply } from 'fastify';
import { getAuth } from 'firebase-admin/auth';

export async function verifyDev(req: FastifyRequest, reply: FastifyReply) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return reply.status(401).send({ error: 'Missing authorization header' });
  }

  const token = authHeader.slice(7);

  try {
    const decoded = await getAuth().verifyIdToken(token);
    if (!decoded.dev) {
      return reply.status(403).send({ error: 'Not a dev account' });
    }
    (req as any).devUid = decoded.uid;
    (req as any).devName = decoded.name ?? decoded.email ?? 'Unknown';
  } catch {
    return reply.status(401).send({ error: 'Invalid or expired token' });
  }
}
