/*
  The automation's pure parts: the job list, periods, exclusions, and the template versions the
  owner's approval is pinned to. The sending path is tested against the database by
  scripts/automation-check.ts (dry run, run twice, cron routes).
*/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  DAILY_CRON,
  DAILY_ORDER,
  DAILY_PATH,
  JOBS,
  SCREEN_ONLY_SETTING_KEYS,
  STALE_AFTER_MS,
  excludedFromMarketing,
  isSaturdayInNewYork,
  isStaleRun,
  maskEmail,
  periodOf,
} from '../lib/automation/jobs';
import {
  UNSUBSCRIBE_PLACEHOLDER,
  asOwnerCopy,
  templateVersion,
  unpaidReminderEmail,
  welcomeEmail2,
  welcomeEmail3,
  withPostalAddress,
} from '../lib/automation/templates';

test('five jobs; the daily timer runs unpaid reminders first, then basket reminders, then the optional two', () => {
  assert.equal(JOBS.length, 5);
  assert.equal(new Set(JOBS.map((j) => j.enabledKey)).size, 5);
  assert.deepEqual(DAILY_ORDER, ['unpaid-orders', 'basket-reminders', 'enquiry-alert', 'weekly-report']);
  for (const j of JOBS) {
    /* On the timer exactly when listed in DAILY_ORDER. */
    assert.equal(j.timer !== 'no', DAILY_ORDER.includes(j.id), j.id);
  }
  const by = (id: string) => JOBS.find((j) => j.id === id)!;
  assert.equal(by('unpaid-orders').timerOnlyIfOn, false);
  assert.equal(by('basket-reminders').timerOnlyIfOn, false);
  assert.equal(by('enquiry-alert').timerOnlyIfOn, true);
  assert.equal(by('weekly-report').timer, 'saturdays');
  assert.equal(by('weekly-report').timerOnlyIfOn, true);
});

test('the weekly report day is Saturday in New York', () => {
  assert.equal(isSaturdayInNewYork(new Date('2026-11-28T14:30:00Z')), true); // Sat 09:30 New York
  assert.equal(isSaturdayInNewYork(new Date('2026-11-27T14:30:00Z')), false); // Fri
  assert.equal(isSaturdayInNewYork(new Date('2026-11-29T03:00:00Z')), true); // still Sat 22:00 New York
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

/*
  The owner's rule (24 November 2026): only payments and the visit count call the server on their
  own. His one exception (27 November 2026): ONE daily timer for the reminders. Adding a second
  cron breaks his rule, so this test fails if anyone does.
*/
test('vercel.json has exactly one cron: the daily timer, once a day, at 15:00 Lagos time', () => {
  const config = JSON.parse(readFileSync(join(__dirname, '..', 'vercel.json'), 'utf8')) as {
    crons: { path: string; schedule: string }[];
  };
  assert.deepEqual(config.crons, [{ path: DAILY_PATH, schedule: DAILY_CRON }]);
  const [min, hour, dom, mon, dow] = DAILY_CRON.split(' ');
  assert.match(min, /^\d+$/);
  assert.equal(hour, '14'); // 14:00 UTC = 15:00 in Lagos (WAT, UTC+1, no daylight saving)
  assert.deepEqual([dom, mon, dow], ['*', '*', '*']);
});

test('switches, approvals and the master pause are written only by the Automation screen', () => {
  assert.ok(SCREEN_ONLY_SETTING_KEYS.has('automation_paused'));
  for (const j of JOBS) {
    assert.ok(SCREEN_ONLY_SETTING_KEYS.has(j.enabledKey), j.enabledKey);
    assert.ok(SCREEN_ONLY_SETTING_KEYS.has(j.approvedKey), j.approvedKey);
  }
  /* The shared limits stay editable in the form on that screen. */
  for (const k of ['automation_max_per_run', 'automation_copy_to', 'automation_report_to', 'postal_address']) {
    assert.equal(SCREEN_ONLY_SETTING_KEYS.has(k), false, k);
  }
});

test('a run left RUNNING by a dead process is stale after 15 minutes; finished runs never are', () => {
  const now = new Date('2026-11-22T15:00:00Z');
  const ago = (ms: number) => new Date(now.getTime() - ms);
  assert.equal(STALE_AFTER_MS, 15 * 60_000);
  assert.equal(isStaleRun({ status: 'RUNNING', startedAt: ago(60_000) }, now), false);
  assert.equal(isStaleRun({ status: 'RUNNING', startedAt: ago(16 * 60_000) }, now), true);
  for (const status of ['OK', 'PARTIAL', 'FAILED', 'SKIPPED']) {
    assert.equal(isStaleRun({ status, startedAt: ago(86_400_000) }, now), false, status);
  }
});

/*
  The versions in the subjects of the tests Marius was sent on 21 November 2026 (all delivered).
  A template change changes its version, and the job then stops sending until he approves the new
  one after a fresh test. Update this pin only together with that test, so a template can never
  change silently.
*/
test('template versions are the ones the owner was sent as tests', () => {
  assert.equal(templateVersion('unpaid-orders'), 'u-3955e22e');
  assert.equal(templateVersion('basket-reminders'), 'b-eecf9518');
  assert.equal(templateVersion('welcome'), 'w-5a5947f4');
});
