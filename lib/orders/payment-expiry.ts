import 'server-only';

import { prisma } from '@/lib/prisma';
import {
  CRYPTO_DETECTED_EVENT,
  PAYMENT_DEADLINE_EVENT_PREFIX,
  UNPAID_CANCEL_EVENT,
} from '@/lib/orders/payment-deadline';

/*
  Cancels storefront orders whose 90-minute payment window has run out
  (lib/orders/payment-deadline.ts).

  There is no scheduler fine enough to do this on the minute (Vercel's free cron runs once a
  day), so it runs whenever somebody looks: the payment page and its status poll check their
  own order, the admin orders list and dashboard check all of them, and the daily cron sweeps
  whatever nobody looked at. An order is therefore never shown as waiting after its time is up.

  Cancelled only when ALL of these hold: status NEW, a deadline event older than now, no Cash
  App screenshot, and no crypto payment detected by NOWPayments. The status change is a
  conditional update (NEW → CANCELLED), so a webhook confirming the order at the same moment
  wins rather than being overwritten. No email is sent: the customer hears from the shop only
  once a payment is confirmed (the owner's rule).

  A crypto payment that arrives later still confirms the order through the webhook, and a Cash
  App screenshot can still be uploaded to an order cancelled this way (payment-proof route).
*/

export async function expireUnpaidOrders(opts: { reference?: string } = {}): Promise<string[]> {
  const now = new Date();
  const due = await prisma.order.findMany({
    where: {
      status: 'NEW',
      ...(opts.reference ? { reference: opts.reference } : {}),
      paymentProofs: { none: {} },
      events: {
        /* ISO dates in UTC compare correctly as text. */
        some: {
          summary: { startsWith: PAYMENT_DEADLINE_EVENT_PREFIX },
          detail: { lt: now.toISOString() },
        },
        none: { summary: CRYPTO_DETECTED_EVENT },
      },
    },
    select: { id: true, reference: true, contactId: true, cancelledAt: true },
    take: 100,
  });

  const cancelled: string[] = [];
  for (const order of due) {
    const changed = await prisma.order.updateMany({
      where: { id: order.id, status: 'NEW' },
      data: { status: 'CANCELLED', ...(order.cancelledAt ? {} : { cancelledAt: now }) },
    });
    if (changed.count === 0) continue;
    cancelled.push(order.reference);
    await prisma.$transaction([
      prisma.orderEvent.create({ data: { orderId: order.id, summary: UNPAID_CANCEL_EVENT } }),
      prisma.contact.update({
        where: { id: order.contactId },
        data: {
          lastActivityAt: now,
          activities: {
            create: {
              type: 'ORDER_STATUS_CHANGED',
              summary: `Order ${order.reference}: New → Cancelled (not paid in time).`,
            },
          },
        },
      }),
    ]);
  }
  return cancelled;
}

/** The sweep, for pages that must not fail because it did. */
export async function expireUnpaidOrdersSafe(opts: { reference?: string } = {}): Promise<void> {
  await expireUnpaidOrders(opts).catch((error) => {
    console.error('[payment expiry] sweep failed:', error);
  });
}
