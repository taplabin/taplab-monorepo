import { FastifyInstance } from 'fastify';
import crypto from 'crypto';
import { db } from '../firestore.js';
import { handleCommissionPayout, handleStreakBonus, handleReferralFlag } from '../payouts.js';

const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET!;

export async function webhookRoute(app: FastifyInstance) {
  app.post('/webhooks/razorpay', { config: { rateLimit: false } }, async (req, reply) => {
    // 1. Verify signature
    const signature = req.headers['x-razorpay-signature'] as string;
    const rawBody = req.body as Buffer;

    if (!signature) {
      app.log.warn('Razorpay webhook missing signature header');
      return reply.status(400).send({ error: 'Missing signature' });
    }

    const expectedSig = crypto
      .createHmac('sha256', WEBHOOK_SECRET)
      .update(rawBody)
      .digest('hex');

    if (signature !== expectedSig) {
      app.log.warn('Razorpay webhook signature mismatch');
      return reply.status(400).send({ error: 'Invalid signature' });
    }

    // 2. Parse event
    const event = JSON.parse(rawBody.toString());
    const eventType = event.event as string;

    const subscriptionId = event.payload?.subscription?.entity?.id as string | undefined;

    app.log.info({ eventType, subscriptionId }, 'Razorpay webhook received');

    // 3. Handle event
    try {
      await handleWebhookEvent(eventType, subscriptionId, event, app);
    } catch (error) {
      app.log.error({ error, eventType, subscriptionId }, 'Error handling webhook event');
    }

    // Always return 200 to prevent Razorpay retries
    return reply.status(200).send({ received: true });
  });
}

async function handleWebhookEvent(
  eventType: string,
  subscriptionId: string | undefined,
  event: any,
  app: FastifyInstance
) {
  if (!subscriptionId) {
    app.log.warn({ eventType }, 'Webhook event missing subscription ID');
    return;
  }

  // Find the business document by razorpaySubscriptionId
  const query = await db
    .collection('businesses')
    .where('razorpaySubscriptionId', '==', subscriptionId)
    .limit(1)
    .get();

  if (query.empty) {
    // Business doesn't exist yet — log and return
    app.log.warn(
      { subscriptionId },
      `No business found for Razorpay subscription: ${subscriptionId}`
    );
    return;
  }

  const docRef = query.docs[0].ref;

  switch (eventType) {
    case 'subscription.activated':
      await docRef.update({ subscriptionStatus: 'active', subscriptionEndsAt: null });
      break;

    case 'subscription.charged': {
      await docRef.update({ subscriptionStatus: 'active', subscriptionEndsAt: null });
      const freshDoc = await docRef.get();
      if (freshDoc.exists) {
        const freshData = freshDoc.data()!;
        await handleCommissionPayout(docRef.id, freshData, app.log);
        const afterCommission = (await docRef.get()).data()!;
        await handleStreakBonus(docRef.id, afterCommission, app.log);
        const afterStreak = (await docRef.get()).data()!;
        await handleReferralFlag(docRef.id, afterStreak, app.log);
      }
      break;
    }

    case 'subscription.cancelled': {
      const currentEnd = event.payload?.subscription?.entity?.current_end;
      const subscriptionEndsAt = currentEnd ? new Date(currentEnd * 1000) : null;
      await docRef.update({ subscriptionStatus: 'cancelled', subscriptionEndsAt });
      break;
    }

    case 'subscription.halted':
    case 'subscription.paused':
    case 'subscription.completed':
      await docRef.update({ subscriptionStatus: 'inactive' });
      break;

    case 'subscription.resumed':
      await docRef.update({ subscriptionStatus: 'active', subscriptionEndsAt: null });
      break;

    default:
      app.log.info({ eventType }, 'Unhandled webhook event type');
      break;
  }
}
