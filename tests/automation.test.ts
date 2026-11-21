/*
  The automation's pure parts: the job list, periods, exclusions, and the template versions the
  owner's approval is pinned to. The sending path is tested against the database by
  scripts/automation-check.ts (dry run, run twice, cron routes).
*/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JOBS, excludedFromMarketing, maskEmail, periodOf } from '../lib/automation/jobs';
import {
  UNSUBSCRIBE_PLACEHOLDER,
  asOwnerCopy,
  templateVersion,
  unpaidReminderEmail,
  welcomeEmail2,
  welcomeEmail3,
  withPostalAddress,
} from '../lib/automation/templates';

test('five jobs, each a once-a-day cron (Hobby allows one run a day)', () => {
  assert.equal(JOBS.length, 5);
  for (const j of JOBS) {
    const [min, hour, dom, mon] = j.cron.split(' ');
    assert.match(min, /^\d+$/, j.id);
    assert.match(hour, /^\d+$/, j.id);
    assert.equal(dom, '*');
    assert.equal(mon, '*');
    assert.ok(j.path.startsWith('/api/cron/'));
  }
  assert.equal(new Set(JOBS.map((j) => j.enabledKey)).size, 5);
});

test('customer-facing jobs need approval; marketing jobs are the subscriber ones', () => {
  for (const j of JOBS) {
    assert.equal(j.needsApproval, j.audience !== 'shop', j.id);
    assert.equal(j.marketing, j.audience === 'subscribers', j.id);
  }
});

test('period is the New York calendar date', () => {
  assert.equal(periodOf(new Date('2026-11-21T03:00:00Z')), '2026-11-20'); // 22:00 Friday in New York
  assert.equal(periodOf(new Date('2026-11-21T14:00:00Z')), '2026-11-21');
});

test('excluded from marketing: the five medicines and the sexual-health category', () => {
  for (const name of ['Cialis 20mg', 'Tadalafil 10', 'Levitra 20', 'Actos 30', 'T3 Cytomel 25mcg', 'Liothyronine', 'Aromasin 25', 'Exemestane 25mg']) {
    assert.equal(excludedFromMarketing({ name }), true, name);
  }
  assert.equal(excludedFromMarketing({ name: 'Anything', categorySlug: 'sexual-health' }), true);
  for (const name of ['Testosterone Enanthate 250', 'Andropen 450', 'Mass-Stack 500', 'Test E 300']) {
    assert.equal(excludedFromMarketing({ name, categorySlug: 'injectables' }), false, name);
  }
});

test('template versions are stable and differ per job', () => {
  const a = templateVersion('unpaid-orders');
  assert.equal(a, templateVersion('unpaid-orders'));
  assert.match(a, /^u-[0-9a-f]{8}$/);
  assert.notEqual(templateVersion('welcome'), a);
  assert.notEqual(templateVersion('basket-reminders'), a);
  assert.equal(templateVersion('weekly-report'), '');
});

test('unpaid reminder: transactional, no offer, says it is the last one only the second time', () => {
  const base = {
    firstName: 'Sam',
    reference: 'MRA-ABC234',
    placedAt: new Date('2026-11-19T15:00:00Z'),
    items: [{ name: 'Product', quantity: 2, lineTotal: 120 }],
    subtotal: 120,
    discountLabel: 'Friday 5% off',
    discountTotal: 6,
    shipping: 9,
    total: 123,
    method: 'crypto' as const,
    payUrl: 'https://www.mrsanabolics.com/checkout/payment-confirmation?order=MRA-ABC234',
    cashApp: null,
  };
  const one = unpaidReminderEmail({ ...base, step: 1 });
  const two = unpaidReminderEmail({ ...base, step: 2 });
  assert.match(one.subject, /MRA-ABC234/);
  assert.ok(one.html.includes('$123.00'));
  assert.ok(one.html.includes('Friday 5% off'));
  assert.ok(!one.html.includes('last reminder'));
  assert.ok(two.html.includes('last reminder'));
  for (const html of [one.html, two.html]) {
    assert.ok(!/WELCOME15|% off your next|unsubscribe/i.test(html.replace('Friday 5% off', '')), 'no sales content');
  }
});

test('marketing templates leave the unsubscribe link to the sender, and name no product', () => {
  for (const e of [welcomeEmail2(), welcomeEmail3(null), welcomeEmail3({ code: 'WELCOME15', headline: '15% off', condition: '' })]) {
    assert.ok(e.html.includes(UNSUBSCRIBE_PLACEHOLDER));
    assert.ok(!/minimum order|\$100/i.test(e.html), 'no minimum order in marketing');
    assert.ok(!/cycle|dose|dosing|results|cialis|clomid|nolvadex/i.test(e.html), 'editorial policy');
  }
});

test('postal address and owner copy are added at send time', () => {
  const html = '<html><body><p>x</p></body></html>';
  assert.ok(withPostalAddress(html, '1 Street\nTown').includes('1 Street, Town</td>'));
  assert.ok(asOwnerCopy(html, 'Your copy').includes('Your copy'));
});

test('maskEmail', () => {
  assert.equal(maskEmail('customer@gmail.com'), 'c***@gmail.com');
});
