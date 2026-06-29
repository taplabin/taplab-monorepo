import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const email = process.argv[2];
if (!email) {
  console.error('Usage: npx tsx scripts/set-dev.ts <email>');
  process.exit(1);
}

initializeApp({
  credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT!)),
});

let user;
try {
  user = await getAuth().getUserByEmail(email);
} catch {
  // Account doesn't exist yet — create it with a temporary password
  user = await getAuth().createUser({ email });
  const resetLink = await getAuth().generatePasswordResetLink(email);
  console.log(`\n🆕 New account created.`);
  console.log(`   Send this password-reset link to the developer:\n   ${resetLink}\n`);
}

await getAuth().setCustomUserClaims(user.uid, { dev: true });
console.log(`✅ Dev claim set for ${email} (uid: ${user.uid})`);
console.log('   If they were already signed in, they must sign out and back in.');
