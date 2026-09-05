import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

/*
  Capture the admin.

  Two things this asserts rather than assumes, both learned the hard way on this project:
  a page that failed to load photographs like a design catastrophe when it is really a broken
  server, and a screenshot taken before login silently captures the login screen instead. So
  it checks that a stylesheet is present and that the URL actually reached /admin, and fails
  loudly rather than producing misleading evidence.
*/

mkdirSync('.impeccable/review', { recursive: true });

const BASE = process.env.BASE ?? 'http://localhost:3000';
const EMAIL = process.env.ADMIN_EMAIL;
const PASSWORD = process.env.ADMIN_PASSWORD;

/*
  Credentials come from the environment, never from this file.

  A password written into a harness is a password in the repository, and a password in the
  repository is one nobody can rotate without a commit. Run these with --env-file=.env, which
  is gitignored and holds the real values.
*/
if (!EMAIL || !PASSWORD) {
  console.error(
    'Set ADMIN_EMAIL and ADMIN_PASSWORD (they live in .env). Run with: node --env-file=.env ' +
      process.argv[1]
  );
  process.exit(1);
}

const shots = JSON.parse(process.argv[2] ?? '[]');
if (shots.length === 0) {
  console.error('usage: node .impeccable/wp-shot.mjs \'[{"name":..,"path":..,"width":..,"height":..}]\'');
  process.exit(1);
}

const browser = await chromium.launch();
const errors = [];

for (const shot of shots) {
  const ctx = await browser.newContext({
    viewport: { width: shot.width ?? 1440, height: shot.height ?? 950 },
    reducedMotion: 'reduce',
    colorScheme: shot.scheme === 'dark' ? 'dark' : 'light',
  });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`${shot.name}: ${e.message.slice(0, 160)}`));

  await page.goto(BASE + '/admin/login', { waitUntil: 'networkidle', timeout: 90000 });
  await page.fill('#email', EMAIL);
  await page.fill('#password', PASSWORD);
  await page.click('button[type=submit]', { noWaitAfter: true });
  await page.waitForURL(/\/admin(\?|$)/, { timeout: 120000 }).catch(() => {});

  if (shot.path && shot.path !== '/admin') {
    await page.goto(BASE + shot.path, { waitUntil: 'networkidle', timeout: 90000 });
  }

  /* Never ship a capture of a page that did not actually render. */
  const stylesheets = await page.locator('link[rel=stylesheet]').count();
  if (stylesheets === 0) {
    console.error(`FAIL ${shot.name}: no stylesheet — the server is broken, not the design`);
    process.exit(1);
  }
  if (/\/admin\/login/.test(page.url())) {
    console.error(`FAIL ${shot.name}: still on the login screen — sign-in did not take`);
    process.exit(1);
  }

  if (shot.click) await page.click(shot.click).catch(() => {});
  if (shot.check) {
    const boxes = await page.locator('tbody input[type=checkbox]').all();
    for (const i of shot.check) if (boxes[i]) await boxes[i].check();
  }
  if (shot.scrollTo) await page.evaluate((y) => window.scrollTo(0, y), shot.scrollTo);

  await page.waitForTimeout(900);
  await page.screenshot({
    path: `.impeccable/review/${shot.name}.png`,
    fullPage: Boolean(shot.full),
  });

  console.log(
    `.impeccable/review/${shot.name}.png  ${shot.width ?? 1440}x${shot.height ?? 950}  ${shot.path ?? '/admin'}`
  );
  await ctx.close();
}

await browser.close();
if (errors.length) {
  console.log('\npage errors:');
  for (const e of errors) console.log('  ' + e);
}
