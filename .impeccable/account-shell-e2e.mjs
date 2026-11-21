/*
  The sign-in and account pages as a phone app (21 November 2026).

  BASE=http://localhost:3212 OUT=<folder for screenshots> node --env-file=.env .impeccable/account-shell-e2e.mjs

  Opens an account through the real form at 390x844, then checks what makes the pages feel like
  an app rather than a website:
  - the form's fields are 16px, so an iPhone does not zoom the page when one is tapped;
  - the account's sections switch with NO request to the server, the address follows, and the
    browser's back and forward move between the overview and a section;
  - the tab bar's Account button returns a section to the overview without a navigation;
  - Wishlist opens /wishlist for everybody, and the old /account?tab=wishlist lands there;
  - a signed-out visitor sent to sign in comes back to the section they asked for.
  The probe account (…@example.test) and its contact are deleted at the end, whatever happens.
*/
import { chromium } from 'playwright-core';
import { PrismaClient } from '@prisma/client';

const BASE = process.env.BASE ?? 'http://localhost:3212';
const OUT = process.env.OUT ?? null;
const stamp = Date.now().toString(36);
const EMAIL = `shell-probe-${stamp}@example.test`;
const PASSWORD = `Probe-${stamp}-long-enough!`;

const results = [];
const ok = (name, pass, detail = '') => {
  results.push(pass);
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ` (${detail})` : ''}`);
};

const prisma = new PrismaClient();
const browser = await chromium.launch();

try {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  const shot = async (name) => {
    if (OUT) await page.screenshot({ path: `${OUT}/${name}.png` });
  };

  /* Requests the page makes for /account, to prove a section switch asks the server nothing. */
  let accountRequests = 0;
  page.on('request', (r) => {
    const u = new URL(r.url());
    if (u.pathname === '/account') accountRequests += 1;
  });

  await page.goto(`${BASE}/auth`, { waitUntil: 'networkidle', timeout: 120_000 });
  await shot('auth-login');
  const size = await page.locator('#email').evaluate((el) => getComputedStyle(el).fontSize);
  ok('sign-in fields are 16px (no iPhone zoom)', size === '16px', size);
  ok('form no longer repeats the logo', (await page.locator('main a[href="/"] >> text=MrsAnabolics').count()) === 0);

  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await page.locator('#name').waitFor();
  await shot('auth-register');
  await page.fill('#name', 'Shell Probe');
  await page.fill('#email', EMAIL);
  await page.fill('#password', PASSWORD);
  await page.getByRole('button', { name: 'Show password' }).click();
  ok('show password reveals it', (await page.locator('#password').getAttribute('type')) === 'text');
  await Promise.all([
    page.waitForURL(`${BASE}/account`, { timeout: 90_000 }),
    page.locator('form').getByRole('button', { name: /Create account/ }).click(),
  ]);
  await page.waitForLoadState('networkidle');
  await shot('account-overview');
  ok('account opens on the overview', await page.getByRole('navigation', { name: 'Account sections' }).first().isVisible());

  accountRequests = 0;
  const t0 = Date.now();
  await page.locator('nav[aria-label="Account sections"] a', { hasText: 'My orders' }).last().click();
  await page.getByRole('heading', { name: 'My orders' }).first().waitFor();
  const took = Date.now() - t0;
  ok('My orders opens at once', took < 800, `${took}ms`);
  ok('…with no request to the server', accountRequests === 0, `${accountRequests} request(s)`);
  ok('…and the address follows', page.url() === `${BASE}/account?tab=orders`, page.url());
  await shot('account-orders');

  await page.goBack();
  await page.waitForTimeout(400);
  ok('back returns to the overview', page.url() === `${BASE}/account` && (await page.getByText('Recent orders').isVisible()), page.url());
  await page.goForward();
  await page.waitForTimeout(400);
  ok('forward opens the section again', await page.getByRole('heading', { name: 'My orders' }).first().isVisible(), page.url());

  await page.getByRole('link', { name: 'Back to your account' }).click();
  ok('the arrow returns to the overview', await page.getByText('Recent orders').isVisible());

  await page.locator('nav[aria-label="Account sections"] a', { hasText: 'Settings' }).last().click();
  await page.getByRole('heading', { name: 'Settings' }).first().waitFor();
  await shot('account-settings');
  accountRequests = 0;
  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: /Account/ }).click();
  await page.waitForTimeout(500);
  ok('tab bar Account goes back to the overview', await page.getByText('Recent orders').isVisible());
  ok('…without a navigation', accountRequests === 0 && page.url() === `${BASE}/account`, `${accountRequests} request(s), ${page.url()}`);

  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: /Wishlist/ }).click();
  await page.waitForURL(`${BASE}/wishlist`);
  await page.getByRole('heading', { name: 'Saved' }).waitFor();
  await shot('wishlist');
  ok('tab bar Wishlist opens /wishlist', true);

  await page.goto(`${BASE}/account?tab=wishlist`, { waitUntil: 'domcontentloaded' });
  ok('old /account?tab=wishlist lands on /wishlist', new URL(page.url()).pathname === '/wishlist', page.url());

  /* The same session at desktop width: the sections run down the side instead. */
  const desk = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    reducedMotion: 'reduce',
    storageState: await context.storageState(),
  });
  const deskPage = await desk.newPage();
  await deskPage.goto(`${BASE}/account?tab=orders`, { waitUntil: 'networkidle', timeout: 120_000 });
  ok('desktop shows the side list', await deskPage.locator('nav[aria-label="Account sections"]').first().isVisible());
  if (OUT) await deskPage.screenshot({ path: `${OUT}/account-desktop.png` });
  await desk.close();

  await context.clearCookies();
  await page.goto(`${BASE}/account?tab=orders`, { waitUntil: 'domcontentloaded' });
  const next = new URL(page.url()).searchParams.get('next');
  ok('signed out, the sign-in keeps the section', next === '/account?tab=orders', page.url());

  await page.goto(`${BASE}/wishlist`, { waitUntil: 'networkidle' });
  ok('/wishlist works signed out', await page.getByRole('heading', { name: 'Saved' }).isVisible());

  await page.goto(`${BASE}/auth?mode=forgot`, { waitUntil: 'networkidle' });
  await shot('auth-forgot');
  await context.close();
} catch (error) {
  console.error(error);
  results.push(false);
} finally {
  await browser.close().catch(() => {});
  const customers = await prisma.customer.deleteMany({ where: { email: EMAIL } }).catch((e) => e);
  const contacts = await prisma.contact.deleteMany({ where: { email: EMAIL } }).catch((e) => e);
  console.log(`cleanup: customers ${customers?.count ?? customers}, contacts ${contacts?.count ?? contacts}`);
  await prisma.$disconnect();
}

const failed = results.filter((r) => !r).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
