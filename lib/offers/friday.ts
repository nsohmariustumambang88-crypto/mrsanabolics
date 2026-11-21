import { MINIMUM_ORDER } from '@/lib/orders/minimum';

/*
  Friday 5%: the weekly offer, as a clock rule.

  Every Friday, from 00:00 in New York until 00:00 the next day in Los Angeles (27 hours, so the
  whole of Friday in every US time zone), 5% comes off the GOODS of a storefront order. Never the
  shipping. The owner's decisions of 20 November 2026:

  - It is computed at request time from the clock. No price in the database is ever rewritten,
    so product pages, JSON-LD and the catalogue keep showing the real price.
  - One discount per order: the single larger of Friday 5% and any code applies, never both.
    On a tie Friday 5% is chosen, because it does not spend a limited-use code.
  - The shop minimum ($100 on the total paid, shipping included) still holds. Friday 5% applies
    only if goods − 5% + shipping is still at least the minimum; otherwise the order goes
    through at full price, and checkout says how much more to add to get it.
  - Its name is "Friday 5%". It is never called Black Friday.

  A plain module with no server imports: the checkout, the cart, the banner, the server and the
  unit tests (tests/friday-offer.test.ts) all run these same functions, so the browser's quote
  and the order createOrder writes are the same arithmetic. Only the decision that the offer is
  ON comes from the server (the `friday_offer_enabled` setting and the server's clock).

  Time zones are named (America/New_York, America/Los_Angeles) and resolved with Intl, so the
  window follows daylight saving on its own: 04:00–07:00 UTC in summer, 05:00–08:00 in winter.
*/

export const FRIDAY_CODE = 'FRIDAY5';
export const FRIDAY_PERCENT = 5;
export const FRIDAY_NAME = 'Friday 5%';
/** The line on the cart, the checkout, the order record, the admin and the email. */
export const FRIDAY_LINE = 'Friday 5% off';

export const FRIDAY_START_ZONE = 'America/New_York';
export const FRIDAY_END_ZONE = 'America/Los_Angeles';

/* ------------------------------------------------------------------ money */

export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/** 5% of the goods, to the cent. */
export function fridayAmount(goods: number): number {
  if (!Number.isFinite(goods) || goods <= 0) return 0;
  return round2((goods * FRIDAY_PERCENT) / 100);
}

export function isFridayCode(code: string | null | undefined): boolean {
  return (code ?? '').trim().toUpperCase() === FRIDAY_CODE;
}

/** How a stored discount reads to a person: "Friday 5% off", or "Discount (CODE)". */
export function discountLabel(code: string | null | undefined): string {
  if (isFridayCode(code)) return FRIDAY_LINE;
  return code ? `Discount (${code})` : 'Discount';
}

export type FridayQuote = {
  /** The offer is running now (switch on, inside the window). */
  active: boolean;
  /** Active, and the order still reaches the minimum after it. */
  qualifies: boolean;
  /** 5% of the goods: what it would take off, whether or not it qualifies. */
  amount: number;
  /** Active but not qualifying: how much more in goods would make it qualify. Otherwise 0. */
  shortfall: number;
};

/**
 * Friday 5% for this basket. `subtotal` is the goods, `shipping` the delivery charge chosen.
 * The minimum is measured as checkout measures it: goods − discount + shipping.
 */
export function quoteFriday(input: {
  active: boolean;
  subtotal: number;
  shipping: number;
  minimum?: number;
}): FridayQuote {
  const minimum = input.minimum ?? MINIMUM_ORDER;
  const subtotal = Number.isFinite(input.subtotal) && input.subtotal > 0 ? round2(input.subtotal) : 0;
  const shipping = Number.isFinite(input.shipping) && input.shipping > 0 ? round2(input.shipping) : 0;
  const amount = fridayAmount(subtotal);
  if (!input.active || subtotal === 0) return { active: input.active, qualifies: false, amount, shortfall: 0 };

  const payable = round2(subtotal - amount + shipping);
  if (payable >= minimum) return { active: true, qualifies: true, amount, shortfall: 0 };

  return { active: true, qualifies: false, amount, shortfall: fridayShortfall(subtotal, shipping, minimum) };
}

/** The least extra goods (to the cent) that makes goods − 5% + shipping reach the minimum. */
export function fridayShortfall(subtotal: number, shipping: number, minimum = MINIMUM_ORDER): number {
  const keep = 1 - FRIDAY_PERCENT / 100;
  let need = Math.ceil(((minimum - shipping) / keep) * 100 - 1e-9) / 100;
  /* Rounding the 5% to the cent can leave the first guess a cent short; step up until it holds. */
  for (let i = 0; i < 5 && round2(need - fridayAmount(need) + shipping) < minimum; i += 1) {
    need = round2(need + 0.01);
  }
  return Math.max(0, round2(need - subtotal));
}

/** A code the server accepted (evaluateDiscount), reduced to what the comparison needs. */
export type CodeQuote = { code: string; amount: number; freeShipping: boolean };

export type DiscountPick =
  | { kind: 'none'; code: null; amount: 0; freeShipping: false }
  | { kind: 'friday'; code: typeof FRIDAY_CODE; amount: number; freeShipping: false }
  | { kind: 'code'; code: string; amount: number; freeShipping: boolean };

/** What a code saves, counting a free-shipping code as the shipping it waives. */
export function codeSaving(code: CodeQuote, shipping: number): number {
  return round2(code.amount + (code.freeShipping ? Math.max(0, shipping) : 0));
}

/**
 * The one discount this order gets: the larger saving of a valid code and a qualifying Friday 5%.
 * A tie goes to Friday 5%, which spends no limited-use code.
 */
export function pickBestDiscount(input: {
  code: CodeQuote | null;
  friday: FridayQuote;
  shipping: number;
}): DiscountPick {
  const { code, friday } = input;
  const fridayQualifies = friday.qualifies && friday.amount > 0;

  if (fridayQualifies && (!code || friday.amount >= codeSaving(code, input.shipping))) {
    return { kind: 'friday', code: FRIDAY_CODE, amount: friday.amount, freeShipping: false };
  }
  /* A code the server accepted, even one that saves nothing here (free shipping on an order
     whose shipping is already free): the order records what the shopper entered, as before. */
  if (code) {
    return { kind: 'code', code: code.code, amount: code.amount, freeShipping: code.freeShipping };
  }
  return { kind: 'none', code: null, amount: 0, freeShipping: false };
}

/** The four figures stored on an order: subtotal + shipping − discountTotal = total. */
export function orderMoney(input: { subtotal: number; shipping: number; pick: DiscountPick }) {
  const shipping = input.pick.freeShipping ? 0 : round2(Math.max(0, input.shipping));
  const subtotal = round2(input.subtotal);
  const discountTotal = Math.min(round2(input.pick.amount), round2(subtotal + shipping));
  return {
    subtotal,
    shipping,
    discountCode: input.pick.code,
    discountTotal,
    total: round2(Math.max(0, subtotal + shipping - discountTotal)),
  };
}

/* ------------------------------------------------------------------- clock */

type ZonedParts = { y: number; m: number; d: number; h: number; mi: number; s: number; weekday: string };

const formatters = new Map<string, Intl.DateTimeFormat>();

function zoned(zone: string, at: Date): ZonedParts {
  let f = formatters.get(zone);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone: zone,
      hourCycle: 'h23',
      weekday: 'short',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    formatters.set(zone, f);
  }
  const p: Record<string, string> = {};
  for (const part of f.formatToParts(at)) p[part.type] = part.value;
  return {
    y: Number(p.year),
    m: Number(p.month),
    d: Number(p.day),
    h: Number(p.hour) % 24,
    mi: Number(p.minute),
    s: Number(p.second),
    weekday: p.weekday,
  };
}

/** Milliseconds the zone is ahead of UTC at that instant (negative for the Americas). */
function zoneOffset(zone: string, at: Date): number {
  const t = Math.floor(at.getTime() / 1000) * 1000;
  const p = zoned(zone, new Date(t));
  return Date.UTC(p.y, p.m - 1, p.d, p.h, p.mi, p.s) - t;
}

/** The instant a calendar day begins in a zone. */
function zonedMidnight(zone: string, y: number, m: number, d: number): Date {
  const guess = Date.UTC(y, m - 1, d, 0, 0, 0);
  const first = zoneOffset(zone, new Date(guess));
  let t = guess - first;
  const second = zoneOffset(zone, new Date(t));
  if (second !== first) t = guess - second;
  return new Date(t);
}

function addDays(y: number, m: number, d: number, days: number) {
  const t = new Date(Date.UTC(y, m - 1, d + days));
  return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() };
}

export type FridayWindow = { start: Date; end: Date };

/** The window of the Friday whose calendar date is y-m-d. */
function windowForFriday(y: number, m: number, d: number): FridayWindow {
  const next = addDays(y, m, d, 1);
  return {
    start: zonedMidnight(FRIDAY_START_ZONE, y, m, d),
    end: zonedMidnight(FRIDAY_END_ZONE, next.y, next.m, next.d),
  };
}

/**
 * The window `at` falls in, or null. Inside the window it is Friday in New York, or Friday in
 * Los Angeles, or both: New York's Friday starts it, Los Angeles's Friday ends it, and the two
 * overlap, so the union is one unbroken span.
 */
export function fridayWindowContaining(at: Date = new Date()): FridayWindow | null {
  const ny = zoned(FRIDAY_START_ZONE, at);
  if (ny.weekday === 'Fri') return windowForFriday(ny.y, ny.m, ny.d);
  const la = zoned(FRIDAY_END_ZONE, at);
  if (la.weekday === 'Fri') return windowForFriday(la.y, la.m, la.d);
  return null;
}

export function isFridayOfferTime(at: Date = new Date()): boolean {
  return fridayWindowContaining(at) !== null;
}

/** The next window to start strictly after `at`. */
export function nextFridayWindow(at: Date = new Date()): FridayWindow {
  const ny = zoned(FRIDAY_START_ZONE, at);
  for (let k = 0; k <= 8; k += 1) {
    const day = addDays(ny.y, ny.m, ny.d, k);
    if (new Date(Date.UTC(day.y, day.m - 1, day.d)).getUTCDay() !== 5) continue;
    const w = windowForFriday(day.y, day.m, day.d);
    if (w.start.getTime() > at.getTime()) return w;
  }
  /* Unreachable: there is a Friday in every eight days. */
  throw new Error('No Friday found in the next eight days.');
}
