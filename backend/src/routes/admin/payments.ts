import { FastifyInstance } from 'fastify';
import { db } from '../../firestore.js';
import { razorpay } from '../../razorpay.js';

export async function adminPaymentsRoute(app: FastifyInstance) {
  // Get payment history for a business
  app.get<{ Params: { slug: string } }>('/business/:slug/payments', async (req, reply) => {
    const { slug } = req.params;

    try {
      // Verify business exists
      const doc = await db.collection('businesses').doc(slug).get();

      if (!doc.exists) {
        return reply.status(404).send({ error: 'Business not found' });
      }

      const business = doc.data();

      if (!business?.razorpaySubscriptionId) {
        return reply.send({
          payments: [],
          message: 'No Razorpay subscription ID found for this business',
        });
      }

      if (!razorpay) {
        return reply.send({
          payments: [],
          message: 'Razorpay is not configured (dev mode)',
        });
      }

      // Fetch live payment history from Razorpay API
      const invoices: any = await razorpay.invoices.all({
        subscription_id: business.razorpaySubscriptionId,
        count: 20,
      });

      return reply.send({
        payments: invoices.items || [],
      });
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch payments' });
    }
  });
}
