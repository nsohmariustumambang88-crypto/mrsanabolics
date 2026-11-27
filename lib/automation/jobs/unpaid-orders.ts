import 'server-only';

import { prisma } from '@/lib/prisma';
import { SITE } from '@/lib/site';
import { paymentMethodFromNotes, parseCryptoNote } from '@/lib/checkout/order-notes';
import { cashAppDetails, proofToken } from '@/lib/checkout/cashapp';
import { CRYPTO_DETECTED_EVENT, UNPAID_CANCEL_EVENT, legacyCryptoDueAt } from '@/lib/orders/payment-deadline';
import { discountLabel } from '@/lib/offers/friday';
import { unpaidReminderEmail } from '@/lib/automation/templates';
import type { JobContext } from '@/lib/automation/run';

/*
  Unpaid order reminders. Transactional: about an order the person placed, so they go to
  non-subscribers too, carry no offer and no sales content, and need no postal address.

  Who gets one, all checked here:
  - a STOREFRONT order: its notes say how it is being paid (crypto, Cash App, bank transfer), and
    its "created" event has no staff member on it (an order typed in at /admin/orders/new records
    who typed it, and staff notes are free text that could read like a checkout's);
  - still NEW: not confirmed (paid), not cancelled;
  - between 24 hours and 7 days old. Over 7 days is skipped (decided at launch, and NOWPayments
    expires an unpaid crypto payment at 7 days anyway);
  - not a Cash App order with a screenshot uploaded (staff are checking it);
  - not a crypto order NOWPayments has already seen a payment for, nor one whose payment has
    expired, nor one that never got a payment address;
  - at most two per order. The first from 24 hours; an order that never had it gets it whatever its
    age within the 7 days (the owner's decision B, 27 November 2026: never open with "the last
    reminder"). The second only after a first was actually sent, from 72 hours and at least a day
    after the first. Each is one EmailLog key, so neither can go twice.
  - and, just before each send, the order is read again: if it was paid, cancelled or given a
    screenshot while the run was going, nothing is sent.

  This reconciles with the payment deadline of 18–19 November 2026 (lib/orders/payment-deadline):
  that 60-minute countdown is a request on the payment page and cancels nothing; these reminders
  start a day later and also cancel nothing.
*/

const HOUR = 3_600_000;
const FIRST_AT = 24 * HOUR;
const SECOND_AT = 72 * HOUR;
const MAX_AGE = 7 * 24 * HOUR;

export async function unpaidOrdersJob(ctx: JobContext): Promise<void> {
  const now = ctx.now.getTime();
  const orders = await prisma.order.findMany({
    where: {
      status: 'NEW',
      createdAt: { lte: new Date(now - FIRST_AT), gte: new Date(now - MAX_AGE) },
      ...(ctx.only?.orderIds ? { id: { in: ctx.only.orderIds } } : {}),
    },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      reference: true,
      createdAt: true,
      notes: true,
      shipName: true,
      subtotal: true,
      shipping: true,
      discountCode: true,
      discountTotal: true,
      total: true,
      contactId: true,
      contact: { select: { email: true, name: true } },
      items: { select: { name: true, quantity: true, lineTotal: true } },
      events: { select: { summary: true, actorEmail: true } },
      _count: { select: { paymentProofs: true } },
    },
  });

  const older = ctx.only ? 0 : await prisma.order.count({ where: { status: 'NEW', createdAt: { lt: new Date(now - MAX_AGE) } } });
  if (older) ctx.count('skipped: over 7 days old', older);

  let cashApp: Awaited<ReturnType<typeof cashAppDetails>> | undefined;

  for (const order of orders) {
    if (!ctx.canSend()) {
      ctx.count('left for next run');
      continue;
    }
    const method = paymentMethodFromNotes(order.notes);
    const typedByStaff = order.events.some((e) => e.summary.startsWith(`Order ${order.reference} created`) && e.actorEmail);
    if ((method !== 'crypto' && method !== 'cashapp' && method !== 'bank_transfer') || typedByStaff) {
      ctx.count('skipped: not a storefront order');
      continue;
    }
    if (order.events.some((e) => e.summary === CRYPTO_DETECTED_EVENT)) {
      ctx.count('skipped: crypto payment already detected');
      continue;
    }
    if (order.events.some((e) => e.summary === UNPAID_CANCEL_EVENT)) {
      ctx.count('skipped: cancelled for time');
      continue;
    }
    if (method === 'cashapp' && order._count.paymentProofs > 0) {
      ctx.count('skipped: Cash App screenshot uploaded');
      continue;
    }
    if (method === 'crypto') {
      if (!parseCryptoNote(order.notes)) {
        ctx.count('skipped: crypto order has no payment address');
        continue;
      }
      if (legacyCryptoDueAt(order.createdAt).getTime() <= now) {
        ctx.count('skipped: crypto payment expired');
        continue;
      }
    }

    const age = now - order.createdAt.getTime();
    /* Decision B: the second ("last") reminder only after a first one was really sent. */
    const first = await prisma.emailLog.findUnique({ where: { key: `unpaid:${order.id}:1` }, select: { sentAt: true, status: true } });
    const firstSentAt = first?.status === 'SENT' && first.sentAt ? first.sentAt.getTime() : null;
    let step: 1 | 2;
    if (firstSentAt === null) {
      step = 1;
    } else if (age < SECOND_AT) {
      ctx.count('skipped: first reminder sent, second not due yet');
      continue;
    } else if (now - firstSentAt < 24 * HOUR) {
      ctx.count('skipped: first reminder less than a day ago');
      continue;
    } else {
      step = 2;
    }

    let payUrl: string | null = null;
    if (method === 'crypto') payUrl = `${SITE.url}/checkout/payment-confirmation?order=${encodeURIComponent(order.reference)}`;
    if (method === 'cashapp') {
      if (cashApp === undefined) cashApp = await cashAppDetails();
      payUrl = cashApp
        ? `${SITE.url}/checkout/payment-confirmation?order=${encodeURIComponent(order.reference)}&t=${encodeURIComponent(proofToken(order.reference))}`
        : null;
    }

    const name = (order.contact.name ?? order.shipName ?? '').trim().split(/\s+/)[0] ?? '';
    const email = unpaidReminderEmail({
      step,
      firstName: name.length > 1 && name.length < 20 && !name.includes('@') ? name : '',
      reference: order.reference,
      placedAt: order.createdAt,
      items: order.items.map((i) => ({ name: i.name, quantity: i.quantity, lineTotal: Number(i.lineTotal) })),
      subtotal: Number(order.subtotal),
      discountLabel: Number(order.discountTotal) > 0 ? discountLabel(order.discountCode) : null,
      discountTotal: Number(order.discountTotal),
      shipping: Number(order.shipping),
      total: Number(order.total),
      method,
      payUrl,
      cashApp: method === 'cashapp' ? cashApp ?? null : null,
    });

    if (!ctx.dryRun) {
      /* Read the order again: a payment, a cancellation or a screenshot may have landed while this
         run was working through the list. */
      const still = await prisma.order.findFirst({
        where: { id: order.id, status: 'NEW', paymentProofs: { none: {} } },
        select: { events: { where: { summary: { in: [CRYPTO_DETECTED_EVENT, UNPAID_CANCEL_EVENT] } }, select: { id: true } } },
      });
      if (!still || still.events.length > 0) {
        ctx.count('skipped: paid or changed during the run');
        continue;
      }
    }

    const outcome = await ctx.send({
      key: `unpaid:${order.id}:${step}`,
      job: 'unpaid-orders',
      kind: 'TRANSACTIONAL',
      to: order.contact.email,
      subject: email.subject,
      html: email.html,
      contactId: order.contactId,
      orderId: order.id,
    });
    if (outcome.status === 'sent') {
      ctx.count(`reminder ${step} sent`);
      await prisma.orderEvent
        .create({ data: { orderId: order.id, summary: `Payment reminder ${step} emailed.`, detail: `To ${order.contact.email}.` } })
        .catch(() => {});
    } else if (outcome.status === 'dry-run') {
      ctx.count(`would send reminder ${step}`);
    }
  }
}
