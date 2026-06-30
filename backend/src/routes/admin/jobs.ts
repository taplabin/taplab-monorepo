import { FastifyInstance } from 'fastify';
import { db } from '../../firestore.js';
import { JobDocument, BuildDocument } from '../../types.js';
import { createSubscriptionAndLink } from '../../razorpay.js';
import { getAuth } from 'firebase-admin/auth';

export async function adminJobsRoute(app: FastifyInstance) {
  app.get('/jobs', async (req, reply) => {
    const { status } = req.query as { status?: string };
    try {
      let q = db.collection('jobs').orderBy('createdAt', 'desc') as any;
      if (status) q = db.collection('jobs').where('status', '==', status).orderBy('createdAt', 'desc');
      const snap = await q.get();
      return reply.send({ jobs: snap.docs.map((d: any) => ({ id: d.id, ...d.data() })) });
    } catch (err) {
      app.log.error(err);
      return reply.status(500).send({ error: 'Failed to fetch jobs' });
    }
  });

  app.get<{ Params: { slug: string } }>('/jobs/:slug', async (req, reply) => {
    const { slug } = req.params;
    try {
      const doc = await db.collection('jobs').doc(slug).get();
      if (!doc.exists) return reply.status(404).send({ error: 'Job not found' });

      const buildsSnap = await db.collection('jobs').doc(slug).collection('builds')
        .orderBy('buildNumber', 'desc').get();
      const builds = buildsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

      return reply.send({ id: slug, ...doc.data(), builds });
    } catch (err) {
      app.log.error(err);
      return reply.status(500).send({ error: 'Failed to fetch job' });
    }
  });

  app.post<{ Params: { slug: string } }>('/jobs/:slug/add-materials', async (req, reply) => {
    const { slug } = req.params;
    const { urls, notes } = req.body as { urls: string[]; notes?: string };
    if (!Array.isArray(urls) || urls.length === 0) {
      return reply.status(400).send({ error: 'urls array is required' });
    }
    try {
      const doc = await db.collection('jobs').doc(slug).get();
      if (!doc.exists) return reply.status(404).send({ error: 'Job not found' });

      const existing = (doc.data() as JobDocument).materials ?? [];
      const update: Record<string, any> = {
        materials: [...existing, ...urls],
        updatedAt: new Date(),
      };
      if (notes !== undefined) update.materialsNotes = notes.trim() || null;

      await db.collection('jobs').doc(slug).update(update);
      return reply.send({ ok: true });
    } catch (err) {
      app.log.error(err);
      return reply.status(500).send({ error: 'Failed to add materials' });
    }
  });

  app.post<{ Params: { slug: string } }>('/jobs/:slug/approve-build', async (req, reply) => {
    const { slug } = req.params;
    const { buildId } = req.body as { buildId: string };
    if (!buildId) return reply.status(400).send({ error: 'buildId is required' });

    try {
      const jobDoc = await db.collection('jobs').doc(slug).get();
      if (!jobDoc.exists) return reply.status(404).send({ error: 'Job not found' });
      const job = jobDoc.data() as JobDocument;

      if (job.status !== 'in_review') {
        return reply.status(400).send({ error: 'Job is not in review' });
      }

      const buildDoc = await db.collection('jobs').doc(slug)
        .collection('builds').doc(buildId).get();
      if (!buildDoc.exists) return reply.status(404).send({ error: 'Build not found' });
      const build = buildDoc.data() as BuildDocument;

      const businessDoc = await db.collection('businesses').doc(slug).get();
      if (!businessDoc.exists) return reply.status(404).send({ error: 'Business not found' });
      const business = businessDoc.data() as any;

      await db.collection('jobs').doc(slug).update({
        status: 'approved',
        approvedBuildId: buildId,
        approvedAt: new Date(),
        updatedAt: new Date(),
      });

      await db.collection('businesses').doc(slug).update({
        approvedBuildToken: build.stagingToken,
      });

      // Generate fresh payment link and portal invite
      let paymentLink = business.razorpayPaymentLink ?? null;
      let inviteLink: string | null = null;

      if (business.ownerEmail) {
        try {
          inviteLink = await getAuth().generatePasswordResetLink(business.ownerEmail);
        } catch (authErr) {
          app.log.warn({ authErr }, 'Could not generate portal invite link');
        }
      }

      return reply.send({ ok: true, paymentLink, inviteLink });
    } catch (err) {
      app.log.error(err);
      return reply.status(500).send({ error: 'Failed to approve build' });
    }
  });

  app.post<{ Params: { slug: string } }>('/jobs/:slug/retry-promotion', async (req, reply) => {
    const { slug } = req.params;
    try {
      const jobDoc = await db.collection('jobs').doc(slug).get();
      if (!jobDoc.exists) return reply.status(404).send({ error: 'Job not found' });
      const job = jobDoc.data() as JobDocument;

      if (job.status !== 'publish_pending') {
        return reply.status(400).send({ error: 'Job is not in publish_pending state' });
      }
      if (!job.approvedBuildId) {
        return reply.status(400).send({ error: 'No approved build to promote' });
      }

      const buildDoc = await db.collection('jobs').doc(slug)
        .collection('builds').doc(job.approvedBuildId).get();
      if (!buildDoc.exists) return reply.status(404).send({ error: 'Approved build not found' });
      const build = buildDoc.data() as BuildDocument;

      const businessRef = db.collection('businesses').doc(slug);
      const jobRef = db.collection('jobs').doc(slug);

      await promoteToProduction(slug, build, businessRef, jobRef, app.log);

      return reply.send({ ok: true });
    } catch (err: any) {
      app.log.error(err);
      return reply.status(500).send({ error: err?.message ?? 'Retry promotion failed' });
    }
  });
}

export async function promoteToProduction(
  slug: string,
  build: BuildDocument,
  businessRef: FirebaseFirestore.DocumentReference,
  jobRef: FirebaseFirestore.DocumentReference,
  log: any
) {
  const { S3Client, GetObjectCommand, PutObjectCommand } = await import('@aws-sdk/client-s3');

  const stagingS3 = new S3Client({
    region: 'auto',
    endpoint: process.env.STAGING_R2_ENDPOINT!,
    credentials: {
      accessKeyId: process.env.STAGING_R2_READ_KEY_ID!,
      secretAccessKey: process.env.STAGING_R2_READ_SECRET_KEY!,
    },
  });

  const prodS3 = new S3Client({
    region: 'auto',
    endpoint: process.env.R2_ENDPOINT!,
    credentials: {
      accessKeyId: process.env.R2_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_KEY!,
    },
  });

  const stagingObj = await stagingS3.send(new GetObjectCommand({
    Bucket: process.env.STAGING_R2_BUCKET!,
    Key: build.r2StagingKey,
  }));

  // Buffer the stream — S3 SDK requires known content length for PutObject
  const fileBytes = await stagingObj.Body!.transformToByteArray();

  const prodKey = build.r2StagingFilename;
  await prodS3.send(new PutObjectCommand({
    Bucket: process.env.R2_BUCKET!,
    Key: prodKey,
    Body: fileBytes,
    ContentLength: fileBytes.byteLength,
    ContentType: 'application/javascript',
    CacheControl: 'public, max-age=31536000, immutable',
  }));

  const prodUrl = `${process.env.CDN_BASE_URL}/${prodKey}`;

  const contentKeys = build.contentKeys ?? [];
  const buildDefaultContent: Record<string, string> = build.defaultContent ?? {};

  const businessSnap = await businessRef.get();
  const bizData = (businessSnap.data() as any) ?? {};
  const existingContent: Record<string, string> = bizData.content ?? {};
  // What we deployed last time — only exists after the first promotion using this system
  const previousDefault: Record<string, string> = bizData.promotedDefaultContent ?? {};
  const hasPromotionHistory = !!bizData.promotedDefaultContent;

  const cleanContent: Record<string, string> = {};
  for (const key of contentKeys) {
    const existing = existingContent[key] ?? '';
    const prevDefault = previousDefault[key] ?? '';
    // Without promotion history we can't tell customer edits from old defaults — use new defaults
    // With history: only preserve if the customer actually changed the value since last deploy
    const customerEdited = hasPromotionHistory && existing.trim() !== '' && existing !== prevDefault;
    cleanContent[key] = customerEdited ? existing : (buildDefaultContent[key] ?? '');
  }

  await businessRef.update({
    pageJsUrl: prodUrl,
    componentTagName: build.componentTagName,
    pageVersion: prodKey.replace('page.', '').replace('.js', ''),
    pageStatus: 'deployed',
    lastDeployedAt: new Date(),
    approvedBuildToken: null,
    contentKeys,
    content: cleanContent,
    promotedDefaultContent: buildDefaultContent,
  });

  await jobRef.update({ status: 'live', liveAt: new Date(), updatedAt: new Date() });

  log.info({ slug }, 'Promoted staging to production');
}
