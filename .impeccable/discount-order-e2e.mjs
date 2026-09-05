import { chromium } from 'playwright-core';
import { PrismaClient } from '@prisma/client';

/*
  Record an order with a discount code through the real admin, and check the money afterwards.

  This is the one test that proves the discount feature is connected rather than merely present.
  Everything else about discounts can pass while the code does nothing: the validate endpoint can
  return the right number, the admin screens can list and edit codes, and the order can still be
  written at full price with no redemption recorded — which is exactly the state this suite was
  written to catch.

  What it asserts, in order of how expensive each would be to get wrong:

  - the discount is APPLIED to the order total, not just quoted;
  - the code and the amount are SNAPSHOTTED onto the order, so editing the discount later cannot
    restate what somebody was given;
  - a DiscountRedemption row exists and `usageCount` moved, because without both a usage limit is
    decorative and a one-use code can be handed out for ever;
  - the amount is decided by the SERVER: the form posts a code, never a figure.

  Needs the app running (`npm start` or `npm run dev`). Leaves the database as it found it.

    node --env-file=.env .impeccable/discount-order-e2e.mjs
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

const prisma = new PrismaClient();
const stamp = Date.now();
const CODE = `PROBE${stamp}`;
const CONTACT_EMAIL = `discount-probe-${stamp}@example.test`;

const fails = [];
const ok = (label, pass, detail = '') => {
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${label}${detail ? '  — ' + detail : ''}`);
  if (!pass) fails.push(label);
};

let contactId = null;
let discountId = null;
let orderId = null;

const browser = await chromium.launch();

try {
  /* ------------------------------------------------------------------- fixtures */

  const contact = await prisma.contact.create({
    data: { email: CONTACT_EMAIL, name: 'Discount Probe', firstSource: 'harness' },
  });
  contactId = contact.id;

  const discount = await prisma.discount.create({
    data: {
      code: CODE,
      description: 'Harness probe',
      type: 'PERCENTAGE',
      value: '25',
      status: 'ACTIVE',
      usageLimit: 5,
    },
  });
  discountId = discount.id;

  /* The form lists products by name ascending, so the first one is always on the page. */
  const product = await prisma.product.findFirst({
    orderBy: { name: 'asc' },
    select: { id: true, name: true, price: true },
  });
  if (!product) throw new Error('No product to order.');
  const unit = Number(product.price);

  /* ----------------------------------------------------------------- the admin */

  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1200 } });
  const page = await ctx.newPage();
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(e.message.slice(0, 200)));

  /*
    `networkidle`, not `domcontentloaded`. The sign-in button is wired by client JavaScript, and
    clicking before hydration submits the bare form to /api/admin/login, which answers JSON — so
    the browser sits on the endpoint and the wait times out on a login that was never attempted.
  */
  await page.goto(`${BASE}/admin/login`, { waitUntil: 'networkidle', timeout: 180000 });
  await page.fill('#email', EMAIL);
  await page.fill('#password', PASSWORD);
  await page.click('button[type=submit]', { noWaitAfter: true });
  await page.waitForURL(/\/admin(\?|$)/, { timeout: 180000 });

  /*
    `networkidle` again. Typing into this form before React has hydrated sets the DOM value
    without React ever seeing the change event, so the quantity is invisible to the component
    and the submit button — which unlocks only once a line exists — stays disabled for ever.
  */
  await page.goto(`${BASE}/admin/orders/new`, { waitUntil: 'networkidle', timeout: 180000 });

  await page.selectOption('#contactId', contact.id);

  /*
    Take a product from the rows the form already shows rather than driving the search box.
    The form lists the first slice of the catalogue by name, which is the same order the page
    queries in, so the first row is deterministic — and the point of this suite is the money,
    not the filter. The search box has its own check further down.
  */
  await page.waitForSelector(`#qty-${product.id}`, { timeout: 60000 });
  await page.fill(`#qty-${product.id}`, '2');

  /* The button unlocks only once a line exists, which is the signal the quantity registered. */
  await page
    .waitForFunction(
      () => {
        const button = document.querySelector('button[type=submit]');
        return button instanceof HTMLButtonElement && !button.disabled;
      },
      { timeout: 30000 }
    )
    .catch(() => {});
  ok(
    'setting a quantity enables the submit button',
    await page.locator('button[type=submit]').isEnabled()
  );

  await page.fill('#shippingCost', '10.00');
  await page.fill('#shippingMethod', 'Standard tracked');
  await page.fill('#discountCode', CODE.toLowerCase()); // lower-case on purpose

  await page.fill('#shipName', 'Discount Probe');
  await page.fill('#shipLine1', '1 Harness Way');
  await page.fill('#shipCity', 'Testville');
  await page.fill('#shipPostcode', 'TE5 7ER');
  await page.fill('#shipCountry', 'US');

  await page.click('button[type=submit]');

  /*
    Poll the database rather than waiting on a notice or a URL. The form navigates with
    router.push, which fires no load event — the trap documented in CLAUDE.md — and the write is
    what is actually being tested.
  */
  let order = null;
  for (let attempt = 0; attempt < 60 && !order; attempt++) {
    order = await prisma.order.findFirst({
      where: { contactId: contact.id },
      include: { items: true },
    });
    if (!order) await new Promise((r) => setTimeout(r, 1000));
  }

  ok('the order was recorded', Boolean(order));
  if (!order) throw new Error('no order was written');
  orderId = order.id;

  ok('no page error while recording it', pageErrors.length === 0, pageErrors[0] ?? '');

  /* ------------------------------------------------------------------ the money */

  const subtotal = Number(order.subtotal);
  const expectedSubtotal = unit * 2;
  ok(
    'the subtotal is the lines at the price on the day',
    Math.abs(subtotal - expectedSubtotal) < 0.01,
    `${subtotal} vs ${expectedSubtotal}`
  );

  ok(
    'the code was matched case-insensitively and snapshotted upper-case',
    order.discountCode === CODE,
    String(order.discountCode)
  );

  const expectedDiscount = Math.round(expectedSubtotal * 0.25 * 100) / 100;
  ok(
    'the discount amount was decided by the server from the code alone',
    Math.abs(Number(order.discountTotal) - expectedDiscount) < 0.01,
    `${order.discountTotal} vs ${expectedDiscount}`
  );

  ok(
    'the total has the discount taken off, not merely displayed',
    Math.abs(Number(order.total) - (expectedSubtotal - expectedDiscount + 10)) < 0.01,
    `total ${order.total}`
  );

  ok('the delivery method was snapshotted', order.shippingMethod === 'Standard tracked');

  /* -------------------------------------------------------------- the redemption */

  const after = await prisma.discount.findUnique({
    where: { id: discount.id },
    select: { usageCount: true },
  });
  ok(
    'the code counted its use, so a usage limit means something',
    after.usageCount === 1,
    `usageCount ${after.usageCount}`
  );

  const redemption = await prisma.discountRedemption.findFirst({
    where: { discountId: discount.id },
  });
  ok('a redemption row records which order used it', redemption?.orderReference === order.reference);
  ok(
    'the redemption records what it was worth',
    redemption && Math.abs(Number(redemption.amount) - expectedDiscount) < 0.01
  );

  /* ------------------------------------------- the snapshot survives the discount */

  await prisma.discount.update({ where: { id: discount.id }, data: { value: '90' } });
  const reread = await prisma.order.findUnique({
    where: { id: order.id },
    select: { discountTotal: true, discountCode: true },
  });
  ok(
    'repricing the discount afterwards does not restate what the order was given',
    Math.abs(Number(reread.discountTotal) - expectedDiscount) < 0.01,
    `${reread.discountTotal}`
  );

  /* ------------------------------------------------------- the catalogue filter */

  /*
    The order form ships ~790 products and renders a capped slice; a row that cannot be found is
    a product that cannot be ordered, so the search is load-bearing rather than a convenience.
  */
  await page.goto(`${BASE}/admin/orders/new`, { waitUntil: 'networkidle', timeout: 120000 });
  const rowsBefore = await page.locator('tbody tr').count();
  const target = await prisma.product.findFirst({
    orderBy: { name: 'desc' },
    select: { id: true, name: true },
  });
  ok(
    'the form does not render the whole catalogue',
    rowsBefore > 0 && rowsBefore <= 60,
    `${rowsBefore} rows`
  );

  await page.fill('#product-search', target.name.slice(0, 18));
  await page.waitForSelector(`#qty-${target.id}`, { timeout: 30000 }).catch(() => {});
  ok(
    'a product past the first page can be found by searching',
    (await page.locator(`#qty-${target.id}`).count()) > 0,
    target.name
  );
} catch (error) {
  console.error(error);
  fails.push('the suite threw');
} finally {
  await browser.close();

  if (orderId) await prisma.order.delete({ where: { id: orderId } }).catch(() => {});
  if (discountId) await prisma.discount.delete({ where: { id: discountId } }).catch(() => {});
  if (contactId) await prisma.contact.delete({ where: { id: contactId } }).catch(() => {});
  await prisma.$disconnect();

  console.log('');
  if (fails.length) {
    console.log(`${fails.length} failed:`);
    for (const f of fails) console.log(`  - ${f}`);
    process.exitCode = 1;
  } else {
    console.log('Discounts apply, snapshot and redeem correctly.');
  }
}
