import { execSync } from 'child_process';
import { readdirSync, readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../../backend/.env') });

// ── Config ────────────────────────────────────────────────────────────────────
const slug = process.env.npm_config_slug;
if (!slug) throw new Error('Usage: npm run deploy --slug=your_slug');
if (!/^[a-z0-9_]+$/.test(slug)) {
  throw new Error('Slug must be lowercase letters, numbers, underscores only');
}

const tagName = `taplab-page-${slug.replace(/_/g, '-')}`;
const pageDir = path.resolve(__dirname, '../../', slug.replace(/_/g, '-'));
const distDir = path.join(pageDir, 'dist');

// ── Step 1: Build ─────────────────────────────────────────────────────────────
console.log(`\n[1/3] Building ${slug}...`);
try {
  execSync('npm run build', { cwd: pageDir, stdio: 'inherit' });
} catch (error) {
  console.error('Build failed');
  process.exit(1);
}

// Find the output file (e.g., page.abcd1234.js)
const distFiles = readdirSync(distDir).filter((f) => f.endsWith('.js'));
if (distFiles.length !== 1) {
  throw new Error(`Expected 1 JS file in dist, found: ${distFiles.join(', ')}`);
}
const filename = distFiles[0]; // e.g. page.abcd1234.js
const hash = filename.replace('page.', '').replace('.js', ''); // e.g. abcd1234

// ── Step 2: Upload to Backblaze B2 (or fall back to local) ───────────────────
const b2Endpoint = process.env.B2_ENDPOINT;
const b2Bucket = process.env.B2_BUCKET;
const b2KeyId = process.env.B2_KEY_ID;
const b2AppKey = process.env.B2_APP_KEY;
const cdnBase = process.env.CDN_BASE_URL;

let pageUrl: string;

if (b2Endpoint && b2Bucket && b2KeyId && b2AppKey && cdnBase) {
  console.log(`\n[2/3] Uploading to Backblaze B2...`);

  const b2Region = b2Endpoint.match(/s3\.(.+)\.backblazeb2\.com/)?.[1] ?? 'us-west-004';
  const s3 = new S3Client({
    endpoint: b2Endpoint,
    region: b2Region,
    credentials: { accessKeyId: b2KeyId, secretAccessKey: b2AppKey },
  });

  const fileContent = readFileSync(path.join(distDir, filename));
  await s3.send(new PutObjectCommand({
    Bucket: b2Bucket,
    Key: filename,
    Body: fileContent,
    ContentType: 'application/javascript',
    CacheControl: 'public, max-age=31536000, immutable',
  }));

  pageUrl = `${cdnBase}/${filename}`;
  console.log(`  → Uploaded: ${pageUrl}`);
} else {
  console.log(`\n[2/3] B2 env vars not set — using local mode`);
  pageUrl = `http://localhost:5174/${filename}`;
  console.log(`  → Local URL: ${pageUrl}`);
}

// ── Step 3: Update Firestore ──────────────────────────────────────────────────
console.log(`\n[3/3] Updating Firestore for ${slug}...`);

// Initialize Firebase Admin if not already initialized
if (getApps().length === 0) {
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT
    ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
    : undefined;

  initializeApp({
    credential: serviceAccount ? cert(serviceAccount) : undefined,
    projectId: process.env.FIREBASE_PROJECT_ID,
  });
}

const db = getFirestore();
const docRef = db.collection('businesses').doc(slug);

const doc = await docRef.get();
if (!doc.exists) {
  throw new Error(`Business document not found in Firestore for slug: ${slug}`);
}

await docRef.update({
  pageJsUrl: pageUrl,
  componentTagName: tagName,
  pageVersion: hash,
  pageStatus: 'deployed',
  lastDeployedAt: new Date(),
});

console.log(`\n✅ Deploy complete!`);
console.log(`   Slug:    ${slug}`);
console.log(`   Tag:     ${tagName}`);
console.log(`   Version: ${hash}`);
console.log(`   URL:     ${pageUrl}`);
