import { FastifyInstance } from 'fastify';
import { db } from '../../firestore.js';
import { StreakConfig } from '../../types.js';

const DEFAULT_CONFIG: StreakConfig = {
  tiers: [
    { fromDeal: 6, bonusAmount: 500 },
    { fromDeal: 11, bonusAmount: 1000 },
    { fromDeal: 16, bonusAmount: 1500 },
  ],
};

export async function adminConfigRoute(app: FastifyInstance) {
  app.get('/config', async (_req, reply) => {
    try {
      const doc = await db.doc('config/streak').get();
      if (!doc.exists) {
        await db.doc('config/streak').set(DEFAULT_CONFIG);
        return reply.send(DEFAULT_CONFIG);
      }
      return reply.send(doc.data());
    } catch (err) {
      app.log.error(err);
      return reply.status(500).send({ error: 'Failed to fetch config' });
    }
  });

  app.put('/config', async (req, reply) => {
    const { tiers } = req.body as StreakConfig;
    if (!Array.isArray(tiers) || tiers.some((t) => typeof t.fromDeal !== 'number' || typeof t.bonusAmount !== 'number')) {
      return reply.status(400).send({ error: 'tiers must be an array of { fromDeal: number, bonusAmount: number }' });
    }
    const sorted = [...tiers].sort((a, b) => a.fromDeal - b.fromDeal);
    try {
      await db.doc('config/streak').set({ tiers: sorted });
      return reply.send({ tiers: sorted });
    } catch (err) {
      app.log.error(err);
      return reply.status(500).send({ error: 'Failed to update config' });
    }
  });
}
