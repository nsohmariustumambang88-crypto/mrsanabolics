/*
  End-to-end test of "Proceed to payment" with Cash App, the screenshot check and the 60-minute
  countdown (CLAUDE.md, "Paying: Proceed to payment…"), against a running site and the real database.

    BASE=http://localhost:3210 node --env-file=.env .impeccable/pay-e2e.mjs [screenshot dir]

  Places two Cash App orders for TEST_CUSTOMER_EMAIL (from .env) through the real checkout, uploads a
  generated receipt showing our Cash App name and the amount to the first (it must confirm itself
  and log exactly one confirmation email, which goes to the owner), and moves the second's
  countdown into the past (it must NOT be cancelled, must say "Please complete your payment now" and
  must still show the tag and the upload). Both
  orders, and the contact if the run created it, are deleted at the end. support@ receives the
  "New Order (awaiting payment)" and "Cash App screenshot" alerts for each run.

  From a slow connection to Supabase the server action can fail with ConnectionReset; every
  database call here has a timeout so the run ends instead of hanging, as it once did for hours.
*/
import pg from 'pg';
import { chromium } from 'playwright-core';

const BASE = process.env.BASE ?? 'http://localhost:3210';
const OUT = process.argv[2] ?? '.impeccable/review';
/* The address the test orders are placed for; it receives the confirmation email. In .env, never in this public file. */
const EMAIL = process.env.TEST_CUSTOMER_EMAIL;
if (!EMAIL) {
  console.error('Set TEST_CUSTOMER_EMAIL in .env (the owner’s own address) to run this.');
  process.exit(1);
}
const db = new pg.Client({
  connectionString: process.env.DIRECT_URL,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 20_000,
  query_timeout: 30_000,
});
await db.connect();
const q = async (sql, args = []) => (await db.query(sql, args)).rows;
const results = [];
const check = (name, ok, extra = '') => {
  results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? ` (${extra})` : ''}`);
  console.log(results[results.length - 1]);
};
const created = [];
/* Closed in `finally`: a browser left open keeps Node alive, and a failed run once hung until killed. */
let browser = null;
const [ownerBefore] = (await db.query('select id from contacts where email = $1', [EMAIL])).rows;

try {
  const [product] = await q(
    `select id, name, slug, price::text as price, images[1] as image from products
     where "inStock" = true and price between 110 and 250 order by price limit 1`
  );
  const tag = (await q(`select "walletAddress" as tag, "accountName" as name from payment_methods where key = 'cashapp'`))[0];
  console.log('product', product.name, product.price, '| cashapp', tag.tag, tag.name);

  for (let i = 0; i < 60; i += 1) {
    try {
      const r = await fetch(`${BASE}/checkout`, { signal: AbortSignal.timeout(180_000) });
      if (r.status < 500) break;
    } catch {}
    await new Promise((r) => setTimeout(r, 5000));
  }

  browser = await chromium.launch();

  async function placeCashAppOrder(label) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
    await context.addInitScript((item) => {
      if (!sessionStorage.getItem('seeded')) {
        localStorage.setItem('mranabolics-cart', JSON.stringify([item]));
        localStorage.removeItem('mranabolics-checkout');
        sessionStorage.setItem('seeded', '1');
      }
    }, { productId: product.id, name: product.name, slug: product.slug, price: Number(product.price), image: product.image ?? '', quantity: 1, brand: '' });
    const page = await context.newPage();
    await page.goto(`${BASE}/checkout`, { waitUntil: 'networkidle', timeout: 240_000 });
    await page.fill('input[name="email"]', EMAIL);
    await page.fill('input[name="given-name"]', 'Test');
    await page.fill('input[name="family-name"]', `Payment ${label}`);
    await page.fill('input[name="street-address"]', '1 Test Street');
    await page.fill('input[name="city"]', 'Testville');
    await page.fill('input[name="tel"]', '+1 212 555 0100');
    await page.fill('input[name="country"]', 'US');
    await page.waitForSelector('input[name="delivery-rate"]', { timeout: 60_000 });
    await page.locator('input[name="delivery-rate"]').first().check();
    await page.getByRole('button', { name: /Continue/ }).click();
    await page.getByRole('button', { name: /Continue/ }).click();
    await page.locator('input[name="payment-method"][value="cashapp"]').check();
    const button = page.getByRole('button', { name: /Proceed to payment/ });
    check(`${label}: button says "Proceed to payment"`, await button.isVisible());
    await page.screenshot({ path: `${OUT}/e2e-${label}-checkout.png`, fullPage: true });
    await button.click();
    await page.waitForURL(/payment-confirmation\?order=MRA-/, { timeout: 120_000 });
    const url = new URL(page.url());
    const reference = url.searchParams.get('order');
    created.push(reference);
    await page.waitForSelector('text=Please pay within', { timeout: 120_000 });
    await page.waitForTimeout(1500);
    const timer = await page.locator('[role="timer"]').innerText();
    check(`${label}: payment page shows the countdown`, /^\s*(59|60)\s*m/.test(timer.replace(/\n/g, ' ')), timer.replace(/\s+/g, ' '));
    await page.screenshot({ path: `${OUT}/e2e-${label}-pay.png`, fullPage: true });
    return { context, page, reference, token: url.searchParams.get('t') };
  }

  // ---------------------------------------------------------------- order 1: screenshot confirms it
  const one = await placeCashAppOrder('one');
  const [o1] = await q(`select id, status, total::text as total from orders where reference = $1`, [one.reference]);
  const events1 = (await q(`select summary from order_events where "orderId" = $1`, [o1.id])).map((e) => e.summary);
  check('order 1: created as NEW', o1.status === 'NEW');
  check('order 1: deadline recorded', events1.some((s) => s.startsWith('Payment due by ')));

  // A synthetic Cash App receipt with our name and the order amount
  const shot = await one.context.newPage();
  await shot.setViewportSize({ width: 420, height: 760 });
  await shot.setContent(`<body style="margin:0;background:#fff;font-family:Arial;text-align:center;padding-top:60px">
    <div style="font-size:64px;font-weight:bold">$${Number(o1.total).toFixed(0)}</div>
    <div style="font-size:26px;margin-top:16px">Payment to ${tag.name}</div>
    <div style="font-size:22px;color:#555;margin-top:8px">${tag.tag}</div>
    <div style="font-size:22px;margin-top:24px">For ${one.reference}</div>
    <div style="font-size:24px;margin-top:24px;color:#0a0">Completed</div></body>`);
  const receipt = `${OUT}/e2e-receipt.png`;
  await shot.screenshot({ path: receipt });
  await shot.close();

  await one.page.setInputFiles('input[type="file"]', receipt);
  await one.page.getByRole('button', { name: /Send screenshot/ }).click();
  await one.page.waitForSelector('text=/Payment confirmed|checking the payment/', { timeout: 120_000 });
  const confirmedShown = await one.page.locator('text=Payment confirmed').count();
  check('order 1: page says payment confirmed', confirmedShown > 0);
  await one.page.screenshot({ path: `${OUT}/e2e-one-after-upload.png`, fullPage: true });
  const [o1b] = await q(`select status from orders where id = $1`, [o1.id]);
  check('order 1: status CONFIRMED', o1b.status === 'CONFIRMED', o1b.status);
  const events1b = (await q(`select summary, detail from order_events where "orderId" = $1 order by "occurredAt"`, [o1.id]));
  check('order 1: check passed logged', events1b.some((e) => e.summary.startsWith('Screenshot check passed')));
  check('order 1: confirmation email logged once', events1b.filter((e) => e.summary === 'Order confirmation emailed.').length === 1);
  check('order 1: no email before payment', !events1b.some((e) => /Order Received/.test(e.summary)));
  await one.context.close();

  // ---------------------------------------------------------------- order 2: countdown runs out
  const two = await placeCashAppOrder('two');
  const [o2] = await q(`select id from orders where reference = $1`, [two.reference]);
  // Move this test order's deadline into the past (test data only)
  await q(
    `update order_events set detail = $2 where "orderId" = $1 and summary like 'Payment due by %'`,
    [o2.id, new Date(Date.now() - 60_000).toISOString()]
  );
  await two.page.reload({ waitUntil: 'networkidle' });
  const [o2b] = await q(`select status from orders where id = $1`, [o2.id]);
  check('order 2: NOT cancelled after the countdown', o2b.status === 'NEW', o2b.status);
  const expiredText = await two.page.locator('main').innerText();
  check('order 2: page asks to complete the payment', /complete your payment now/i.test(expiredText));
  check('order 2: tag still shown after the countdown', /Send exactly/i.test(expiredText));
  check('order 2: upload still offered after the countdown', /Upload your payment screenshot/i.test(expiredText));
  check('order 2: WhatsApp button present', (await two.page.getByRole('link', { name: /WhatsApp/ }).count()) > 0);
  await two.page.screenshot({ path: `${OUT}/e2e-two-expired.png`, fullPage: true });
  await two.context.close();
} catch (error) {
  console.error('ERROR', error);
} finally {
  await browser?.close().catch(() => {});
  for (const reference of created) {
    const [o] = await q(`select id, "contactId" from orders where reference = $1`, [reference]);
    if (!o) continue;
    await q(`delete from orders where id = $1`, [o.id]);
    await q(`delete from contact_activities where "contactId" = $1 and summary like $2`, [o.contactId, `%${reference}%`]);
    console.log('deleted test order', reference);
  }
  const [c] = await q(`select id, name from contacts where lower(email) = lower($1)`, [EMAIL]);
  /* The run's own contact; or one an interrupted earlier run left behind, recognisable by its test name. */
  if (c && (!ownerBefore || /^Test Payment/.test(c.name ?? ''))) {
    await q(`delete from contacts where id = $1 and not exists (select 1 from orders where "contactId" = $1)`, [c.id]);
    console.log('deleted test contact');
  }
  await db.end();
  console.log('\n' + results.join('\n'));
}
