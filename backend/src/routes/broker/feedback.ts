import { FastifyInstance } from 'fastify';
import { db } from '../../firestore.js';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getBrokerByUid } from '../../middleware/verifyBroker.js';

function getWeekKey(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

const VALID_TAGS = ['Suggestion', 'Complaint', 'Question', 'Win'];

export async function brokerFeedbackRoute(app: FastifyInstance) {
  // GET /broker/feedback — all feedback sorted by (upvotes - downvotes) desc
  app.get('/feedback', async (req, reply) => {
    try {
      const uid = (req as any).brokerUid;
      if (!uid) return reply.status(401).send({ error: 'Unauthorized' });
      const snap = await db.collection('brokerFeedback').orderBy('createdAt', 'desc').get();
      const items = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Sort by net votes descending
      items.sort((a: any, b: any) => (b.upvotes - b.downvotes) - (a.upvotes - a.downvotes));
      return reply.send({ feedback: items });
    } catch (err) {
      app.log.error(err);
      return reply.status(500).send({ error: 'Failed to fetch feedback' });
    }
  });

  // POST /broker/feedback — submit new feedback (one per broker per week)
  app.post('/feedback', async (req, reply) => {
    const uid = (req as any).brokerUid;
    try {
      const broker = await getBrokerByUid(uid);
      if (!broker) return reply.status(404).send({ error: 'Broker not found' });
      const { content, tag } = req.body as { content: string; tag: string };
      if (!content || content.trim().length < 10) {
        return reply.status(400).send({ error: 'Feedback must be at least 10 characters' });
      }
      if (content.trim().length > 1000) {
        return reply.status(400).send({ error: 'Feedback must be 1000 characters or fewer' });
      }
      if (!VALID_TAGS.includes(tag)) {
        return reply.status(400).send({ error: `Tag must be one of: ${VALID_TAGS.join(', ')}` });
      }
      const weekKey = getWeekKey(new Date());
      // Check one-per-week limit
      const existing = await db.collection('brokerFeedback')
        .where('brokerId', '==', broker.id)
        .where('weekKey', '==', weekKey)
        .limit(1)
        .get();
      if (!existing.empty) {
        return reply.status(429).send({ error: 'You can only submit one feedback per week' });
      }
      const ref = db.collection('brokerFeedback').doc();
      await ref.set({
        brokerId: broker.id,
        brokerName: broker.name,
        brokerPhotoUrl: (broker as any).photoUrl ?? null,
        content: content.trim(),
        tag,
        upvotes: 0,
        downvotes: 0,
        status: 'open',
        adminReply: null,
        weekKey,
        createdAt: Timestamp.now(),
      });
      return reply.status(201).send({ id: ref.id });
    } catch (err: any) {
      app.log.error(err);
      return reply.status(500).send({ error: err.message ?? 'Failed to submit feedback' });
    }
  });

  // POST /broker/feedback/:id/vote — upvote or downvote
  app.post('/feedback/:id/vote', async (req, reply) => {
    const uid = (req as any).brokerUid;
    try {
      const broker = await getBrokerByUid(uid);
      if (!broker) return reply.status(404).send({ error: 'Broker not found' });
      const { id } = req.params as { id: string };
      const { vote } = req.body as { vote: 1 | -1 };
      if (vote !== 1 && vote !== -1) return reply.status(400).send({ error: 'vote must be 1 or -1' });
      const feedbackRef = db.collection('brokerFeedback').doc(id);
      const voteRef = feedbackRef.collection('votes').doc(broker.id);
      const feedbackDoc = await feedbackRef.get();
      if (!feedbackDoc.exists) return reply.status(404).send({ error: 'Feedback not found' });
      await db.runTransaction(async (tx) => {
        const existing = await tx.get(voteRef);
        if (existing.exists) {
          const prev = existing.data()!.vote as 1 | -1;
          if (prev === vote) {
            // Remove vote
            tx.delete(voteRef);
            tx.update(feedbackRef, {
              [vote === 1 ? 'upvotes' : 'downvotes']: FieldValue.increment(-1),
            });
          } else {
            // Switch vote
            tx.set(voteRef, { vote });
            tx.update(feedbackRef, {
              [vote === 1 ? 'upvotes' : 'downvotes']: FieldValue.increment(1),
              [vote === 1 ? 'downvotes' : 'upvotes']: FieldValue.increment(-1),
            });
          }
        } else {
          tx.set(voteRef, { vote });
          tx.update(feedbackRef, {
            [vote === 1 ? 'upvotes' : 'downvotes']: FieldValue.increment(1),
          });
        }
      });
      return reply.send({ ok: true });
    } catch (err) {
      app.log.error(err);
      return reply.status(500).send({ error: 'Failed to record vote' });
    }
  });

  // GET /broker/feedback/my-vote/:id — check if current broker voted on an item
  app.get('/feedback/my-vote/:id', async (req, reply) => {
    const uid = (req as any).brokerUid;
    try {
      const broker = await getBrokerByUid(uid);
      if (!broker) return reply.status(404).send({ error: 'Broker not found' });
      const { id } = req.params as { id: string };
      const voteDoc = await db.collection('brokerFeedback').doc(id).collection('votes').doc(broker.id).get();
      return reply.send({ vote: voteDoc.exists ? voteDoc.data()!.vote : null });
    } catch (err) {
      app.log.error(err);
      return reply.status(500).send({ error: 'Failed to fetch vote' });
    }
  });
}
