import { chromium } from 'playwright-core';
import { PrismaClient } from '@prisma/client';

/*
  Drive an order through the admin, and check the database after every control.

  The assertions that matter most here are the ones about what is NOT recorded and what does NOT
  change:

  - No payment state exists anywhere on an order. The model has no such column, and this checks
    that none appeared.
  - Line prices are SNAPSHOTS. Repricing the product afterwards must not restate what the order
    says it cost — that is the difference between a record and a report.
  - Milestone stamps are set once. Moving an order backwards must not rewrite when it was first
    confirmed or shipped.

  Every "did it save" check polls the database rather than waiting on a success notice: each
  control owns its own notice, so a page-wide selector matches the previous control's and the
  check races ahead of the write.

  Leaves the database as it found it.

    node --env-file=.env .impeccable/orders-e2e.mjs
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

const CONTACT_EMAIL = 'order-probe@ord.test';
const prisma = new PrismaClient();

const fails = [];
const ok = (label, pass, detail = '') => {
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${label}${detail ? '  — ' + detail : ''}`);
  if (!pass) fails.push(label);
};

let originalPrice = null;
let probeProductId = null;

async function cleanup() {
  await prisma.order.deleteMany({ where: { contact: { email: CONTACT_EMAIL } } });
  await prisma.contact.deleteMany({ where: { email: CONTACT_EMAIL } });
  /* Put back any price this suite changed, so it does not edit the real catalogue. */
  if (probeProductId && originalPrice != null) {
    await prisma.product.update({
      where: { id: probeProductId },
      data: { price: originalPrice },
    });
  }
}

async function waitForDb(check, timeout = 25000) {
  const started = Date.now();
  for (;;) {
    try {
      if (await check()) return true;
    } catch {
      /* a cold Neon endpoint can refuse the first connection */
    }
    if (Date.now() - started > timeout) return false;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 950 } });

const dialogs = [];
page.on('dialog', (d) => {
  dialogs.push(d.message());
  d.accept();
});

const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push(String(e).slice(0, 200)));

try {
  await cleanup();

  const contact = await prisma.contact.create({
    data: { email: CONTACT_EMAIL, name: 'Order Probe', firstSource: 'added by staff' },
    select: { id: true },
  });

  const product = await prisma.product.findFirst({
    orderBy: { name: 'asc' },
    select: { id: true, name: true, price: true },
  });
  probeProductId = product.id;
  originalPrice = product.price;

  await page.goto(BASE + '/admin/login', { waitUntil: 'networkidle', timeout: 90000 });
  await page.fill('#email', EMAIL);
  await page.fill('#password', PASSWORD);
  await page.click('button[type=submit]', { noWaitAfter: true });
  await page.waitForURL(/\/admin(\?|$)/, { timeout: 120000 });
  ok('sign in reaches the dashboard', /\/admin$/.test(new URL(page.url()).pathname));

  /* ============================================================ record an order ========== */

  await page.goto(BASE + '/admin/orders/new', { waitUntil: 'networkidle', timeout: 90000 });

  await page.selectOption('#contactId', contact.id);
  await page.fill(`#qty-${product.id}`, '3');
  await page.fill('#shippingCost', '12.50');
  await page.fill('#shipName', 'Order Probe');
  await page.fill('#shipLine1', '14 Harbour Row');
  await page.fill('#shipCity', 'Bristol');
  await page.fill('#shipPostcode', 'BS1 4TR');
  await page.fill('#shipCountry', 'United Kingdom');
  await page.fill('#notes', 'Taken by phone for the harness.');

  await page.click('button[type=submit]', { noWaitAfter: true });
  await page.waitForSelector('h1:has-text("MRA-")', { timeout: 120000 });

  const order = await prisma.order.findFirst({
    where: { contactId: contact.id },
    include: { items: true, events: true },
  });

  ok('the order was written', order !== null);
  ok('it has a human reference', /^MRA-[A-Z0-9]{6}$/.test(order?.reference ?? ''), order?.reference);
  ok('it starts NEW', order?.status === 'NEW', order?.status);
  ok('one line was recorded', order?.items.length === 1, `${order?.items.length} lines`);
  ok('the quantity is right', order?.items[0]?.quantity === 3);

  const unit = Number(product.price);
  ok(
    'the line total is quantity times price',
    Number(order?.items[0]?.lineTotal) === unit * 3,
    `${order?.items[0]?.lineTotal}`
  );
  ok('shipping was captured', Number(order?.shipping) === 12.5, `${order?.shipping}`);
  ok(
    'the total is subtotal plus shipping',
    Number(order?.total) === unit * 3 + 12.5,
    `${order?.total}`
  );
  ok('the address was captured onto the order', order?.shipCity === 'Bristol');
  ok('creation is on the order history', (order?.events.length ?? 0) >= 1);

  /* The person's timeline should carry it too. */
  ok(
    'the order is on the contact timeline',
    (await prisma.contactActivity.count({
      where: { contactId: contact.id, type: 'ORDER_PLACED' },
    })) === 1
  );

  /* ============================================================ no payment state ========= */

  /*
    Asserted against the actual column list rather than the API surface: a payment field added
    later would pass a Prisma-level check that only looks at what the client exposes.
  */
  const columns = await prisma.$queryRawUnsafe(
    `select column_name from information_schema.columns where table_name = 'orders'`
  );
  const names = columns.map((c) => c.column_name.toLowerCase());
  const paymentish = names.filter((n) =>
    ['paid', 'payment', 'transaction', 'gateway', 'stripe', 'charge', 'wallet', 'txid'].some((w) =>
      n.includes(w)
    )
  );
  ok('the orders table has NO payment column', paymentish.length === 0, names.join(','));

  /* ============================================================ price snapshotting ======= */

  const bumped = (unit + 25).toFixed(2);
  await prisma.product.update({ where: { id: product.id }, data: { price: bumped } });

  const afterReprice = await prisma.orderItem.findFirst({
    where: { orderId: order.id },
    select: { unitPrice: true },
  });
  ok(
    'repricing the product does NOT restate the order line',
    Number(afterReprice?.unitPrice) === unit,
    `line ${afterReprice?.unitPrice} vs catalogue ${bumped}`
  );

  await prisma.product.update({ where: { id: product.id }, data: { price: originalPrice } });

  /* ============================================================ status + stamps ========== */

  await page.goto(`${BASE}/admin/orders/${order.id}`, { waitUntil: 'networkidle', timeout: 90000 });

  await page.selectOption('#order-status', 'CONFIRMED');
  ok(
    'status picker wrote CONFIRMED',
    await waitForDb(
      async () =>
        (await prisma.order.findUnique({ where: { id: order.id }, select: { status: true } }))
          ?.status === 'CONFIRMED'
    )
  );

  const confirmedFirst = (
    await prisma.order.findUnique({ where: { id: order.id }, select: { confirmedAt: true } })
  )?.confirmedAt;
  ok('confirming stamped a time', confirmedFirst != null);

  await page.selectOption('#order-status', 'SHIPPED');
  ok(
    'status picker wrote SHIPPED',
    await waitForDb(
      async () =>
        (await prisma.order.findUnique({ where: { id: order.id }, select: { status: true } }))
          ?.status === 'SHIPPED'
    )
  );

  /* Move it back, then forward again: the first stamp must survive both. */
  await page.selectOption('#order-status', 'CONFIRMED');
  await waitForDb(
    async () =>
      (await prisma.order.findUnique({ where: { id: order.id }, select: { status: true } }))
        ?.status === 'CONFIRMED'
  );

  const confirmedAgain = (
    await prisma.order.findUnique({ where: { id: order.id }, select: { confirmedAt: true } })
  )?.confirmedAt;
  ok(
    'moving backwards does NOT rewrite the first confirmation time',
    confirmedFirst?.getTime() === confirmedAgain?.getTime(),
    `${confirmedFirst?.toISOString()} vs ${confirmedAgain?.toISOString()}`
  );

  ok(
    'every move is on the order history',
    (await prisma.orderEvent.count({ where: { orderId: order.id } })) >= 4
  );
  ok(
    'and on the contact timeline',
    await waitForDb(
      async () =>
        (await prisma.contactActivity.count({
          where: { contactId: contact.id, type: 'ORDER_STATUS_CHANGED' },
        })) >= 3
    )
  );

  /* ============================================================ order note ============== */

  await page.fill('#order-note', 'Carrier reference AB123456789GB.');
  await page.click('button:has-text("Add note")');
  ok(
    'the order note was written',
    await waitForDb(
      async () =>
        (await prisma.orderEvent.count({
          where: { orderId: order.id, summary: 'Note added.' },
        })) === 1
    )
  );

  /* ============================================================ list controls =========== */

  await page.goto(`${BASE}/admin/orders?filter=all&q=${order.reference}`, {
    waitUntil: 'networkidle',
    timeout: 90000,
  });
  ok('search finds the order by reference', (await page.locator('tbody tr').count()) === 1);

  await page.locator('thead input[type=checkbox]').first().check();
  ok(
    'select-all ticks the row',
    (await page.locator('tbody input[type=checkbox]:checked').count()) === 1
  );
  ok('the bar reports the selection', (await page.locator('text=1 selected').count()) > 0);

  await page.selectOption('#order-bulk-top', 'status-DELIVERED');
  await page.locator('#order-bulk-top').locator('xpath=following-sibling::button[1]').click();
  ok(
    'bulk status change wrote DELIVERED',
    await waitForDb(
      async () =>
        (await prisma.order.findUnique({ where: { id: order.id }, select: { status: true } }))
          ?.status === 'DELIVERED'
    )
  );

  /* ============================================================ delete ================== */

  await page.goto(`${BASE}/admin/orders?filter=all&q=${order.reference}`, {
    waitUntil: 'networkidle',
    timeout: 90000,
  });
  dialogs.length = 0;
  await page.locator('tbody tr').first().hover();
  await page.locator('tbody button:has-text("Delete")').first().click();
  ok('row delete asks first', dialogs.length === 1, (dialogs[0] ?? '').slice(0, 50));
  ok(
    'row delete removed the order',
    await waitForDb(async () => (await prisma.order.count({ where: { id: order.id } })) === 0)
  );
  ok(
    'and the customer is kept',
    (await prisma.contact.count({ where: { id: contact.id } })) === 1
  );
  ok(
    'their timeline still records that the order existed',
    (await prisma.contactActivity.count({
      where: { contactId: contact.id, type: 'ORDER_PLACED' },
    })) === 1
  );

  /* ============================================================ contacts CSV =========== */

  const csv = await page.evaluate(async () => {
    const response = await fetch('/api/admin/contacts.csv');
    return { status: response.status, text: await response.text() };
  });
  ok('contacts CSV exports', csv.status === 200, `HTTP ${csv.status}`);
  ok('and carries a marketing_consent column', csv.text.includes('marketing_consent'));
  ok(
    'the probe contact is marked as having no consent',
    csv.text.includes('"no-consent"'),
    csv.text.split('\r\n')[0]?.slice(0, 60)
  );

  ok('no uncaught client errors during the run', pageErrors.length === 0, pageErrors.join(' | '));
} catch (error) {
  ok('suite ran without throwing', false, String(error).slice(0, 400));
} finally {
  await browser.close();
  await cleanup();
  await prisma.$disconnect();
}

console.log('');
if (fails.length) {
  console.log(`${fails.length} FAILED:`);
  for (const f of fails) console.log(`  - ${f}`);
  process.exitCode = 1;
} else {
  console.log('Every order control passed.');
}
