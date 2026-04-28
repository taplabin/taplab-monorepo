import { FastifyInstance } from 'fastify';
import crypto from 'crypto';
import { db } from '../firestore.js';

const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET!;

export async function webhookRoute(app: FastifyInstance) {
  app.post('/webhooks/razorpay', async (req, reply) => {
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

    // Extract subscription ID from different event types
    const subscriptionId =
      event.payload?.payment?.entity?.subscription_id ||
      event.payload?.invoice?.entity?.subscription_id ||
      event.payload?.payment_link?.entity?.subscription_id ||
      undefined;

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

  // Idempotent updates (Firestore update is safe to repeat)
  switch (eventType) {
    // Payment Events - When payment is successful
    case 'payment.captured':
      await docRef.update({ subscriptionStatus: 'active' });
      app.log.info({ subscriptionId }, 'Payment captured - subscription active');
      break;

    case 'payment.failed':
      // Don't immediately deactivate - Razorpay retries
      app.log.warn({ subscriptionId }, 'Payment failed - waiting for retries');
      break;

    // Invoice Events - Subscription billing
    case 'invoice.paid':
      await docRef.update({ subscriptionStatus: 'active' });
      app.log.info({ subscriptionId }, 'Invoice paid - subscription active');
      break;

    case 'invoice.expired':
      await docRef.update({ subscriptionStatus: 'inactive' });
      app.log.info({ subscriptionId }, 'Invoice expired - subscription inactive');
      break;

    // Payment Link Events
    case 'payment_link.paid':
      await docRef.update({ subscriptionStatus: 'active' });
      app.log.info({ subscriptionId }, 'Payment link paid - subscription active');
      break;

    case 'payment_link.cancelled':
      app.log.info({ subscriptionId }, 'Payment link cancelled');
      break;

    default:
      // Unhandled event type — ignore safely
      app.log.info({ eventType }, 'Unhandled webhook event type');
      break;
  }
}
