/*
  Writes the automated email templates, with sample data, to HTML files for a visual check in a
  browser. Sends nothing and needs no database. Give it a folder OUTSIDE the repo (a scratch or
  temp folder), so the previews are never committed:
    node --import tsx scripts/render-email-previews.ts <outDir>
*/
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { unpaidReminderEmail, welcomeEmail2, welcomeEmail3, withPostalAddress, UNSUBSCRIBE_PLACEHOLDER } from '../lib/automation/templates';
import { renderBasketReminderHTML } from '../lib/email/basket-reminder';

const out = process.argv[2];
if (!out) {
  console.error('Usage: node --import tsx scripts/render-email-previews.ts <outDir outside the repo>');
  process.exit(1);
}
mkdirSync(out, { recursive: true });
const marketing = (html: string) => withPostalAddress(html.split(UNSUBSCRIBE_PLACEHOLDER).join('#'), 'POSTAL ADDRESS NOT SET');

const unpaid = unpaidReminderEmail({
  step: 1,
  firstName: 'Marius',
  reference: 'MRA-TEST01',
  placedAt: new Date(Date.now() - 26 * 3_600_000),
  items: [{ name: 'Test E 300', quantity: 2, lineTotal: 120 }],
  subtotal: 120,
  discountLabel: 'Friday 5% off',
  discountTotal: 6,
  shipping: 9,
  total: 123,
  method: 'cashapp',
  payUrl: 'https://www.mrsanabolics.com/checkout/payment-confirmation?order=MRA-TEST01',
  cashApp: { tag: '$Sample', name: 'Sample Name' },
});
writeFileSync(join(out, 'unpaid.html'), unpaid.html);
writeFileSync(join(out, 'welcome2.html'), marketing(welcomeEmail2().html));
writeFileSync(join(out, 'welcome3.html'), marketing(welcomeEmail3({ code: 'WELCOME15', headline: '15% off', condition: '' }).html));
writeFileSync(
  join(out, 'basket.html'),
  marketing(
    renderBasketReminderHTML({
      firstName: 'Marius',
      lines: [{ slug: 's', name: 'Test E 300', brand: 'Maker', image: '', price: 60, quantity: 2 }],
      restoreUrl: '#',
      unsubscribeUrl: UNSUBSCRIBE_PLACEHOLDER,
      offer: true,
      reachedCheckout: true,
    })
  )
);
console.log('written to', out);
