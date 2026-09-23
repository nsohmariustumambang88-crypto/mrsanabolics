import 'server-only';

import type { OrderStatus, Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { evaluateDiscount, redeemDiscount } from '@/lib/discounts';
import { sendOrderConfirmation, sendAdminOrderNotification, sendOrderStatusUpdate } from '@/lib/email/resend';

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
    postcode: string;
    country: string;
  };
  shippingCost?: number;
  /** The delivery option chosen, by name. Snapshotted like the line prices. */
  shippingMethod?: string | null;
  /**
   * A discount code as typed. It is RE-EVALUATED here against the live table — never trusted as
   * an amount — because the only place a discount may be decided is the server.
   */
  discountCode?: string | null;
  notes?: string | null;
  actorEmail?: string | null;
};

export type CreateOrderResult =
  | { ok: true; id: string; reference: string }
  | { ok: false; error: string };

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
  let discountCode: string | null = null;
  let discountTotal = 0;
  let redeemable: { discountId: string; amount: number } | null = null;

  if (input.discountCode) {
    const evaluated = await evaluateDiscount({
      code: input.discountCode,
      subtotal,
      contactId: contact.id,
    });

    if (evaluated.ok) {
      discountCode = evaluated.discount.code;
      discountTotal = evaluated.amount;
      if (evaluated.freeShipping) shippingCost = 0;
      redeemable = { discountId: evaluated.discount.id, amount: evaluated.amount };
    }
  }

  /* Never below zero, whatever a percentage and a minimum conspire to produce. */
  const goods = Math.max(0, subtotal - discountTotal);
  const total = goods + shippingCost;

  const reference = await uniqueReference();

  const created = await prisma.order.create({
    data: {
      reference,
      contactId: contact.id,
      shipName: input.shipping.name,
      shipLine1: input.shipping.line1,
      shipLine2: input.shipping.line2 ?? null,
      shipCity: input.shipping.city,
      shipPostcode: input.shipping.postcode,
      shipCountry: input.shipping.country,
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
        create: {
          summary: `Order ${reference} created with ${items.length} line${items.length === 1 ? '' : 's'}.`,
          detail: items.map((i) => `${i.quantity} × ${i.name}`).join('\n'),
          actorEmail: input.actorEmail ?? null,
        },
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

  /* Send emails asynchronously - don't block order creation on email delivery */
  sendOrderConfirmation(
    contact.email,
    reference,
    items.map((i) => ({
      name: i.name,
      quantity: i.quantity,
      price: Number(i.unitPrice),
    }))
  ).catch(() => {
    /* Order is already created; email failure must not undo it */
  });

  sendAdminOrderNotification(
    reference,
    contact.email,
    items.map((i) => ({
      name: i.name,
      quantity: i.quantity,
    }))
  ).catch(() => {
    /* Admin notification failure doesn't affect the customer */
  });

  return { ok: true, id: created.id, reference: created.reference };
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
  actorEmail: string
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

  /* Only stamp a milestone the first time it is reached. */
  const alreadyStamped =
    (status === 'CONFIRMED' && order.confirmedAt) ||
    (status === 'SHIPPED' && order.shippedAt) ||
    (status === 'CANCELLED' && order.cancelledAt);

  const summary = `Status moved from ${STATUS_LABEL[order.status]} to ${STATUS_LABEL[status]}.`;

  await prisma.order.update({
    where: { id: orderId },
    data: {
      status,
      ...(alreadyStamped ? {} : stampFor(status)),
      events: { create: { summary, actorEmail } },
    },
  });

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

  /* Send status update email to customer */
  sendOrderStatusUpdate(
    order.contact.email,
    order.reference,
    STATUS_LABEL[status],
    status === 'SHIPPED'
      ? 'Your order is on its way! You can expect delivery within the estimated timeframe.'
      : status === 'DELIVERED'
        ? 'Your order has arrived! Please verify the contents match your order.'
        : status === 'CANCELLED'
          ? 'Your order has been cancelled. If you have questions, please contact support.'
          : undefined
  ).catch(() => {
    /* Status change is already recorded; email failure doesn't affect it */
  });

  return { ok: true };
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
