import { execSync } from 'child_process';
import { readdirSync, readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';
import { defaultContent } from '../src/content.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../../backend/.env') });
// ── Config ────────────────────────────────────────────────────────────────────
const slug = process.env.npm_config_slug;
if (!slug)
    throw new Error('Usage: npm run deploy --slug=your_slug');
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
}
catch (error) {
    console.error('Build failed');
    process.exit(1);
}
// Find the output file (e.g., page.abcd1234.js)
const distFiles = readdirSync(distDir).filter((f) => f.endsWith('.js'));
if (distFiles.length !== 1) {
    throw new Error(`Expected 1 JS file in dist, found: ${distFiles.join(', ')}`);
}
const filename = distFiles[0];
const hash = filename.replace('page.', '').replace('.js', '');
// ── Step 2: Upload to Cloudflare R2 (or fall back to local) ──────────────────
const r2Endpoint = process.env.R2_ENDPOINT;
const r2Bucket = process.env.R2_BUCKET;
const r2KeyId = process.env.R2_KEY_ID;
const r2SecretKey = process.env.R2_SECRET_KEY;
const cdnBase = process.env.CDN_BASE_URL;
let pageUrl;
if (r2Endpoint && r2Bucket && r2KeyId && r2SecretKey && cdnBase) {
    console.log(`\n[2/3] Uploading to Cloudflare R2...`);
    const s3 = new S3Client({
        endpoint: r2Endpoint,
        region: 'auto',
        credentials: { accessKeyId: r2KeyId, secretAccessKey: r2SecretKey },
    });
    const fileContent = readFileSync(path.join(distDir, filename));
    await s3.send(new PutObjectCommand({
        Bucket: r2Bucket,
        Key: filename,
        Body: fileContent,
        ContentType: 'application/javascript',
        CacheControl: 'public, max-age=31536000, immutable',
    }));
    pageUrl = `${cdnBase}/${filename}`;
    console.log(`  → Uploaded: ${pageUrl}`);
}
else {
    console.log(`\n[2/3] R2 env vars not set — using local mode`);
    pageUrl = `http://localhost:5174/${filename}`;
    console.log(`  → Local URL: ${pageUrl}`);
}
// ── Step 3: Update Firestore ──────────────────────────────────────────────────
console.log(`\n[3/3] Updating Firestore for ${slug}...`);
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
// Merge defaultContent with existing content — preserves customer edits,
// adds any new keys introduced in this deploy
const existingContent = (doc.data()?.content ?? {});
const mergedContent = { ...defaultContent, ...existingContent };
await docRef.update({
    pageJsUrl: pageUrl,
    componentTagName: tagName,
    pageVersion: hash,
    pageStatus: 'deployed',
    lastDeployedAt: new Date(),
    content: mergedContent,
});
console.log(`\n✅ Deploy complete!`);
console.log(`   Slug:    ${slug}`);
console.log(`   Tag:     ${tagName}`);
console.log(`   Version: ${hash}`);
console.log(`   URL:     ${pageUrl}`);
