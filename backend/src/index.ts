import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import dotenv from 'dotenv';
import { pageRoute } from './routes/page.js';
import { webhookRoute } from './routes/webhook.js';
import { portalRoute } from './routes/portal.js';
import { analyticsRoute } from './routes/analytics.js';
import { adminBusinessRoute } from './routes/admin/business.js';
import { adminPaymentsRoute } from './routes/admin/payments.js';
import { adminStorageRoute } from './routes/admin/storage.js';
import { verifyAdmin } from './middleware/verifyAdmin.js';

dotenv.config();

const app = Fastify({ logger: true });

// Configure raw body parsing for webhook signature verification
app.addContentTypeParser('application/json', { parseAs: 'buffer' }, (req, body, done) => {
  // For webhook routes, keep raw Buffer; for others, parse JSON
  if (req.url?.startsWith('/webhooks/')) {
    done(null, body);
  } else if (!body || body.length === 0) {
    done(null, {});
  } else {
    try {
      const json = JSON.parse(body.toString());
      done(null, json);
    } catch (err: any) {
      done(err, undefined);
    }
  }
});

// Rate limiting — uses CF-Connecting-IP so each real visitor is tracked
// individually even though all traffic arrives via Cloudflare's IP range.
// Webhook route is exempt (Razorpay must never be blocked).
await app.register(rateLimit, {
  global: true,
  max: 100,
  timeWindow: '1 minute',
  keyGenerator: (req) =>
    (req.headers['cf-connecting-ip'] as string) ?? req.ip,
  errorResponseBuilder: (_req, context) => ({
    error: `Too many requests — try again in ${Math.ceil(context.ttl / 1000)}s`,
  }),
});

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:5173', 'http://localhost:5174'];

await app.register(cors, {
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'PUT'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});

// Health check — used by UptimeRobot
app.get('/health', async (_req, reply) => reply.send({ ok: true }));

// Public routes
await app.register(pageRoute);
await app.register(webhookRoute);
await app.register(portalRoute);
await app.register(analyticsRoute);

// Admin routes (protected)
await app.register(async (adminApp) => {
  adminApp.addHook('preHandler', verifyAdmin);
  await adminApp.register(adminBusinessRoute);
  await adminApp.register(adminPaymentsRoute);
  await adminApp.register(adminStorageRoute);
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
