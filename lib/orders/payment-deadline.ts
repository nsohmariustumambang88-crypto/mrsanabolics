/*
  How long a storefront order waits for its money, and how that deadline is recorded.

  A plain module (no server-only): the countdown on the payment pages and the checkout that
  records the deadline use the same constants.

  **60 minutes, every method, and it is a request, not a deadline** (the owner's decision,
  19 November 2026, after a day of 90 and then 30 minutes with automatic cancellation). The
  customer presses "Proceed to payment" and the payment page counts down an hour to tell them to
  be quick. Nothing happens at zero: the order is not cancelled and the payment details stay on
  the page. So the clock is worded as a request ("Please pay within", then "Please complete your
  payment now") and never claims a consequence that will not follow.

  A crypto payment really does expire, 7 days after it is created, at NOWPayments; the webhook
  cancels the order then. A Cash App order is never cancelled automatically.

  The deadline is written as an order event when the order is placed (`PAYMENT_DEADLINE_EVENT_PREFIX`,
  ISO date in `detail`), because Order has no payment columns. Orders from before 18 November 2026
  have no such event and are never cancelled automatically; an old crypto order's page still
  counts down to NOWPayments' own 7-day expiry.
*/

export const PAYMENT_WINDOW_MINUTES = 60;

const MINUTE = 60_000;
const DAY = 86_400_000;
/** NOWPayments expires a payment nobody paid 7 days after creating it. Old orders only. */
const NOWPAYMENTS_EXPIRY_DAYS = 7;

/** Order events. Matched exactly by the expiry sweep and the webhook; do not reword them. */
export const PAYMENT_DEADLINE_EVENT_PREFIX = 'Payment due by ';
/** Written only while orders were cancelled for time (19 November 2026); still read, for those. */
export const UNPAID_CANCEL_EVENT = 'Cancelled automatically: not paid within 30 minutes.';
export const CRYPTO_DETECTED_EVENT = 'Crypto payment detected by NOWPayments; waiting for it to complete.';

/** The deadline for an order placed now; null for a method with no deadline (bank transfer). */
export function paymentDeadlineFor(method: string, placedAt: Date): Date | null {
  if (method === 'crypto' || method === 'cashapp') {
    return new Date(placedAt.getTime() + PAYMENT_WINDOW_MINUTES * MINUTE);
  }
  return null;
}

/** An old crypto order (no deadline event): NOWPayments' own expiry. */
export function legacyCryptoDueAt(orderCreatedAt: Date): Date {
  return new Date(orderCreatedAt.getTime() + NOWPAYMENTS_EXPIRY_DAYS * DAY);
}

/** The order event's summary, readable on the admin order screen. Always UTC there. */
export function deadlineEventSummary(dueAt: Date): string {
  const when = new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  }).format(dueAt);
  return `${PAYMENT_DEADLINE_EVENT_PREFIX}${when} UTC.`;
}

/** The deadline recorded on an order, from its events. */
export function deadlineFromEvents(
  events: Array<{ summary: string; detail: string | null }>
): Date | null {
  const event = events.find((e) => e.summary.startsWith(PAYMENT_DEADLINE_EVENT_PREFIX));
  if (!event?.detail) return null;
  const at = new Date(event.detail);
  return Number.isNaN(at.getTime()) ? null : at;
}
