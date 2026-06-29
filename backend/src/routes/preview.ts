import { FastifyInstance } from 'fastify';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { db } from '../firestore.js';
import { BuildDocument } from '../types.js';
import { Readable } from 'stream';

function getStagingS3(): S3Client | null {
  const endpoint = process.env.STAGING_R2_ENDPOINT;
  const keyId = process.env.STAGING_R2_READ_KEY_ID;
  const secret = process.env.STAGING_R2_READ_SECRET_KEY;
  if (!endpoint || !keyId || !secret) return null;
  return new S3Client({
    region: 'auto',
    endpoint,
    credentials: { accessKeyId: keyId, secretAccessKey: secret },
  });
}

// Finds a build document by stagingToken (collection-group query)
async function findBuildByToken(token: string): Promise<BuildDocument | null> {
  const snap = await db.collectionGroup('builds')
    .where('stagingToken', '==', token)
    .limit(1)
    .get();

  if (snap.empty) return null;
  return snap.docs[0].data() as BuildDocument;
}

export async function previewRoute(app: FastifyInstance) {
  // Returns metadata for the preview — host app uses this to inject the script
  app.get<{ Params: { token: string } }>(
    '/preview/:token',
    { config: { rateLimit: { max: 200, timeWindow: '1 minute' } } },
    async (req, reply) => {
      const { token } = req.params;

      reply.header('Cache-Control', 'no-store');

      const build = await findBuildByToken(token);
      if (!build) return reply.status(404).send({ error: 'Preview not found' });

      const apiBase = process.env.API_BASE_URL ?? 'https://api.taplab.in';

      return reply.send({
        jsUrl: `${apiBase}/preview-js/${token}`,
        componentTagName: build.componentTagName,
      });
    }
  );

  // Streams the staging JS bundle from R2 — no public staging domain needed
  app.get<{ Params: { token: string } }>(
    '/preview-js/:token',
    { config: { rateLimit: false } },
    async (req, reply) => {
      const { token } = req.params;

      const build = await findBuildByToken(token);
      if (!build) return reply.status(404).send('Not found');

      const s3 = getStagingS3();
      if (!s3) return reply.status(503).send('Staging storage not configured');

      try {
        const obj = await s3.send(new GetObjectCommand({
          Bucket: process.env.STAGING_R2_BUCKET!,
          Key: build.r2StagingKey,
        }));

        reply.header('Content-Type', 'application/javascript');
        reply.header('Cache-Control', 'no-store');
        reply.header('Access-Control-Allow-Origin', '*');

        // Stream the R2 response body directly to the client
        return reply.send(obj.Body as Readable);
      } catch (err: any) {
        app.log.error({ err, token }, 'Failed to stream staging JS');
        return reply.status(500).send('Failed to load preview');
      }
    }
  );
}
