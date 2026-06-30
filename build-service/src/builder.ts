import { execSync } from 'child_process';
import { cpSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WARM_TEMPLATE_DIR = path.resolve(__dirname, '../warm-template');

function getStagingS3(): S3Client {
  return new S3Client({
    region: 'auto',
    endpoint: process.env.STAGING_R2_ENDPOINT!,
    credentials: {
      accessKeyId: process.env.STAGING_R2_KEY_ID!,
      secretAccessKey: process.env.STAGING_R2_SECRET_KEY!,
    },
  });
}

export async function buildHandler(params: {
  slug: string;
  appTsx: string;
  contentTs: string;
  claudeModel: string;
  buildNumber: number;
  token: string;
}): Promise<{ r2StagingKey: string; r2StagingFilename: string; componentTagName: string }> {
  const { slug, appTsx, contentTs, buildNumber, token } = params;

  const tagName = `taplab-page-${slug.replace(/_/g, '-')}`;
  const tempDir = `/tmp/taplab-build-${slug}-${buildNumber}`;

  // Clean up any previous failed attempt
  try { rmSync(tempDir, { recursive: true, force: true }); } catch {}

  try {
    // 1. Fast-copy the warm template (no npm install needed — deps already present)
    cpSync(WARM_TEMPLATE_DIR, tempDir, { recursive: true });

    // 2. Inject the developer's files
    writeFileSync(path.join(tempDir, 'src', 'App.tsx'), appTsx, 'utf8');
    writeFileSync(path.join(tempDir, 'src', 'content.ts'), contentTs, 'utf8');

    // 3. Patch main.tsx — replace hardcoded TAG_NAME and SLUG
    const mainPath = path.join(tempDir, 'src', 'main.tsx');
    let mainContent = readFileSync(mainPath, 'utf8');
    mainContent = mainContent.replace(
      /const TAG_NAME = '[^']*';/,
      `const TAG_NAME = '${tagName}';`
    );
    mainContent = mainContent.replace(
      /const SLUG = '[^']*';/,
      `const SLUG = '${slug}';`
    );
    writeFileSync(mainPath, mainContent, 'utf8');

    // 4. Build
    execSync('npx vite build', {
      cwd: tempDir,
      timeout: 120_000,
      stdio: 'pipe',
    });

    // 5. Find the output JS file
    const distDir = path.join(tempDir, 'dist');
    const distFiles = readdirSync(distDir).filter((f) => f.endsWith('.js'));
    if (distFiles.length !== 1) {
      throw new Error(`Expected 1 JS file in dist, got: ${distFiles.join(', ')}`);
    }
    const filename = distFiles[0]; // e.g. page.abcd1234.js
    const fileContent = readFileSync(path.join(distDir, filename));

    // 6. Upload to staging R2
    const r2StagingKey = `${slug}/${token}/${filename}`;
    const bucket = process.env.STAGING_R2_BUCKET!;

    if (process.env.STAGING_R2_ENDPOINT && process.env.STAGING_R2_KEY_ID) {
      const s3 = getStagingS3();
      await s3.send(new PutObjectCommand({
        Bucket: bucket,
        Key: r2StagingKey,
        Body: fileContent,
        ContentType: 'application/javascript',
        CacheControl: 'no-store',
      }));
    }

    return { r2StagingKey, r2StagingFilename: filename, componentTagName: tagName };
  } finally {
    // Always clean up the temp directory
    try { rmSync(tempDir, { recursive: true, force: true }); } catch {}
  }
}
