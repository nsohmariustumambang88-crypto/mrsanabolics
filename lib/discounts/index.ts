import 'server-only';

import type { Discount } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { formatPrice } from '@/lib/format';
import { MINIMUM_ORDER } from '@/lib/orders/minimum';
import type { AdvertisedDiscount } from '@/lib/types';

/*
  Discount codes: the one place a code is turned into money off.

  Everything that decides whether a code applies lives here rather than in the API route or the
  checkout, because there are three callers that must all reach the same answer — the public
  validator, the admin preview, and whatever records the order. Three copies of "is it still
  running" is how a code that expired on Friday keeps working at the till.

  Like the CRM and the order path, this file uses single writes and the ARRAY form of
  $transaction. Never prisma.$transaction(async tx => …): against Neon behind PgBouncer that
  holds a connection open across several remote round trips and blows Prisma's 5s ceiling.
  See lib/crm/contacts.ts for the incident this rule came from.
*/

/* ------------------------------------------------------------------ shaping */

/**
 * The stored form of a code: upper-case, no spaces anywhere.
 *
 * Spaces are stripped rather than trimmed because a code is read aloud, written on a card and
 * pasted out of an email that wrapped it — "SPRING 24" and "SPRING24" are the same intent, and
 * a shopper who typed the space is not wrong.
 */
export function normaliseCode(raw: string): string {
  return raw.replace(/\s+/g, '').toUpperCase();
}

/** Round to whole cents. Money that carries a third decimal does not survive being added up. */
function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/* --------------------------------------------------------------- evaluation */

export type DiscountRefusal =
  | 'not-found'
  | 'paused'
  | 'expired'
  | 'not-started'
  | 'below-minimum'
  /** The total after the discount (shipping included) would be under the shop minimum. */
  | 'below-order-minimum'
  | 'usage-limit-reached'
  | 'per-contact-limit-reached';

export type DiscountEvaluation =
  | { ok: true; discount: Discount; amount: number; freeShipping: boolean }
  /** `minimum` is set for `below-minimum` and `below-order-minimum`, so the shopper can be told the amount. */
  | { ok: false; reason: DiscountRefusal; minimum?: number };

/*
  Codes whose percentage or fixed amount also comes off the shipping. The owner set this for the
  BLACK15 promotion only; WELCOME15 and every other code stay products-only. A list in code rather
  than a column, so the promotion needed no schema change; move it to the Discount row if staff
  need to set it themselves.
*/
const SHIPPING_INCLUSIVE_CODES = new Set(['BLACK15']);

export function coversShipping(code: string): boolean {
  return SHIPPING_INCLUSIVE_CODES.has(code.trim().toUpperCase());
}

export type EvaluateDiscountInput = {
  code: string;
  /**
   * The basket total the discount is measured against, before shipping.
   *
   * When a code is scoped to a category (`discount.categoryId`), the caller is the only thing
   * that knows which lines qualify, so it passes the eligible portion. This function does not
   * see the basket and deliberately does not guess at it.
   */
  subtotal: number;
  /**
   * The shipping charge on this order. A code in SHIPPING_INCLUSIVE_CODES comes off the order
   * total INCLUDING shipping; every other code comes off the products only. Either way the total
   * after the discount must still reach MINIMUM_ORDER. `minSubtotal` is measured on products alone.
   */
  shipping?: number;
  /** Optional. Without it, `perContactLimit` cannot be checked and is not pretended to be. */
  contactId?: string | null;
};

/**
 * Decide whether a code applies to this basket, and for how much.
 *
 * The order of the checks is the order a person would ask them in: does it exist, is it running,
 * is it running *now*, is the basket big enough, is there any left. The first failure wins, so
 * the reason an administrator sees is the first real obstacle rather than the last one tested.
 */
export async function evaluateDiscount(
  input: EvaluateDiscountInput
): Promise<DiscountEvaluation> {
  const code = normaliseCode(input.code ?? '');
  if (!code) return { ok: false, reason: 'not-found' };

  /*
    Matched case-insensitively even though every code is written upper-case. findUnique on the
    normalised string would be enough today; this also survives a row inserted by hand, and the
    column is unique so there is still at most one answer.
  */
  const discount = await prisma.discount.findFirst({
    where: { code: { equals: code, mode: 'insensitive' } },
  });

  if (!discount) return { ok: false, reason: 'not-found' };

  if (discount.status === 'PAUSED') return { ok: false, reason: 'paused' };
  if (discount.status === 'EXPIRED') return { ok: false, reason: 'expired' };

  const now = new Date();

  /*
    The window is checked against the clock, not against `status`. A code whose end date passed
    an hour ago is expired whether or not the sweep has run yet — a discount that stays live
    because a background job has not fired is money given away by scheduling.
  */
  if (discount.endsAt && discount.endsAt.getTime() <= now.getTime()) {
    return { ok: false, reason: 'expired' };
  }
  if (discount.startsAt && discount.startsAt.getTime() > now.getTime()) {
    return { ok: false, reason: 'not-started' };
  }

  const subtotal =
    Number.isFinite(input.subtotal) && input.subtotal > 0 ? round2(input.subtotal) : 0;

  if (discount.minSubtotal !== null && subtotal < Number(discount.minSubtotal)) {
    return { ok: false, reason: 'below-minimum', minimum: Number(discount.minSubtotal) };
  }

  if (discount.usageLimit !== null && discount.usageCount >= discount.usageLimit) {
    return { ok: false, reason: 'usage-limit-reached' };
  }

  if (discount.perContactLimit !== null && input.contactId) {
    const used = await prisma.discountRedemption.count({
      where: { discountId: discount.id, contactId: input.contactId },
    });
    if (used >= discount.perContactLimit) {
      return { ok: false, reason: 'per-contact-limit-reached' };
    }
  }

  const shipping =
    Number.isFinite(input.shipping) && (input.shipping as number) > 0
      ? round2(input.shipping as number)
      : 0;
  /* What the code is struck on: products plus shipping for the codes that cover shipping,
     products alone for every other code. */
  const base = coversShipping(discount.code) ? round2(subtotal + shipping) : subtotal;

  const value = Number(discount.value);
  let amount = 0;
  let freeShipping = false;

  switch (discount.type) {
    case 'PERCENTAGE':
      /* Capped at the total. A 120% code is refused at the door by validation, but a cap
         here means even a row written by hand cannot produce a negative total. */
      amount = Math.min(round2((base * value) / 100), base);
      break;
    case 'FIXED':
      /* Same reasoning: $50 off a $20 order is $20 off, never $30 handed back. */
      amount = Math.min(round2(value), base);
      break;
    case 'FREE_SHIPPING':
      /* The saving is the shipping line. The caller zeroes the delivery charge; `amount`
         stays 0 so the shipping saving is not counted twice. */
      amount = 0;
      freeShipping = true;
      break;
  }

  /*
    The shop minimum is on the amount payable, so a code that would take the order under it is
    refused rather than applied: "Your total after discount must be $100 or more" is something a
    shopper can act on, where an order refused at the last step is not.
  */
  const payable = round2(subtotal + shipping - amount - (freeShipping ? shipping : 0));
  if (payable < MINIMUM_ORDER) {
    return { ok: false, reason: 'below-order-minimum', minimum: MINIMUM_ORDER };
  }

  return { ok: true, discount, amount: round2(amount), freeShipping };
}

/* --------------------------------------------------------------- redemption */

export type RedeemDiscountInput = {
  discountId: string;
  orderReference?: string | null;
  contactId?: string | null;
  amount: number;
};

/**
 * Record one use of a code.
 *
 * The redemption row and the counter move together, as ONE array-form transaction — a single
 * round trip that either both happen or neither does. Written as two awaits, a connection
 * dropped between them leaves a code that was used but shows as unused, and the usage limit
 * stops being a limit.
 */
export async function redeemDiscount(input: RedeemDiscountInput): Promise<void> {
  await prisma.$transaction([
    prisma.discountRedemption.create({
      data: {
        discountId: input.discountId,
        orderReference: input.orderReference ?? null,
        contactId: input.contactId ?? null,
        amount: round2(input.amount),
      },
    }),
    prisma.discount.update({
      where: { id: input.discountId },
      data: { usageCount: { increment: 1 } },
    }),
  ]);
}

/* ------------------------------------------------------------------- sweep */

/**
 * Flip codes whose window has closed to EXPIRED.
 *
 * This is housekeeping so the admin list reads truthfully, NOT the enforcement — `evaluateDiscount`
 * checks the clock itself and refuses a past window regardless of what `status` says. If this
 * function never ran again, no expired code would work; the list would just look untidy.
 *
 * Returns how many rows moved.
 */
export async function expireDiscountsPastEnd(): Promise<number> {
  const result = await prisma.discount.updateMany({
    where: { status: 'ACTIVE', endsAt: { not: null, lte: new Date() } },
    data: { status: 'EXPIRED' },
  });
  return result.count;
}

/* -------------------------------------------------------------- advertising */

/**
 * Whether ONE named code may be advertised on the storefront, and what to say about it.
 *
 * It takes a code rather than choosing one, and that is the whole safety of it. "Show whichever
 * codes are active" would publish codes that were handed out privately — a goodwill code for one
 * customer, a code for a single partner — on the busiest page of the site, where aggregator
 * scrapers find them within hours. The only code that reaches the storefront is the one an
 * administrator typed into the `hero_promo_code` setting.
 *
 * It then applies the same rules the checkout applies, minus the basket: paused, not yet started,
 * past its end, or used up, and it is not advertised. The clock is checked directly, as in
 * `evaluateDiscount`, so an expired code stops being advertised whether or not the sweep has run.
 * Promoting a code the checkout then refuses is worse than promoting nothing — it spends the
 * shopper's trust on the one line they will actually try.
 *
 * Returns null for any of those, and never throws: a failed read costs the promotion, never the
 * home page.
 */
/**
 * The code to promote: the `hero_promo_code` setting. On a development server only,
 * `PREVIEW_PROMO_CODE` stands in when the setting is blank, so the popup and the checkout
 * checkbox can be previewed locally without advertising the code on the live site.
 */
export function promotedCode(setting: string | undefined): string {
  if (setting) return setting;
  return process.env.NODE_ENV === 'development' ? process.env.PREVIEW_PROMO_CODE ?? '' : '';
}

export async function advertisedDiscount(raw: string): Promise<AdvertisedDiscount | null> {
  const code = normaliseCode(raw ?? '');
  if (!code) return null;

  try {
    const discount = await prisma.discount.findFirst({
      where: { code: { equals: code, mode: 'insensitive' } },
    });
    if (!discount || discount.status !== 'ACTIVE') return null;

    const now = Date.now();
    if (discount.endsAt && discount.endsAt.getTime() <= now) return null;
    if (discount.startsAt && discount.startsAt.getTime() > now) return null;
    if (discount.usageLimit !== null && discount.usageCount >= discount.usageLimit) return null;

    const value = Number(discount.value);
    const headline =
      discount.type === 'PERCENTAGE'
        ? `${value}% off`
        : discount.type === 'FIXED'
          ? `${formatPrice(value)} off`
          : 'Free delivery';

    /*
      Every condition that would make the checkout refuse the code is SAID, because a shopper who
      reads "10% off" and is then told their basket is too small has been misled by the headline.
      A category-scoped code names its category for the same reason.
    */
    const conditions: string[] = [];
    if (discount.categoryId) {
      const category = await prisma.category.findUnique({
        where: { id: discount.categoryId },
        select: { name: true },
      });
      if (category) conditions.push(`on ${category.name}`);
    }
    if (discount.minSubtotal !== null) {
      /* "or more", not "over": a basket of exactly the minimum qualifies. */
      conditions.push(`on orders of ${formatPrice(Number(discount.minSubtotal))} or more`);
    }

    return {
      code: discount.code,
      headline,
      condition: conditions.join(' '),
      endsAt: discount.endsAt ? discount.endsAt.toISOString() : null,
      sitewide: !discount.categoryId,
      includesShipping: discount.type !== 'FREE_SHIPPING' && coversShipping(discount.code),
    };
  } catch {
    return null;
  }
}

/* ---------------------------------------------------------------- messaging */

/*
  What a SHOPPER is told.

  `not-found` and `expired` return the same sentence, and that is deliberate — do not "improve"
  it by making them specific.

  A form that says "that code has expired" for a real code and "no such code" for an invented one
  is a code-guessing oracle: anybody can sit on it and enumerate the codes this shop has ever
  issued, which is how private codes end up on voucher-aggregator sites within hours of being
  sent to one customer. It is the same reasoning that stops /api/subscribe revealing whether an
  address is already on the list.

  The admin is not lied to. It reads the raw `DiscountRefusal` and shows the true reason —
  ADMIN_REASON below — because an administrator already knows which codes exist.
*/
const SHOPPER_MESSAGE: Record<DiscountRefusal, string> = {
  'not-found': 'That code is not valid.',
  /* Identical to not-found. See the note above before changing this. */
  expired: 'That code is not valid.',
  paused: 'That code is not currently being accepted.',
  'not-started': 'That code cannot be used yet.',
  'below-minimum': 'Your basket is below the minimum for that code.',
  'below-order-minimum': `Your total after discount must be ${formatPrice(MINIMUM_ORDER)} or more.`,
  'usage-limit-reached': 'That code has been fully claimed.',
  'per-contact-limit-reached': 'You have already used that code.',
};

export function reasonMessage(reason: DiscountRefusal): string {
  return SHOPPER_MESSAGE[reason] ?? SHOPPER_MESSAGE['not-found'];
}

/** The true reason, for admin screens only. Never send this to a shopper. */
export const ADMIN_REASON: Record<DiscountRefusal, string> = {
  'not-found': 'No code by that name.',
  expired: 'Its window has ended.',
  paused: 'It is paused.',
  'not-started': 'Its window has not opened yet.',
  'below-minimum': 'The basket is below its minimum.',
  'below-order-minimum': 'With the code applied, the order would be under the shop minimum.',
  'usage-limit-reached': 'Its usage limit is used up.',
  'per-contact-limit-reached': 'This customer has used it as often as allowed.',
};

/* ------------------------------------------------------------------ labels */

export const DISCOUNT_TYPES: { value: Discount['type']; label: string; hint: string }[] = [
  { value: 'PERCENTAGE', label: 'Percentage off', hint: 'Value is percentage points, 1–100.' },
  { value: 'FIXED', label: 'Fixed amount off', hint: 'Value is money off the subtotal.' },
  { value: 'FREE_SHIPPING', label: 'Free shipping', hint: 'Value is ignored.' },
];

export const DISCOUNT_STATUSES: { value: Discount['status']; label: string }[] = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'PAUSED', label: 'Paused' },
  { value: 'EXPIRED', label: 'Expired' },
];
