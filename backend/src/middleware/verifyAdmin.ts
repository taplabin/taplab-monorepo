import { FastifyRequest, FastifyReply } from 'fastify';
import { getAuth } from 'firebase-admin/auth';

export async function verifyAdmin(req: FastifyRequest, reply: FastifyReply) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return reply.status(401).send({ error: 'Missing authorization header' });
  }

  const token = authHeader.slice(7);

  try {
    const decoded = await getAuth().verifyIdToken(token);
    if (!decoded.admin) {
      return reply.status(403).send({ error: 'Not an admin account' });
    }
    (req as any).adminUid = decoded.uid;
  } catch {
    return reply.status(401).send({ error: 'Invalid or expired token' });
  }
}
