import { chromium } from 'playwright-core';

/*
  End-to-end proof that the admin still does the job, not just that it looks the part.

  Adds a product through the dashboard's Quick Add widget, into a named category, then checks
  it reached the list table and the public storefront. Finally deletes it again, so running
  this leaves the catalogue exactly as it found it.
*/

const BASE = 'http://localhost:3000';
const EMAIL = 'petzyrockchendi@gmail.com';
const PASSWORD = 'harbour-lantern-ferment-1542';
const NAME = 'E2E Probe Compound 999';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 950 } });
const fails = [];
const ok = (label, pass, detail = '') =>
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${label}${detail ? '  — ' + detail : ''}`) ||
  (pass ? null : fails.push(label));

await page.goto(BASE + '/admin/login', { waitUntil: 'networkidle', timeout: 90000 });
await page.fill('#email', EMAIL);
await page.fill('#password', PASSWORD);
await page.click('button[type=submit]', { noWaitAfter: true });
await page.waitForURL(/\/admin(\?|$)/, { timeout: 120000 });
ok('sign in reaches the dashboard', /\/admin$/.test(new URL(page.url()).pathname));

/* ---- add a product through Quick Add, into a chosen category ---- */
await page.fill('#qp-name', NAME);
await page.fill('#qp-price', '77.50');
await page.fill('#qp-stock', '9');
await page.selectOption('#qp-category', { label: 'Peptides' });
const brand = await page.locator('#qp-brand option').nth(1).getAttribute('value');
await page.selectOption('#qp-brand', brand);
await page.fill('#qp-description', 'Temporary row created by the end-to-end check.');
await page.click('button:has-text("Save Product")');

await page.waitForSelector('.wp-notice-success', { timeout: 30000 }).catch(() => {});
const created = await page.locator('.wp-notice-success').count();
ok('Quick Add reports success', created > 0);

/* ---- it is in the list table, in the right category ---- */
await page.goto(`${BASE}/admin/products?q=${encodeURIComponent('E2E Probe')}`, {
  waitUntil: 'networkidle',
});
const row = page.locator('tbody tr', { hasText: NAME }).first();
ok('appears in the products list', (await row.count()) > 0);
ok(
  'lands in the Peptides category',
  (await row.innerText().catch(() => '')).includes('Peptides'),
  (await row.innerText().catch(() => '')).split('\n').slice(0, 4).join(' | ')
);

/* ---- and on the public storefront ---- */
const slug = 'e2e-probe-compound-999';
const res = await page.goto(`${BASE}/product/${slug}`, { waitUntil: 'networkidle' });
ok('storefront serves the new product page', res?.status() === 200, `HTTP ${res?.status()}`);
ok('storefront shows the name', (await page.content()).includes(NAME));

/* ---- clean up: delete it again through the admin ---- */
page.on('dialog', (d) => d.accept());
await page.goto(`${BASE}/admin/products?q=${encodeURIComponent('E2E Probe')}`, {
  waitUntil: 'networkidle',
});
const delRow = page.locator('tbody tr', { hasText: NAME }).first();
if (await delRow.count()) {
  await delRow.hover();
  await delRow.locator('button:has-text("Delete permanently")').click();
  await page.waitForTimeout(2500);
}
await page.goto(`${BASE}/admin/products?q=${encodeURIComponent('E2E Probe')}`, {
  waitUntil: 'networkidle',
});
ok(
  'row-action delete removes it again',
  (await page.locator('tbody tr', { hasText: NAME }).count()) === 0
);

await browser.close();
console.log(fails.length ? `\n${fails.length} FAILED` : '\nall checks passed');
process.exit(fails.length ? 1 : 0);
