import Fastify from 'fastify';
import dotenv from 'dotenv';
import { buildHandler } from './builder.js';

dotenv.config();

const app = Fastify({ logger: true });

const BUILD_SECRET = process.env.BUILD_SERVICE_SECRET;

app.get('/health', async (_req, reply) => reply.send({ ok: true }));

app.post('/build', async (req, reply) => {
  // Verify shared secret
  const auth = req.headers.authorization;
  if (!BUILD_SECRET || auth !== `Bearer ${BUILD_SECRET}`) {
    return reply.status(401).send({ error: 'Unauthorized' });
  }

  const { slug, appTsx, contentTs, claudeModel, buildNumber, token } = req.body as {
    slug: string;
    appTsx: string;
    contentTs: string;
    claudeModel: string;
    buildNumber: number;
    token: string;
  };

  if (!slug || !appTsx || !contentTs || !buildNumber || !token) {
    return reply.status(400).send({ error: 'Missing required fields' });
  }

  try {
    const result = await buildHandler({ slug, appTsx, contentTs, claudeModel, buildNumber, token });
    return reply.send(result);
  } catch (err: any) {
    app.log.error({ err, slug, buildNumber }, 'Build failed');
    return reply.status(422).send({ error: 'Build failed', details: err?.message ?? 'Unknown error' });
  }
});

const port = Number(process.env.PORT) || 3001;
app.listen({ port, host: '0.0.0.0' }, (err, address) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
  app.log.info(`Build service listening on ${address}`);
});
