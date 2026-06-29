import { FastifyInstance } from 'fastify';
import crypto from 'crypto';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { db } from '../../firestore.js';
import { JobDocument, BuildDocument } from '../../types.js';

function getMediaS3(): S3Client {
  return new S3Client({
    region: 'auto',
    endpoint: process.env.MEDIA_R2_ENDPOINT!,
    credentials: {
      accessKeyId: process.env.MEDIA_R2_KEY_ID!,
      secretAccessKey: process.env.MEDIA_R2_SECRET_KEY!,
    },
  });
}

export async function devJobsRoute(app: FastifyInstance) {
  // List: open queue + jobs claimed by this dev
  app.get('/jobs', async (req, reply) => {
    const devUid = (req as any).devUid as string;
    try {
      const [queuedSnap, claimedSnap] = await Promise.all([
        db.collection('jobs').where('status', '==', 'queued').get(),
        db.collection('jobs').where('devUid', '==', devUid).get(),
      ]);

      const queued = queuedSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      // My jobs: exclude anything that's already live (only show active work)
      const mine = claimedSnap.docs
        .filter((d) => (d.data() as JobDocument).status !== 'live')
        .map((d) => ({ id: d.id, ...d.data() }));

      return reply.send({ queued, mine });
    } catch (err) {
      app.log.error(err);
      return reply.status(500).send({ error: 'Failed to fetch jobs' });
    }
  });

  // Get job detail — only if unclaimed or claimed by this dev
  app.get<{ Params: { slug: string } }>('/jobs/:slug', async (req, reply) => {
    const { slug } = req.params;
    const devUid = (req as any).devUid as string;
    try {
      const doc = await db.collection('jobs').doc(slug).get();
      if (!doc.exists) return reply.status(404).send({ error: 'Job not found' });

      const job = doc.data() as JobDocument;
      if (job.status !== 'queued' && job.devUid !== devUid) {
        return reply.status(403).send({ error: 'This job is claimed by another developer' });
      }

      return reply.send({ id: slug, ...job });
    } catch (err) {
      app.log.error(err);
      return reply.status(500).send({ error: 'Failed to fetch job' });
    }
  });

  // Claim a job — transactional to prevent race conditions
  app.post<{ Params: { slug: string } }>('/jobs/:slug/claim', async (req, reply) => {
    const { slug } = req.params;
    const devUid = (req as any).devUid as string;
    const devName = (req as any).devName as string;
    try {
      await db.runTransaction(async (tx) => {
        const ref = db.collection('jobs').doc(slug);
        const snap = await tx.get(ref);
        if (!snap.exists) throw Object.assign(new Error('Job not found'), { code: 404 });

        const job = snap.data() as JobDocument;
        if (job.status !== 'queued') {
          throw Object.assign(new Error('Job is no longer available'), { code: 409 });
        }

        tx.update(ref, {
          status: 'claimed',
          devUid,
          devName,
          claimedAt: new Date(),
          updatedAt: new Date(),
        });
      });

      return reply.send({ ok: true });
    } catch (err: any) {
      if (err.code === 404) return reply.status(404).send({ error: err.message });
      if (err.code === 409) return reply.status(409).send({ error: err.message });
      app.log.error(err);
      return reply.status(500).send({ error: 'Failed to claim job' });
    }
  });

  // Upload media file → R2 → return public URL
  app.post<{ Params: { slug: string } }>('/jobs/:slug/upload-media', async (req, reply) => {
    const { slug } = req.params;
    const devUid = (req as any).devUid as string;

    try {
      const jobDoc = await db.collection('jobs').doc(slug).get();
      if (!jobDoc.exists) return reply.status(404).send({ error: 'Job not found' });
      const job = jobDoc.data() as JobDocument;
      if (job.devUid !== devUid) return reply.status(403).send({ error: 'Not your job' });

      const data = await req.file();
      if (!data) return reply.status(400).send({ error: 'No file uploaded' });

      const buffer = await data.toBuffer();
      const originalName = data.filename.replace(/[^a-zA-Z0-9._-]/g, '_');
      const key = `${slug}/${originalName}`;

      const mediaBase = process.env.MEDIA_CDN_BASE_URL ?? 'https://media.taplab.in';

      if (!process.env.MEDIA_R2_ENDPOINT || !process.env.MEDIA_R2_KEY_ID) {
        // Local dev fallback: return a placeholder URL
        return reply.send({ url: `${mediaBase}/${key}` });
      }

      const s3 = getMediaS3();
      await s3.send(new PutObjectCommand({
        Bucket: process.env.MEDIA_R2_BUCKET!,
        Key: key,
        Body: buffer,
        ContentType: data.mimetype,
        CacheControl: 'public, max-age=31536000, immutable',
      }));

      return reply.send({ url: `${mediaBase}/${key}` });
    } catch (err) {
      app.log.error(err);
      return reply.status(500).send({ error: 'Failed to upload media' });
    }
  });

  // Push to staging — triggers build service
  app.post<{ Params: { slug: string } }>('/jobs/:slug/push-staging', async (req, reply) => {
    const { slug } = req.params;
    const devUid = (req as any).devUid as string;
    const devName = (req as any).devName as string;
    const { appTsx, contentTs, claudeModel } = req.body as {
      appTsx: string;
      contentTs: string;
      claudeModel: string;
    };

    if (!appTsx?.trim() || !contentTs?.trim()) {
      return reply.status(400).send({ error: 'appTsx and contentTs are required' });
    }

    try {
      const jobDoc = await db.collection('jobs').doc(slug).get();
      if (!jobDoc.exists) return reply.status(404).send({ error: 'Job not found' });
      const job = jobDoc.data() as JobDocument;

      if (job.devUid !== devUid) return reply.status(403).send({ error: 'Not your job' });
      if (!['claimed', 'in_review'].includes(job.status)) {
        return reply.status(400).send({ error: 'Job must be in claimed or in_review status' });
      }

      // Determine next build number
      const buildsSnap = await db.collection('jobs').doc(slug).collection('builds').get();
      const buildNumber = buildsSnap.size + 1;
      const stagingToken = crypto.randomBytes(4).toString('hex'); // 8 chars

      // Get template version from the build service or default to unknown
      const templateVersion = process.env.TEMPLATE_VERSION ?? 'unknown';
      const promptVersion = process.env.PROMPT_VERSION ?? 'unknown';

      // Call build service
      const buildServiceUrl = process.env.BUILD_SERVICE_URL;
      const buildServiceSecret = process.env.BUILD_SERVICE_SECRET;

      if (!buildServiceUrl || !buildServiceSecret) {
        return reply.status(503).send({ error: 'Build service not configured' });
      }

      let buildResult: { r2StagingKey: string; r2StagingFilename: string; componentTagName: string };

      const buildResponse = await fetch(`${buildServiceUrl}/build`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${buildServiceSecret}`,
        },
        body: JSON.stringify({ slug, appTsx, contentTs, claudeModel, buildNumber, token: stagingToken }),
      });

      if (!buildResponse.ok) {
        const errorBody = await buildResponse.text();
        app.log.error({ slug, buildNumber, errorBody }, 'Build service failed');
        return reply.status(422).send({ error: 'Build failed', details: errorBody });
      }

      buildResult = (await buildResponse.json()) as typeof buildResult;

      const stagingUrl = `${process.env.HOST_BASE_URL ?? 'https://taplab.in'}/preview/${stagingToken}`;

      // Write build document
      const buildData: BuildDocument = {
        buildNumber,
        stagingToken,
        stagingUrl,
        r2StagingKey: buildResult.r2StagingKey,
        r2StagingFilename: buildResult.r2StagingFilename,
        componentTagName: buildResult.componentTagName,
        claudeModel: claudeModel ?? 'unknown',
        promptVersion,
        templateVersion,
        devName,
        devUid,
        createdAt: new Date() as any,
      };

      await db.collection('jobs').doc(slug)
        .collection('builds').doc(String(buildNumber)).set(buildData);

      await db.collection('jobs').doc(slug).update({
        status: 'in_review',
        inReviewAt: new Date(),
        updatedAt: new Date(),
      });

      return reply.send({ stagingUrl, buildNumber });
    } catch (err) {
      app.log.error(err);
      return reply.status(500).send({ error: 'Failed to push to staging' });
    }
  });

  // List builds for a job
  app.get<{ Params: { slug: string } }>('/jobs/:slug/builds', async (req, reply) => {
    const { slug } = req.params;
    const devUid = (req as any).devUid as string;
    try {
      const jobDoc = await db.collection('jobs').doc(slug).get();
      if (!jobDoc.exists) return reply.status(404).send({ error: 'Job not found' });
      const job = jobDoc.data() as JobDocument;
      if (job.devUid !== devUid) return reply.status(403).send({ error: 'Not your job' });

      const snap = await db.collection('jobs').doc(slug)
        .collection('builds').orderBy('buildNumber', 'desc').get();

      return reply.send({ builds: snap.docs.map((d) => ({ id: d.id, ...d.data() })) });
    } catch (err) {
      app.log.error(err);
      return reply.status(500).send({ error: 'Failed to fetch builds' });
    }
  });
}
