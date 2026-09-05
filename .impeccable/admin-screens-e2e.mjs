import { chromium } from 'playwright-core';

/*
  Every admin screen loads, is reachable from the menu, and renders its own heading.

  This exists because the other suites cannot catch what it catches. `next build` prerenders the
  storefront but every /admin route is `force-dynamic`, so a screen that throws at request time
  compiles perfectly and fails only when somebody opens it. `admin-areas-e2e.mjs` checks the
  rules behind the data and never renders anything.

  Three things are asserted per screen, and the second and third are the ones that have actually
  caught bugs on this project:

  - it answered 200 and put its heading on the page;
  - it did not quietly bounce back to /admin/login, which is what a broken session check looks
    like from the outside;
  - it logged no client-side exception, which is how a bad `runAction` call site or a React 19
    form idiom shows up in React 18 — the page renders and the controls silently do nothing.

  One browser context for the whole run: signing in 15 times is 15 bcrypt verifications and the
  suite spends longer logging in than looking.

    node --env-file=.env .impeccable/admin-screens-e2e.mjs
*/

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

/* path, and a heading that only that screen renders. */
const SCREENS = [
  ['/admin', 'Dashboard'],
  ['/admin/products', 'Products'],
  ['/admin/orders', 'Orders'],
  ['/admin/delivery', 'Delivery'],
  ['/admin/discounts', 'Discounts'],
  ['/admin/discounts/new', 'Add discount'],
  ['/admin/contacts', 'Contacts'],
  ['/admin/enquiries', 'Enquiries'],
  ['/admin/analytics', 'Analytics'],
  ['/admin/subscribers', 'Subscribers'],
  ['/admin/messages', 'Messages'],
  ['/admin/campaigns', 'Campaigns'],
  ['/admin/campaigns/new', 'campaign'],
  ['/admin/reviews', 'Reviews'],
  ['/admin/search', 'Search'],
  ['/admin/media', 'Media'],
  ['/admin/blog', 'Journal'],
  ['/admin/payments', 'Payments'],
  ['/admin/email', 'Email'],
  ['/admin/settings', 'Settings'],
];

/* Every top-level entry the menu must offer. */
const MENU_LINKS = [
  '/admin/delivery',
  '/admin/discounts',
  '/admin/analytics',
  '/admin/reviews',
  '/admin/search',
  '/admin/payments',
  '/admin/email',
  '/admin/settings',
];

const fails = [];
const ok = (label, pass, detail = '') => {
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${label}${detail ? '  — ' + detail : ''}`);
  if (!pass) fails.push(label);
};

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 } });
const page = await ctx.newPage();

let pageErrors = [];
page.on('pageerror', (e) => pageErrors.push(e.message.slice(0, 160)));

try {
  await page.goto(`${BASE}/admin/login`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.fill('#email', EMAIL);
  await page.fill('#password', PASSWORD);
  await page.click('button[type=submit]', { noWaitAfter: true });
  await page.waitForURL(/\/admin(\?|$)/, { timeout: 120000 });
  ok('signed in', !/\/admin\/login/.test(page.url()), page.url());

  for (const [path, heading] of SCREENS) {
    pageErrors = [];
    const response = await page
      .goto(BASE + path, { waitUntil: 'domcontentloaded', timeout: 120000 })
      .catch(() => null);

    const status = response?.status() ?? 0;
    const bounced = /\/admin\/login/.test(page.url());

    /* The heading match is case-insensitive and partial: the point is that THIS screen
       rendered, not that its wording is frozen. */
    const body = await page.locator('body').innerText().catch(() => '');
    const hasHeading = body.toLowerCase().includes(heading.toLowerCase());

    ok(
      `${path} loads`,
      status === 200 && !bounced && hasHeading,
      status !== 200
        ? `status ${status}`
        : bounced
          ? 'bounced to login'
          : hasHeading
            ? ''
            : `no "${heading}" on the page`
    );

    if (pageErrors.length) {
      ok(`${path} throws nothing in the browser`, false, pageErrors[0]);
    }
  }

  /* The menu is how anybody actually reaches these; an unlinked screen is an absent one. */
  await page.goto(`${BASE}/admin`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  for (const href of MENU_LINKS) {
    const count = await page.locator(`#adminmenu a[href="${href}"]`).count();
    ok(`the menu links to ${href}`, count > 0);
  }

  /* wp-admin puts the count of things awaiting a person in the bar; ours is the review queue. */
  const bubble = await page.locator('#wpadminbar .wp-bubble').first().innerText().catch(() => '');
  ok('the admin bar carries a review-queue count', /^\d+$/.test(bubble.trim()), bubble);
} catch (error) {
  console.error(error);
  fails.push('the suite threw');
} finally {
  await browser.close();

  console.log('');
  if (fails.length) {
    console.log(`${fails.length} failed:`);
    for (const f of fails) console.log(`  - ${f}`);
    process.exitCode = 1;
  } else {
    console.log('All screens loaded.');
  }
}
