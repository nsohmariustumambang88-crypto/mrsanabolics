import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

/* Drive a product into the cart, walk to the payment step, and photograph each method. */

mkdirSync('.impeccable/review', { recursive: true });
const BASE = 'http://localhost:3000';

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message.slice(0, 140)));

await page.goto(`${BASE}/shop`, { waitUntil: 'networkidle', timeout: 90000 });
await page.locator('button:has-text("Add to cart")').first().click();
await page.waitForTimeout(600);

await page.goto(`${BASE}/checkout`, { waitUntil: 'networkidle' });
await page.waitForTimeout(500);

/* Fill the address so the abandoned-cart capture has something to record. */
await page.fill('#checkout-email', 'shopper@example.test').catch(() => {});
await page.screenshot({ path: '.impeccable/review/co-shipping.png' });
console.log('.impeccable/review/co-shipping.png  (shipping + consent)');

/* Shipping -> Billing -> Review -> Payment */
for (let i = 0; i < 3; i += 1) {
  await page.locator('button:has-text("Continue")').first().click();
  await page.waitForTimeout(450);
}

for (const [name, label] of [
  ['co-card', 'Card'],
  ['co-cashapp', 'Cash App'],
  ['co-crypto', 'Cryptocurrency'],
]) {
  await page.locator(`label:has-text("${label}") input[type=radio]`).first().check();
  await page.waitForTimeout(350);
  await page.screenshot({ path: `.impeccable/review/${name}.png` });
  console.log(`.impeccable/review/${name}.png  (${label})`);
}

await browser.close();
if (errors.length) {
  console.log('\npage errors:');
  for (const e of errors) console.log('  ' + e);
}
