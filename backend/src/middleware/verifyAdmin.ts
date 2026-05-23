import { FastifyRequest, FastifyReply } from 'fastify';
import { getAuth } from 'firebase-admin/auth';

export async function verifyAdmin(req: FastifyRequest, reply: FastifyReply) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    console.log('[verifyAdmin] Missing or malformed Authorization header');
    return reply.status(401).send({ error: 'Missing authorization header' });
  }

  const token = authHeader.slice(7);
  console.log('[verifyAdmin] Token received, length:', token.length);

  try {
    const decoded = await getAuth().verifyIdToken(token);
    (req as any).adminUid = decoded.uid;
    console.log('[verifyAdmin] Token valid, uid:', decoded.uid);
  } catch (err: any) {
    console.log('[verifyAdmin] Token verification failed:', err?.message ?? err?.code ?? String(err));
    return reply.status(401).send({ error: 'Invalid or expired token' });
  }
}
