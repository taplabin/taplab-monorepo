#!/usr/bin/env node
// Usage: node scripts/new-page.js <slug> "<Business Name>"
// Example: node scripts/new-page.js the-gluck "THE GLÜCK"

const { readdirSync, statSync, mkdirSync, copyFileSync, readFileSync, writeFileSync, existsSync } = require('fs');
const { join, dirname } = require('path');

const [,, slug, businessName] = process.argv;

if (!slug || !businessName) {
  console.error('\nUsage: node scripts/new-page.js <slug> "<Business Name>"');
  console.error('Example: node scripts/new-page.js the-gluck "THE GLÜCK"\n');
  process.exit(1);
}

if (!/^[a-z0-9-]+$/.test(slug)) {
  console.error('\nSlug must be lowercase letters, numbers, and hyphens only.\n');
  process.exit(1);
}

const root = join(__dirname, '..');
const templateDir = join(root, 'pages', 'template');
const newPageDir = join(root, 'pages', slug);

if (existsSync(newPageDir)) {
  console.error(`\nDirectory already exists: pages/${slug}\n`);
  process.exit(1);
}

const SKIP = ['node_modules', 'dist', '.git'];

function copyDir(src, dest) {
  mkdirSync(dest, { recursive: true });
  for (const entry of readdirSync(src)) {
    if (SKIP.includes(entry)) continue;
    const srcPath = join(src, entry);
    const destPath = join(dest, entry);
    if (statSync(srcPath).isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      copyFileSync(srcPath, destPath);
    }
  }
}

console.log(`\nScaffolding pages/${slug}...`);
copyDir(templateDir, newPageDir);

const slugUnderscored = slug.replace(/-/g, '_');

// Update main.tsx: TAG_NAME and SLUG
const mainPath = join(newPageDir, 'src', 'main.tsx');
let main = readFileSync(mainPath, 'utf8');
main = main.replace("'taplab-page-template'", `'taplab-page-${slug}'`);
main = main.replace("const SLUG = 'template'", `const SLUG = '${slugUnderscored}'`);
writeFileSync(mainPath, main);

// Update package.json: name
const pkgPath = join(newPageDir, 'package.json');
let pkg = readFileSync(pkgPath, 'utf8');
pkg = pkg.replace('@taplab/page-template', `@taplab/page-${slug}`);
writeFileSync(pkgPath, pkg);

// Update index.html: custom element tag
const htmlPath = join(newPageDir, 'index.html');
let html = readFileSync(htmlPath, 'utf8');
html = html.replace('taplab-page-template', `taplab-page-${slug}`);
writeFileSync(htmlPath, html);

console.log(`
✅ Done! pages/${slug}/ is ready.

   TAG_NAME : taplab-page-${slug}
   SLUG     : ${slugUnderscored}
   Business : ${businessName}

Next steps:
  1. Use Claude web with TAPLAB_PROMPT.md + menu images to generate App.tsx & content.ts
     → Tell Claude: slug="${slug}", business name="${businessName}"
  2. Drop the two files into pages/${slug}/src/
  3. cd pages/${slug} && npm install
  4. npm run dev          ← preview locally
  5. npm run build        ← confirm build passes
  6. Create Firestore doc for slug: ${slugUnderscored}  ← via admin panel
  7. npm run deploy --slug=${slugUnderscored}
`);
