import { FastifyInstance } from 'fastify';
import { db } from '../firestore.js';
import { BusinessDocument } from '../types.js';

export async function pageRoute(app: FastifyInstance) {
  // Public endpoint — returns the editable content map for a page
  app.get<{ Params: { slug: string } }>('/page/:slug/content', async (req, reply) => {
    const { slug } = req.params;

    reply.header('Access-Control-Allow-Origin', '*');
    reply.header('Cache-Control', 'public, max-age=30');

    const doc = await db.collection('businesses').doc(slug).get();

    if (!doc.exists) {
      return reply.status(404).send({ error: 'Not found' });
    }

    const content = (doc.data() as BusinessDocument).content ?? {};
    return reply.send(content);
  });

  app.get<{ Params: { businessSlug: string } }>(
    '/page/:businessSlug',
    async (req, reply) => {
      const { businessSlug } = req.params;

      reply.header('Access-Control-Allow-Origin', '*');
      reply.header('Cache-Control', 'public, max-age=60');

      const doc = await db.collection('businesses').doc(businessSlug).get();

      if (!doc.exists) {
        return reply.status(404).send({ status: 'inactive' });
      }

      const biz = doc.data() as BusinessDocument;

      const isActive = checkIsActive(biz);

      if (!isActive || biz.pageStatus !== 'deployed') {
        return reply.send({ status: 'inactive' });
      }

      return reply.send({
        status: 'active',
        jsUrl: biz.pageJsUrl,
        componentTagName: biz.componentTagName,
      });
    }
  );
}

function checkIsActive(biz: BusinessDocument): boolean {
  // Check if subscription is active
  if (biz.subscriptionStatus === 'active') {
    return true;
  }

  // Check if in free trial period
  if (
    biz.freeTrialEnabled === true &&
    biz.trialStartDate !== null
  ) {
    const trialEndTime = biz.trialStartDate.toDate().getTime() +
      biz.trialDurationDays * 24 * 60 * 60 * 1000;

    if (Date.now() < trialEndTime) {
      return true;
    }
  }

  return false;
}
