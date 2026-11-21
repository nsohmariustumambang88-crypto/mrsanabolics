import 'server-only';

import type { OrderStatus, Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { advertisedDiscount, evaluateDiscount, reasonMessage, redeemDiscount } from '@/lib/discounts';
import { MINIMUM_ORDER } from '@/lib/orders/minimum';
import {
  sendOrderConfirmation,
  sendAdminOrderNotification,
  sendOrderStatusUpdate,
  sendReviewRequestEmail,
} from '@/lib/email/resend';
import { SITE } from '@/lib/site';
import { deadlineEventSummary } from '@/lib/orders/payment-deadline';
import {
  FRIDAY_NAME,
  orderMoney,
  pickBestDiscount,
  quoteFriday,
  type CodeQuote,
} from '@/lib/offers/friday';
import { weeklyOfferActiveAt } from '@/lib/offers/weekly-offer';

/* The order event that records the review request, so it is sent at most once per order. */
const REVIEW_REQUEST_EVENT = 'Review request emailed.';
/* The order event that records the "Order Confirmed" email, so it is sent at most once. */
const CONFIRMATION_EVENT = 'Order confirmation emailed.';

/*
  The order write path.

  Read the note on the Order model first: there are no payment fields anywhere in here. This
  build does not collect money, and nothing in this file records that any was received. What it
  models is the fulfilment side — what was ordered, at the price agreed on the day, where it is
  going, and how far along it is.

  Two rules the schema and this file keep together:

  - **Lines are snapshots.** The product name, slug and unit price are copied onto the line when
    it is created and never read back through the relation. Renaming or repricing a product must
    not restate what somebody bought last month, and deleting one must not erase the line.
  - **Totals are stored, not derived at render time.** Recomputing a total from today's catalogue
    is how an order's value silently changes after the fact.

  Like the CRM, this file uses nested writes rather than interactive transactions: against Neon
  behind PgBouncer, prisma.$transaction(async tx => …) holds a connection across several remote
  round trips and blows Prisma's 5s ceiling. See lib/crm/contacts.ts.
*/

export const ORDER_STATUSES: { value: OrderStatus; label: string; hint: string }[] = [
  { value: 'NEW', label: 'New', hint: 'Placed, not yet looked at.' },
  { value: 'CONFIRMED', label: 'Confirmed', hint: 'Checked and accepted.' },
  { value: 'PACKED', label: 'Packed', hint: 'Picked and ready to go.' },
  { value: 'SHIPPED', label: 'Shipped', hint: 'Handed to the carrier.' },
  { value: 'DELIVERED', label: 'Delivered', hint: 'Arrived.' },
  { value: 'CANCELLED', label: 'Cancelled', hint: 'Will not be fulfilled.' },
];

export const STATUS_LABEL: Record<OrderStatus, string> = Object.fromEntries(
  ORDER_STATUSES.map((s) => [s.value, s.label])
) as Record<OrderStatus, string>;

/** Statuses that still need somebody to do something. Drives the queue and the menu bubble. */
export const OPEN_STATUSES: OrderStatus[] = ['NEW', 'CONFIRMED', 'PACKED'];

/*
  A short, human reference.

  Not the primary key: `id` is a cuid, which nobody can read down a phone line or copy off a
  label without transposing something. Ambiguous characters are left out of the alphabet for the
  same reason — no O/0, no I/1/l.
*/
const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

function randomReference(): string {
  let tail = '';
  for (let i = 0; i < 6; i += 1) {
    tail += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return `MRA-${tail}`;
}

/**
 * Reserve a reference nobody else holds.
 *
 * Retries on collision rather than trusting randomness: the space is large, but "large enough
 * that it will not happen" is the reasoning behind most duplicate-key incidents. After a few
 * attempts it gives up loudly instead of writing a duplicate.
 */
async function uniqueReference(): Promise<string> {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const candidate = randomReference();
    const taken = await prisma.order.findUnique({
      where: { reference: candidate },
      select: { id: true },
    });
    if (!taken) return candidate;
  }
  throw new Error('Could not allocate an unused order reference.');
}

export type OrderLineInput = {
  productId: string;
  quantity: number;
};

export type CreateOrderInput = {
  contactId: string;
  lines: OrderLineInput[];
  shipping: {
    name: string;
    line1: string;
    line2?: string | null;
    city: string;
    /**
     * The storefront checkout no longer asks for one (November 2026); staff may still type one.
     * The column is NOT NULL, so a missing postcode is stored as ''. Display goes through
     * lib/orders/address.ts, which drops empty parts.
     */
    postcode?: string | null;
    country: string;
    /** For the courier. Snapshotted with the address; the checkout requires it, staff may not have one. */
    phone?: string | null;
  };
  shippingCost?: number;
  /** The delivery option chosen, by name. Snapshotted like the line prices. */
  shippingMethod?: string | null;
  /**
   * A discount code as typed. It is RE-EVALUATED here against the live table — never trusted as
   * an amount — because the only place a discount may be decided is the server.
   */
  discountCode?: string | null;
  /**
   * Storefront checkout: the shopper saw this code applied, so if the server now refuses it the
   * order is NOT placed at a higher price than they were shown — it fails with the reason. The
   * admin leaves this off: an order taken by phone is recorded at full price instead.
   */
  requireDiscount?: boolean;
  /**
   * Storefront orders only: Friday 5% (lib/offers/friday.ts) is considered, as a clock rule
   * decided at this moment. Staff-recorded orders leave it off: they record a sale agreed with a
   * person, often after the fact, and its price must not depend on when staff typed it in.
   */
  weeklyOffer?: boolean;
  /**
   * The checkout showed Friday 5% applied. If the server no longer applies it (the window closed
   * or the switch went off between the quote and the click), the order is refused with the new
   * total rather than created at a price the shopper was not shown.
   */
  expectWeeklyOffer?: boolean;
  notes?: string | null;
  actorEmail?: string | null;
  /**
   * Storefront checkout only: how the customer chose to pay, for the staff notification. Its
   * presence also means "send the customer nothing yet" — see the note where emails are sent.
   */
  payment?: {
    label: string;
    /**
     * The payment deadline (lib/orders/payment-deadline.ts), recorded as an order event: the
     * payment page counts down to it. Nothing is cancelled when it passes.
     */
    dueAt?: Date | null;
  };
};

export type CreateOrderResult =
  | { ok: true; id: string; reference: string; total: number }
  | { ok: false; error: string };

export { MINIMUM_ORDER };

function money(value: Prisma.Decimal | number | string): number {
  return Number(value);
}

export async function createOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
  const lines = input.lines.filter((l) => l.quantity > 0);
  if (lines.length === 0) return { ok: false, error: 'An order needs at least one line.' };

  const contact = await prisma.contact.findUnique({
    where: { id: input.contactId },
    select: { id: true, email: true, name: true },
  });
  if (!contact) return { ok: false, error: 'That contact no longer exists.' };

  const products = await prisma.product.findMany({
    where: { id: { in: lines.map((l) => l.productId) } },
    select: { id: true, name: true, slug: true, price: true },
  });

  const byId = new Map(products.map((p) => [p.id, p]));
  const missing = lines.filter((l) => !byId.has(l.productId));
  if (missing.length > 0) return { ok: false, error: 'One of those products no longer exists.' };

  /* Snapshot every line at today's price before anything is written. */
  const items = lines.map((line) => {
    const product = byId.get(line.productId)!;
    const unitPrice = money(product.price);
    return {
      productId: product.id,
      name: product.name,
      slug: product.slug,
      unitPrice: unitPrice.toFixed(2),
      quantity: line.quantity,
      lineTotal: (unitPrice * line.quantity).toFixed(2),
    };
  });

  const subtotal = items.reduce((sum, i) => sum + Number(i.lineTotal), 0);
  let shippingCost = input.shippingCost ?? 0;

  /*
    The discount is evaluated HERE, against the live table, from the code alone.

    The checkout quotes a code so a shopper can see what it is worth, but that quote is a
    display, not an authority — a price the browser worked out is a price the browser can edit.
    This is the moment the money is decided, so this is where the rules are applied: the window,
    the minimum, the usage limit, all of it, one more time.

    A code that no longer qualifies does NOT fail the order. Somebody is on the phone; refusing
    to record what they bought because a code lapsed between the quote and the write is the
    wrong trade. The order is recorded at full price and the code simply is not applied.
  */
  let codeQuote: CodeQuote | null = null;
  let redeemable: { discountId: string; amount: number } | null = null;

  if (input.discountCode) {
    const evaluated = await evaluateDiscount({
      code: input.discountCode,
      subtotal,
      /* The code comes off products AND shipping; see evaluateDiscount. */
      shipping: shippingCost,
      contactId: contact.id,
    });

    if (evaluated.ok) {
      codeQuote = {
        code: evaluated.discount.code,
        amount: evaluated.amount,
        freeShipping: evaluated.freeShipping,
      };
      redeemable = { discountId: evaluated.discount.id, amount: evaluated.amount };
    } else if (input.requireDiscount) {
      return { ok: false, error: reasonMessage(evaluated.reason) };
    }
  }

  /*
    Friday 5%, decided now, by the server's clock and the kill switch, never by the browser.
    Then ONE discount: the larger of the code and Friday 5% (pickBestDiscount, the same function
    the checkout and /api/discount/validate run). An order created inside the window keeps it
    however late it is paid, because the total is stored here; one created outside never has it.
  */
  const fridayActive = input.weeklyOffer ? await weeklyOfferActiveAt(new Date()) : false;
  const friday = quoteFriday({ active: fridayActive, subtotal, shipping: shippingCost });
  const pick = pickBestDiscount({ code: codeQuote, friday, shipping: shippingCost });
  /* A code that lost to Friday 5% is not used, so it is not counted as used either. */
  if (pick.kind !== 'code') redeemable = null;

  /*
    `discountTotal` is the snapshot on the order, and subtotal + shipping − discountTotal = total
    always holds. Never below zero, whatever a percentage and a minimum conspire to produce.
  */
  const figures = orderMoney({ subtotal, shipping: shippingCost, pick });
  shippingCost = figures.shipping;
  const discountCode = figures.discountCode;
  const discountTotal = figures.discountTotal;
  const total = figures.total;

  if (input.expectWeeklyOffer && pick.kind === 'none') {
    return {
      ok: false,
      error: `${FRIDAY_NAME} is not running now, so your total is $${total.toFixed(2)}. Check the summary and press Proceed to payment again.`,
    };
  }

  if (total < MINIMUM_ORDER) {
    return {
      ok: false,
      error: discountCode
        ? `Your total after discount must be $${MINIMUM_ORDER.toFixed(2)} or more. Your order comes to $${total.toFixed(2)}.`
        : `The minimum order is $${MINIMUM_ORDER.toFixed(2)}, including shipping. Your order comes to $${total.toFixed(2)}.`,
    };
  }

  const reference = await uniqueReference();

  const created = await prisma.order.create({
    data: {
      reference,
      contactId: contact.id,
      shipName: input.shipping.name,
      shipLine1: input.shipping.line1,
      shipLine2: input.shipping.line2 ?? null,
      shipCity: input.shipping.city,
      shipPostcode: input.shipping.postcode?.trim() ?? '',
      shipCountry: input.shipping.country,
      shipPhone: input.shipping.phone ?? null,
      subtotal: subtotal.toFixed(2),
      shipping: shippingCost.toFixed(2),
      shippingMethod: input.shippingMethod ?? null,
      /* Snapshots. Editing or deleting the Discount later must not restate what this order
         was actually given — the same rule the line prices follow. */
      discountCode,
      discountTotal: discountTotal.toFixed(2),
      total: total.toFixed(2),
      notes: input.notes ?? null,
      items: { create: items },
      events: {
        create: [
          {
            summary: `Order ${reference} created with ${items.length} line${items.length === 1 ? '' : 's'}.`,
            detail: items.map((i) => `${i.quantity} × ${i.name}`).join('\n'),
            actorEmail: input.actorEmail ?? null,
          },
          ...(input.payment?.dueAt
            ? [
                {
                  summary: deadlineEventSummary(input.payment.dueAt),
                  detail: input.payment.dueAt.toISOString(),
                  actorEmail: null,
                },
              ]
            : []),
        ],
      },
    },
    select: { id: true, reference: true },
  });

  /*
    Record the redemption only once the order exists.

    Order matters: incrementing `usageCount` before the write would consume a limited code on an
    order that might never land. Doing it after means a crash in between loses the count rather
    than inventing one, and undercounting a discount is the cheaper direction to be wrong in.
  */
  if (redeemable) {
    await redeemDiscount({
      discountId: redeemable.discountId,
      orderReference: created.reference,
      contactId: contact.id,
      amount: redeemable.amount,
    }).catch(() => {
      /* The order is already recorded and correct; a failed counter must not undo it. */
    });
  }

  /* The person's timeline should show it too — one place to read a whole relationship. */
  await prisma.contact.update({
    where: { id: contact.id },
    data: {
      lastActivityAt: new Date(),
      activities: {
        create: {
          type: 'ORDER_PLACED',
          summary: `Order ${reference} placed — ${items.length} line${items.length === 1 ? '' : 's'}, ${total.toFixed(2)}.`,
          actorEmail: input.actorEmail ?? null,
        },
      },
    },
  });

  /*
    A storefront order sends the customer nothing now: their first email is the confirmation,
    once the payment is confirmed (sendPaidConfirmationOnce). The owner's rule since
    18 November 2026 — the payment page itself carries the instructions and the countdown. An
    order staff record by hand (no `payment`) still gets its "Order Received" email.
  */
  if (!input.payment) {
    sendOrderConfirmation(
      contact.email,
      reference,
      items.map((i) => ({
        name: i.name,
        quantity: i.quantity,
        price: Number(i.unitPrice),
      })),
      {
        subtotal,
        discountCode,
        discountTotal,
        shippingMethod: input.shippingMethod ?? null,
        shipping: shippingCost,
        total,
      },
      false
    ).catch(() => {
      /* Order is already created; email failure must not undo it */
    });
  }

  sendAdminOrderNotification(
    reference,
    contact.email,
    items.map((i) => ({
      name: i.name,
      quantity: i.quantity,
    })),
    /* The admin order screen is addressed by id, not by reference. */
    `${SITE.url}/admin/orders/${created.id}`,
    input.payment?.label ?? null
  ).catch(() => {
    /* Admin notification failure doesn't affect the customer */
  });

  return { ok: true, id: created.id, reference: created.reference, total };
}

/*
  Milestone stamps are set once and never cleared.

  Moving an order backwards — an admin correcting a mis-click — must not rewrite when it was
  first confirmed or first shipped. How long something took is a fact, and a timeline that can be
  reversed answers nothing. Same reasoning as `handledAt` on Enquiry.
*/
function stampFor(status: OrderStatus): Prisma.OrderUpdateInput {
  const now = new Date();
  switch (status) {
    case 'CONFIRMED':
      return { confirmedAt: now };
    case 'SHIPPED':
      return { shippedAt: now };
    case 'CANCELLED':
      return { cancelledAt: now };
    default:
      return {};
  }
}

export type StatusResult = { ok: true } | { ok: false; error: string };

export async function setOrderStatus(
  orderId: string,
  status: OrderStatus,
  /** Null when the system did it: the NOWPayments webhook, the Cash App screenshot check. */
  actorEmail: string | null,
  /**
   * `from`: move only from one of these statuses. The webhook and the screenshot check confirm
   * only a NEW order (or one cancelled for running out of time), never one staff have already
   * moved on. `notify: false` skips the customer email.
   */
  options: { from?: OrderStatus[]; notify?: boolean } = {}
): Promise<StatusResult> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      status: true,
      reference: true,
      contactId: true,
      confirmedAt: true,
      shippedAt: true,
      cancelledAt: true,
      contact: { select: { email: true } },
    },
  });

  if (!order) return { ok: false, error: 'That order no longer exists.' };
  if (order.status === status) return { ok: true };
  if (options.from && !options.from.includes(order.status)) return { ok: true };

  /* Only stamp a milestone the first time it is reached. */
  const alreadyStamped =
    (status === 'CONFIRMED' && order.confirmedAt) ||
    (status === 'SHIPPED' && order.shippedAt) ||
    (status === 'CANCELLED' && order.cancelledAt);

  const summary = `Status moved from ${STATUS_LABEL[order.status]} to ${STATUS_LABEL[status]}.`;

  /*
    Conditional on the status just read: if a webhook, the expiry sweep or another admin tab
    moved the order in between, this write does nothing rather than overwrite their decision.
  */
  const changed = await prisma.order.updateMany({
    where: { id: orderId, status: order.status },
    data: { status, ...(alreadyStamped ? {} : stampFor(status)) },
  });
  if (changed.count === 0) return { ok: true };
  await prisma.orderEvent.create({ data: { orderId, summary, actorEmail } });

  await prisma.contact.update({
    where: { id: order.contactId },
    data: {
      lastActivityAt: new Date(),
      activities: {
        create: {
          type: 'ORDER_STATUS_CHANGED',
          summary: `Order ${order.reference}: ${STATUS_LABEL[order.status]} → ${STATUS_LABEL[status]}.`,
          actorEmail,
        },
      },
    },
  });

  /*
    Delivered: one email that says it arrived AND asks for a review of each product, instead of a
    bare status notice — at most once per order, recorded as an order event, because moving an
    order back and forward again must not ask twice.
  */
  if (status === 'DELIVERED') {
    await sendReviewRequestOnce(orderId, order.reference, order.contact.email).catch(() => {
      /* Status change is already recorded; email failure doesn't affect it */
    });
    return { ok: true };
  }

  if (options.notify === false) return { ok: true };

  /* Confirmed means paid: the full confirmation with the items, once per order. */
  if (status === 'CONFIRMED') {
    await sendPaidConfirmationOnce(orderId).catch((error) => {
      console.error(`[orders] confirmation email for ${order.reference} failed:`, error);
    });
    return { ok: true };
  }

  /* Send status update email to customer */
  sendOrderStatusUpdate(
    order.contact.email,
    order.reference,
    STATUS_LABEL[status],
    status === 'SHIPPED'
      ? 'Your order is on its way! You can expect delivery within the estimated timeframe.'
      : status === 'CANCELLED'
        ? 'Your order has been cancelled. If you have questions, please contact support.'
        : undefined
  ).catch(() => {
    /* Status change is already recorded; email failure doesn't affect it */
  });

  return { ok: true };
}

/*
  The "Order Confirmed" email: the customer's first email about a storefront order, sent once
  the payment is confirmed — by the NOWPayments webhook, the Cash App screenshot check, or staff
  setting Confirmed. At most once per order (an order event records it), because an order moved
  back and confirmed again, or a webhook delivered twice, must not send it twice.
*/
export async function sendPaidConfirmationOnce(orderId: string): Promise<void> {
  const already = await prisma.orderEvent.count({ where: { orderId, summary: CONFIRMATION_EVENT } });
  if (already > 0) return;
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { contact: { select: { email: true } }, items: true },
  });
  if (!order?.contact?.email) return;
  const offer = await subscriberOfferFor(order.contactId, order.contact.email, order.discountCode);
  const { error } = await sendOrderConfirmation(
    order.contact.email,
    order.reference,
    order.items.map((i) => ({ name: i.name, quantity: i.quantity, price: Number(i.unitPrice) })),
    {
      subtotal: Number(order.subtotal),
      discountCode: order.discountCode,
      discountTotal: Number(order.discountTotal),
      shippingMethod: order.shippingMethod,
      shipping: Number(order.shipping),
      total: Number(order.total),
    },
    true,
    undefined,
    offer
  );
  if (error) throw new Error(`Resend refused the confirmation: ${error.message}`);
  await prisma.orderEvent.create({
    data: {
      orderId,
      summary: CONFIRMATION_EVENT,
      detail: `Sent to ${order.contact.email}${offer ? `, with the ${offer.code} code for their next order` : ''}.`,
    },
  });
}

/*
  The checkout's sign-up box promises a 15% code for the next order (CONSENT.checkout_offer).
  It is kept here, in the confirmation, so it reaches only someone who is subscribed and has
  paid. Offered when ALL hold: the address is SUBSCRIBED (marketing consent — the only thing
  that permits an offer), the code is live (advertisedDiscount refuses a paused, expired or
  used-up one), this person has never redeemed it, and this order did not just use it.
*/
export const WELCOME_OFFER_CODE = 'WELCOME15';

async function subscriberOfferFor(
  contactId: string,
  email: string,
  usedOnThisOrder: string | null
): Promise<{ code: string; headline: string; condition: string } | null> {
  if (usedOnThisOrder?.toUpperCase() === WELCOME_OFFER_CODE) return null;
  const subscribed = await prisma.subscriber.count({
    where: { email: { equals: email.trim(), mode: 'insensitive' }, status: 'SUBSCRIBED' },
  });
  if (subscribed === 0) return null;
  const live = await advertisedDiscount(WELCOME_OFFER_CODE);
  if (!live) return null;
  const used = await prisma.discountRedemption.count({
    where: { contactId, discount: { code: WELCOME_OFFER_CODE } },
  });
  if (used > 0) return null;
  return { code: live.code, headline: live.headline, condition: live.condition };
}

async function sendReviewRequestOnce(orderId: string, reference: string, email: string): Promise<void> {
  const already = await prisma.orderEvent.count({ where: { orderId, summary: REVIEW_REQUEST_EVENT } });
  if (already > 0) return;

  const items = await prisma.orderItem.findMany({
    where: { orderId },
    select: { name: true, slug: true, product: { select: { slug: true } } },
  });
  /* The live slug when the product still exists; the snapshot otherwise. One row per product. */
  const seen = new Set<string>();
  const links = items.flatMap((item) => {
    const slug = item.product?.slug ?? item.slug;
    if (!slug || seen.has(slug)) return [];
    seen.add(slug);
    return [{ name: item.name, url: `${SITE.url}/product/${slug}#reviews` }];
  });
  if (links.length === 0) return;

  await sendReviewRequestEmail(email, reference, links);
  await prisma.orderEvent.create({
    data: { orderId, summary: REVIEW_REQUEST_EVENT, detail: `Sent to ${email} for ${links.length} product(s).` },
  });
}

export async function addOrderNote(
  orderId: string,
  body: string,
  actorEmail: string
): Promise<StatusResult> {
  const text = body.trim();
  if (!text) return { ok: false, error: 'A note needs something in it.' };
  if (text.length > 5000) return { ok: false, error: 'That note is too long.' };

  const order = await prisma.order.findUnique({ where: { id: orderId }, select: { id: true } });
  if (!order) return { ok: false, error: 'That order no longer exists.' };

  await prisma.order.update({
    where: { id: orderId },
    data: { events: { create: { summary: 'Note added.', detail: text, actorEmail } } },
  });

  return { ok: true };
}
