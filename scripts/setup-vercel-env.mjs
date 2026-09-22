#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SITE_URL = 'https://mrsanabolics.com';

function run(cmd) {
  try {
    return execSync(cmd, { stdio: 'inherit', encoding: 'utf8' });
  } catch (error) {
    throw error;
  }
}

function checkCommand(cmd) {
  try {
    execSync(`command -v ${cmd}`, { stdio: 'ignore', shell: '/bin/bash' });
    return true;
  } catch {
    return false;
  }
}

async function main() {
  console.log('🚀 Setting up Vercel environment variables for Google Search Console...\n');

  // Check Vercel CLI
  if (!checkCommand('vercel')) {
    console.error('❌ Vercel CLI not found. Install with:');
    console.error('   npm i -g vercel');
    process.exit(1);
  }

  // Check if logged in
  const authPath = path.join(process.env.HOME || process.env.USERPROFILE || '~', '.vercel', 'auth.json');
  if (!fs.existsSync(authPath)) {
    console.error('❌ Not logged in to Vercel. Run:');
    console.error('   vercel login');
    process.exit(1);
  }

  try {
    console.log(`📝 Setting NEXT_PUBLIC_SITE_URL = "${SITE_URL}"...\n`);

    // Try to set the environment variable
    run(`vercel env add NEXT_PUBLIC_SITE_URL --value "${SITE_URL}" --environment production`);

    console.log('\n✅ Vercel environment variable set!\n');
    console.log('📋 Next steps:');
    console.log('   1. Push to main: git push origin main');
    console.log('   2. Wait for Vercel deployment');
    console.log('   3. Verify canonical URL:');
    console.log('      curl https://mrsanabolics.com/sitemap.xml | grep -o "https://[^<]*" | head -3');
    console.log('\n🔍 Then submit to Google Search Console:');
    console.log('   - Domain: mrsanabolics.com');
    console.log('   - Add DNS TXT record verification');
    console.log('   - Submit sitemap: https://mrsanabolics.com/sitemap.xml');
  } catch (error) {
    console.error('\n⚠️  Could not set environment variable via CLI.');
    console.error('   This might mean the variable already exists.');
    console.error('\nManual alternative:');
    console.error('   1. Go to: https://vercel.com/dashboard');
    console.error('   2. Select project → Settings → Environment Variables');
    console.error('   3. Add: NEXT_PUBLIC_SITE_URL = https://mrsanabolics.com');
    console.error('   4. Set for: Production');
    console.error('   5. Redeploy');

    if (process.argv.includes('--force')) {
      console.error('\n💥 Force mode: attempting to remove and re-add...');
      try {
        run('vercel env rm NEXT_PUBLIC_SITE_URL --environment production --yes');
        run(`vercel env add NEXT_PUBLIC_SITE_URL --value "${SITE_URL}" --environment production`);
        console.log('\n✅ Successfully set after removing previous value!');
      } catch (e) {
        console.error('❌ Force mode failed. Use Vercel dashboard instead.');
        process.exit(1);
      }
    } else {
      console.error('\nRun with --force to remove and re-add:');
      console.error('   npm run setup:vercel -- --force');
      process.exit(1);
    }
  }
}

main().catch((error) => {
  console.error('Error:', error.message);
  process.exit(1);
});
