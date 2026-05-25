import Fastify from 'fastify';
import cors from '@fastify/cors';
import dotenv from 'dotenv';
import { pageRoute } from './routes/page.js';
import { webhookRoute } from './routes/webhook.js';
import { portalRoute } from './routes/portal.js';
import { adminBusinessRoute } from './routes/admin/business.js';
import { adminPaymentsRoute } from './routes/admin/payments.js';
import { verifyAdmin } from './middleware/verifyAdmin.js';

dotenv.config();

const app = Fastify({ logger: true });

// Configure raw body parsing for webhook signature verification
app.addContentTypeParser('application/json', { parseAs: 'buffer' }, (req, body, done) => {
  // For webhook routes, keep raw Buffer; for others, parse JSON
  if (req.url?.startsWith('/webhooks/')) {
    done(null, body);
  } else {
    try {
      const json = JSON.parse(body.toString());
      done(null, json);
    } catch (err: any) {
      done(err, undefined);
    }
  }
});

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:5173', 'http://localhost:5174'];

await app.register(cors, {
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'PUT'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});

// Public routes
await app.register(pageRoute);
await app.register(webhookRoute);
await app.register(portalRoute);

// Admin routes (protected)
await app.register(async (adminApp) => {
  adminApp.addHook('preHandler', verifyAdmin);
  await adminApp.register(adminBusinessRoute);
  await adminApp.register(adminPaymentsRoute);
}, { prefix: '/admin' });

const port = Number(process.env.PORT) || 3000;
const host = '0.0.0.0';

app.listen({ port, host }, (err, address) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
  app.log.info(`Server listening on ${address}`);
});
