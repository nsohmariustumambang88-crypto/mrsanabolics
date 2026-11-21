/*
  Friday 5%: the window and the money. Run with `npm test` (node:test through tsx).

  These are the same functions createOrder, /api/discount/validate, the checkout and the cart run
  (lib/offers/friday.ts), so a green run here is the arithmetic the till uses.
*/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  FRIDAY_CODE,
  discountLabel,
  fridayShortfall,
  fridayWindowContaining,
  isFridayOfferTime,
  nextFridayWindow,
  orderMoney,
  pickBestDiscount,
  quoteFriday,
  type CodeQuote,
} from '../lib/offers/friday';

const at = (iso: string) => new Date(iso);

/* ------------------------------------------------------------------ window */

test('opens at 00:00 New York on Friday (winter, EST = UTC-5)', () => {
  assert.equal(isFridayOfferTime(at('2026-11-20T04:59:59Z')), false, 'Thursday 23:59:59 in New York');
  assert.equal(isFridayOfferTime(at('2026-11-20T05:00:00Z')), true, 'Friday 00:00 in New York');
});

test('closes at 00:00 Los Angeles on Saturday (winter, PST = UTC-8)', () => {
  assert.equal(isFridayOfferTime(at('2026-11-21T07:59:59Z')), true, 'Friday 23:59:59 in Los Angeles');
  assert.equal(isFridayOfferTime(at('2026-11-21T08:00:00Z')), false, 'Saturday 00:00 in Los Angeles');
});

test('the 20 November window is 05:00Z to 08:00Z next day, 27 hours', () => {
  const w = fridayWindowContaining(at('2026-11-20T12:00:00Z'));
  assert.ok(w);
  assert.equal(w.start.toISOString(), '2026-11-20T05:00:00.000Z');
  assert.equal(w.end.toISOString(), '2026-11-21T08:00:00.000Z');
  assert.equal((w.end.getTime() - w.start.getTime()) / 3_600_000, 27);
});

test('Saturday morning in New York but still Friday in Los Angeles is inside', () => {
  const w = fridayWindowContaining(at('2026-11-21T06:30:00Z')); // NY Sat 01:30, LA Fri 22:30
  assert.ok(w);
  assert.equal(w.start.toISOString(), '2026-11-20T05:00:00.000Z');
});

test('summer (daylight saving): 04:00Z to 07:00Z next day', () => {
  const w = fridayWindowContaining(at('2026-07-03T12:00:00Z'));
  assert.ok(w);
  assert.equal(w.start.toISOString(), '2026-07-03T04:00:00.000Z');
  assert.equal(w.end.toISOString(), '2026-07-04T07:00:00.000Z');
  assert.equal(isFridayOfferTime(at('2026-07-03T03:59:59Z')), false);
  assert.equal(isFridayOfferTime(at('2026-07-04T06:59:59Z')), true);
  assert.equal(isFridayOfferTime(at('2026-07-04T07:00:00Z')), false);
});

test('the Friday before daylight saving ends (1 Nov 2026) still uses EDT/PDT', () => {
  const w = fridayWindowContaining(at('2026-10-30T15:00:00Z'));
  assert.ok(w);
  assert.equal(w.start.toISOString(), '2026-10-30T04:00:00.000Z');
  assert.equal(w.end.toISOString(), '2026-10-31T07:00:00.000Z');
});

test('the Friday after daylight saving ends uses EST/PST', () => {
  const w = fridayWindowContaining(at('2026-11-06T15:00:00Z'));
  assert.ok(w);
  assert.equal(w.start.toISOString(), '2026-11-06T05:00:00.000Z');
  assert.equal(w.end.toISOString(), '2026-11-07T08:00:00.000Z');
});

test('either side of daylight saving starting (8 Mar 2026)', () => {
  const before = fridayWindowContaining(at('2026-03-06T15:00:00Z'));
  assert.ok(before);
  assert.equal(before.start.toISOString(), '2026-03-06T05:00:00.000Z');
  assert.equal(before.end.toISOString(), '2026-03-07T08:00:00.000Z');
  const after = fridayWindowContaining(at('2026-03-13T15:00:00Z'));
  assert.ok(after);
  assert.equal(after.start.toISOString(), '2026-03-13T04:00:00.000Z');
  assert.equal(after.end.toISOString(), '2026-03-14T07:00:00.000Z');
});

test('no other day of the week is inside', () => {
  for (const iso of [
    '2026-11-16T12:00:00Z', // Monday
    '2026-11-17T12:00:00Z',
    '2026-11-18T12:00:00Z',
    '2026-11-19T12:00:00Z', // Thursday noon
    '2026-11-21T12:00:00Z', // Saturday noon
    '2026-11-22T12:00:00Z', // Sunday
  ]) {
    assert.equal(isFridayOfferTime(at(iso)), false, iso);
  }
});

test('27 November (BLACK15 day) is a Friday window identical to BLACK15 dates', () => {
  const w = fridayWindowContaining(at('2026-11-27T20:00:00Z'));
  assert.ok(w);
  assert.equal(w.start.toISOString(), '2026-11-27T05:00:00.000Z');
  assert.equal(w.end.toISOString(), '2026-11-28T08:00:00.000Z');
});

test('nextFridayWindow finds the next start strictly after now', () => {
  assert.equal(nextFridayWindow(at('2026-11-19T12:00:00Z')).start.toISOString(), '2026-11-20T05:00:00.000Z');
  assert.equal(nextFridayWindow(at('2026-11-20T12:00:00Z')).start.toISOString(), '2026-11-27T05:00:00.000Z');
  assert.equal(nextFridayWindow(at('2026-11-21T09:00:00Z')).start.toISOString(), '2026-11-27T05:00:00.000Z');
});

/* ------------------------------------------------------------------- money */

const friday = (subtotal: number, shipping: number, active = true) => quoteFriday({ active, subtotal, shipping });
const pick = (subtotal: number, shipping: number, code: CodeQuote | null, active = true) =>
  orderMoney({ subtotal, shipping, pick: pickBestDiscount({ code, friday: friday(subtotal, shipping, active), shipping }) });

test('5% of goods, never of shipping', () => {
  const m = pick(200, 9, null);
  assert.equal(m.discountCode, FRIDAY_CODE);
  assert.equal(m.discountTotal, 10);
  assert.equal(m.shipping, 9);
  assert.equal(m.total, 199);
});

test('outside the window nothing is taken off', () => {
  const m = pick(200, 9, null, false);
  assert.equal(m.discountCode, null);
  assert.equal(m.discountTotal, 0);
  assert.equal(m.total, 209);
});

test('minimum edge: goods 96 + $9 qualifies (100.20); goods 95 does not (99.25) and pays full 104', () => {
  const ok = friday(96, 9);
  assert.equal(ok.qualifies, true);
  assert.equal(pick(96, 9, null).total, 100.2);

  const no = friday(95, 9);
  assert.equal(no.qualifies, false);
  assert.equal(no.shortfall, 0.79);
  const m = pick(95, 9, null);
  assert.equal(m.discountCode, null);
  assert.equal(m.total, 104);
});

test('the shortfall, once added, qualifies exactly', () => {
  const s = fridayShortfall(95, 9);
  assert.equal(friday(95 + s, 9).qualifies, true);
  assert.equal(friday(95 + s - 0.01, 9).qualifies, false);
});

test('express shipping $24: goods 80 lands exactly on 100.00 and qualifies', () => {
  const m = pick(80, 24, null);
  assert.equal(m.discountTotal, 4);
  assert.equal(m.total, 100);
  assert.equal(friday(79.99, 24).qualifies, false);
});

test('free shipping over a threshold: 5% of goods only, shipping 0', () => {
  const m = pick(150, 0, null);
  assert.equal(m.discountTotal, 7.5);
  assert.equal(m.total, 142.5);
});

test('BLACK15 (15% of goods + shipping) beats Friday 5%', () => {
  const black: CodeQuote = { code: 'BLACK15', amount: 31.35, freeShipping: false }; // 15% of 209
  const m = pick(200, 9, black);
  assert.equal(m.discountCode, 'BLACK15');
  assert.equal(m.total, 177.65);
});

test('WELCOME15 (15% of goods) beats Friday 5%', () => {
  const m = pick(200, 9, { code: 'WELCOME15', amount: 30, freeShipping: false });
  assert.equal(m.discountCode, 'WELCOME15');
  assert.equal(m.total, 179);
});

test('a smaller code loses to Friday 5%: never both', () => {
  const m = pick(300, 9, { code: 'TAKE5', amount: 5, freeShipping: false });
  assert.equal(m.discountCode, FRIDAY_CODE);
  assert.equal(m.discountTotal, 15);
  assert.equal(m.total, 294);
});

test('a tie goes to Friday 5% (no limited code is spent)', () => {
  const m = pick(100, 9, { code: 'FIVE', amount: 5, freeShipping: false });
  assert.equal(m.discountCode, FRIDAY_CODE);
  assert.equal(m.total, 104);
});

test('free-shipping code counts as the shipping it waives', () => {
  const small = pick(100, 9, { code: 'SHIPFREE', amount: 0, freeShipping: true }); // 9 > 5
  assert.equal(small.discountCode, 'SHIPFREE');
  assert.equal(small.shipping, 0);
  assert.equal(small.total, 100);
  const big = pick(300, 9, { code: 'SHIPFREE', amount: 0, freeShipping: true }); // 15 > 9
  assert.equal(big.discountCode, FRIDAY_CODE);
  assert.equal(big.shipping, 9);
  assert.equal(big.total, 294);
});

test('a code refused by the server (null) leaves Friday 5% to apply', () => {
  const m = pick(200, 9, null);
  assert.equal(m.discountCode, FRIDAY_CODE);
});

test('code under the minimum is refused upstream; Friday may still qualify', () => {
  /* 15% of (105+9) = 17.10 → 96.90 < 100, so evaluateDiscount refuses BLACK15 (null here). */
  const m = pick(105, 9, null);
  assert.equal(m.discountCode, FRIDAY_CODE);
  assert.equal(m.total, 108.75);
});

test('subtotal + shipping − discountTotal = total always holds', () => {
  for (const [s, sh] of [[123.45, 9], [99.99, 24], [1000, 0], [96, 9]] as const) {
    const m = pick(s, sh, null);
    assert.equal(Math.round((m.subtotal + m.shipping - m.discountTotal) * 100) / 100, m.total);
  }
});

test('labels', () => {
  assert.equal(discountLabel('FRIDAY5'), 'Friday 5% off');
  assert.equal(discountLabel('BLACK15'), 'Discount (BLACK15)');
  assert.equal(discountLabel(null), 'Discount');
});
