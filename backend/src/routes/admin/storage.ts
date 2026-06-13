import { FastifyInstance } from 'fastify';
import { S3Client, ListObjectsV2Command, DeleteObjectsCommand } from '@aws-sdk/client-s3';
import { db } from '../../firestore.js';
import { BusinessDocument } from '../../types.js';

function getS3(): S3Client | null {
  const endpoint = process.env.R2_ENDPOINT;
  const accessKeyId = process.env.R2_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_KEY;
  if (!endpoint || !accessKeyId || !secretAccessKey) return null;
  return new S3Client({ endpoint, region: 'auto', credentials: { accessKeyId, secretAccessKey } });
}

const BUCKET = () => process.env.R2_BUCKET ?? '';

// Lists all .js files in the bucket (handles pagination)
async function listBucketFiles(s3: S3Client): Promise<string[]> {
  const files: string[] = [];
  let continuationToken: string | undefined;
  do {
    const res = await s3.send(new ListObjectsV2Command({
      Bucket: BUCKET(),
      ContinuationToken: continuationToken,
    }));
    for (const obj of res.Contents ?? []) {
      if (obj.Key?.endsWith('.js')) files.push(obj.Key);
    }
    continuationToken = res.NextContinuationToken;
  } while (continuationToken);
  return files;
}

// Returns all non-null pageVersion hashes from Firestore
async function getActiveHashes(): Promise<Set<string>> {
  const snapshot = await db.collection('businesses').get();
  const hashes = new Set<string>();
  for (const doc of snapshot.docs) {
    const version = (doc.data() as BusinessDocument).pageVersion;
    if (version) hashes.add(version);
  }
  return hashes;
}

// page.DryGdMKX.js → DryGdMKX
function extractHash(key: string): string | null {
  const match = key.match(/^page\.([A-Za-z0-9]+)\.js$/);
  return match ? match[1] : null;
}

export async function adminStorageRoute(app: FastifyInstance) {
  // Scan — returns orphaned files without deleting anything
  app.get('/storage/orphans', async (req, reply) => {
    const s3 = getS3();
    if (!s3 || !BUCKET()) return reply.status(503).send({ error: 'R2 not configured on this server' });

    try {
      const [allFiles, activeHashes] = await Promise.all([
        listBucketFiles(s3),
        getActiveHashes(),
      ]);

      const orphans = allFiles.filter((key) => {
        const hash = extractHash(key);
        return hash !== null && !activeHashes.has(hash);
      });

      return reply.send({
        totalFiles: allFiles.length,
        activeCount: activeHashes.size,
        orphanCount: orphans.length,
        orphans,
      });
    } catch (err) {
      app.log.error(err);
      return reply.status(500).send({ error: 'Failed to scan bucket' });
    }
  });

  // Delete — removes all orphaned files in one batch request
  app.delete('/storage/orphans', async (req, reply) => {
    const s3 = getS3();
    if (!s3 || !BUCKET()) return reply.status(503).send({ error: 'R2 not configured on this server' });

    try {
      const [allFiles, activeHashes] = await Promise.all([
        listBucketFiles(s3),
        getActiveHashes(),
      ]);

      const orphans = allFiles.filter((key) => {
        const hash = extractHash(key);
        return hash !== null && !activeHashes.has(hash);
      });

      if (orphans.length === 0) {
        return reply.send({ deleted: 0, files: [] });
      }

      await s3.send(new DeleteObjectsCommand({
        Bucket: BUCKET(),
        Delete: { Objects: orphans.map((key) => ({ Key: key })) },
      }));

      app.log.info({ count: orphans.length, files: orphans }, 'Deleted orphaned page bundles');
      return reply.send({ deleted: orphans.length, files: orphans });
    } catch (err) {
      app.log.error(err);
      return reply.status(500).send({ error: 'Failed to delete orphans' });
    }
  });
}
