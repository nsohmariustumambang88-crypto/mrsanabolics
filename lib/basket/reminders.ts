import 'server-only';

import { prisma } from '@/lib/prisma';
import { SITE } from '@/lib/site';
import { advertisedDiscount } from '@/lib/discounts';
import { getSetting, asBoolean } from '@/lib/settings';
import { recordActivity } from '@/lib/crm/contacts';
import { sendBasketReminderEmail } from '@/lib/email/resend';
import { basketReminderSubject, renderBasketReminderHTML } from '@/lib/email/basket-reminder';
import { hashRestoreToken, newRestoreToken, priceLines, type BasketLine } from '@/lib/basket';

/*
  The basket reminder: one email to a subscriber who left items in their basket.

  Who gets one — every condition, checked here, not in a query someone might loosen:
  - the basket was last touched more than WAIT_HOURS ago and less than MAX_AGE_DAYS ago;
  - no order came from it (Basket.orderedAt), and the person has not ordered since it was made,
    from any device;
  - the browser is linked to a Contact whose Subscriber is SUBSCRIBED. Holding a basket is not
    consent; subscribing is. An unsubscribed address is never mailed;
  - it has not been reminded before, and the same person was not reminded about another basket
    in the last PER_PERSON_DAYS;
  - at least one line is still in stock (out-of-stock lines are left out of the email).

  The WELCOME15 block appears only for someone with no paid order who has not redeemed it, and
  only while the code is live — the checkout would refuse it otherwise.

  Sending is switched by the `basket_reminders_enabled` setting (off by default); the daily cron
  (/api/cron/basket-reminders) calls this. `onlyEmail` limits a run to one address, which is how
  the owner previews it on his own basket.
*/

const WAIT_HOURS = 24;
const MAX_AGE_DAYS = 14;
const PER_PERSON_DAYS = 7;
const OFFER_CODE = 'WELCOME15';

export type ReminderRun = {
  enabled: boolean;
  considered: number;
  sent: { email: string; items: number; subtotal: number; offer: boolean }[];
  skipped: Record<string, number>;
};

export async function sendDueBasketReminders(opts: { onlyEmail?: string; ignoreSetting?: boolean } = {}): Promise<ReminderRun> {
  const enabled = asBoolean(await getSetting('basket_reminders_enabled'));
  const run: ReminderRun = { enabled, considered: 0, sent: [], skipped: {} };
  if (!enabled && !opts.ignoreSetting) return run;
  const skip = (reason: string) => (run.skipped[reason] = (run.skipped[reason] ?? 0) + 1);

  const now = Date.now();
  const baskets = await prisma.basket.findMany({
    where: {
      itemCount: { gt: 0 },
      orderedAt: null,
      remindedAt: null,
      updatedAt: { lte: new Date(now - WAIT_HOURS * 3600e3), gte: new Date(now - MAX_AGE_DAYS * 86400e3) },
      visitor: { contactId: { not: null } },
    },
    select: {
      id: true,
      items: true,
      createdAt: true,
      checkoutAt: true,
      visitor: { select: { contact: { select: { id: true, name: true, email: true, subscriber: { select: { status: true, unsubscribeToken: true } } } } } },
    },
    orderBy: { updatedAt: 'asc' },
  });

  const offerLive = Boolean(await advertisedDiscount(OFFER_CODE).catch(() => null));
  const postalAddress = await getSetting('postal_address');

  for (const basket of baskets) {
    run.considered += 1;
    const contact = basket.visitor.contact;
    if (!contact) {
      skip('no contact');
      continue;
    }
    if (opts.onlyEmail && contact.email.toLowerCase() !== opts.onlyEmail.toLowerCase()) {
      skip('not the requested address');
      continue;
    }
    const sub = contact.subscriber;
    if (!sub || sub.status !== 'SUBSCRIBED' || !sub.unsubscribeToken) {
      skip('not subscribed');
      continue;
    }

    const orderedSince = await prisma.order.count({ where: { contactId: contact.id, createdAt: { gte: basket.createdAt } } });
    if (orderedSince > 0) {
      skip('ordered since');
      continue;
    }
    const recentlyReminded = await prisma.basket.count({
      where: { visitor: { contactId: contact.id }, remindedAt: { gte: new Date(now - PER_PERSON_DAYS * 86400e3) } },
    });
    if (recentlyReminded > 0) {
      skip('reminded this week');
      continue;
    }

    const saved = (basket.items as unknown as BasketLine[]) ?? [];
    const priced = await priceLines(saved.map((l) => ({ productId: l.productId, quantity: l.quantity })));
    const inStock = new Set(
      (await prisma.product.findMany({ where: { id: { in: priced.map((l) => l.productId) }, inStock: true }, select: { id: true } })).map((p) => p.id)
    );
    const lines = priced.filter((l) => inStock.has(l.productId));
    if (lines.length === 0) {
      skip('nothing in stock');
      continue;
    }

    const paid = await prisma.order.count({ where: { contactId: contact.id, status: { notIn: ['NEW', 'CANCELLED'] } } });
    const usedOffer = await prisma.discountRedemption.count({ where: { contactId: contact.id, discount: { code: OFFER_CODE } } });
    const offer = offerLive && paid === 0 && usedOffer === 0;

    const token = newRestoreToken();
    const restoreUrl = `${SITE.url}/basket/restore?token=${token}`;
    const unsubscribeUrl = `${SITE.url}/unsubscribe?token=${encodeURIComponent(sub.unsubscribeToken)}`;
    const firstName = (contact.name ?? '').trim().split(/\s+/)[0] ?? '';
    const html = renderBasketReminderHTML({
      firstName: firstName.length > 1 && firstName.length < 20 && !firstName.includes('@') ? firstName : '',
      lines,
      restoreUrl,
      unsubscribeUrl,
      offer,
      reachedCheckout: Boolean(basket.checkoutAt),
      postalAddress,
    });

    /* Claim the basket before sending, so two overlapping runs cannot both mail it. */
    const claimed = await prisma.basket.updateMany({
      where: { id: basket.id, remindedAt: null },
      data: { remindedAt: new Date(), restoreTokenHash: hashRestoreToken(token) },
    });
    if (claimed.count === 0) {
      skip('claimed by another run');
      continue;
    }

    try {
      await sendBasketReminderEmail(contact.email, basketReminderSubject(lines, offer), html, unsubscribeUrl);
    } catch (error) {
      /* Release the claim so tomorrow's run can try again. */
      await prisma.basket.update({ where: { id: basket.id }, data: { remindedAt: null, restoreTokenHash: null } });
      console.error('[basket reminder] send failed:', error);
      skip('send failed');
      continue;
    }

    const subtotal = lines.reduce((s, l) => s + l.price * l.quantity, 0);
    run.sent.push({ email: contact.email, items: lines.length, subtotal, offer });
    await recordActivity(prisma, {
      contactId: contact.id,
      type: 'MESSAGE_RECORDED',
      summary: `Emailed a basket reminder: ${lines.length} product${lines.length === 1 ? '' : 's'}, $${subtotal.toFixed(2)}${offer ? ', with the WELCOME15 offer' : ''}.`,
      detail: lines.map((l) => `${l.quantity} × ${l.name}`).join('\n'),
    }).catch(() => {});
  }

  return run;
}
