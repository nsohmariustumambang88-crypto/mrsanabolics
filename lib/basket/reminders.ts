import 'server-only';

import { prisma } from '@/lib/prisma';
import { SITE } from '@/lib/site';
import { advertisedDiscount } from '@/lib/discounts';
import { recordActivity } from '@/lib/crm/contacts';
import { basketReminderSubject, renderBasketReminderHTML } from '@/lib/email/basket-reminder';
import { hashRestoreToken, newRestoreToken, priceLines, type BasketLine } from '@/lib/basket';
import { excludedFromMarketing } from '@/lib/automation/jobs';
import { UNSUBSCRIBE_PLACEHOLDER } from '@/lib/automation/templates';
import type { JobContext } from '@/lib/automation/run';

/*
  The basket reminder: one email to a subscriber who left items in their basket. Marketing, so it
  goes through the automation's sender (lib/automation/sender.ts), which re-checks consent at send
  time, adds the subscriber's own unsubscribe link with one-click List-Unsubscribe, adds the
  postal address and refuses to send without one, and allows one marketing email a day per person.

  Who gets one — every condition, checked here, not in a query someone might loosen:
  - the basket was last touched more than WAIT_HOURS ago and less than MAX_AGE_DAYS ago;
  - no order came from it (Basket.orderedAt), and the person has not ordered since it was made,
    from any device;
  - the browser is linked to a Contact whose Subscriber is SUBSCRIBED. Holding a basket is not
    consent; subscribing is;
  - it has not been reminded before, and the same person was not reminded about another basket
    in the last PER_PERSON_DAYS;
  - at least one line is still in stock and allowed in marketing email (lib/automation/jobs:
    the excluded prescription medicines and the sexual-health category are left out).

  The WELCOME15 block appears only for someone with no paid order who has not redeemed it, and
  only while the code is live at 15% with no condition — the email states that figure.

  Run by /api/cron/basket-reminders through lib/automation/run.ts (switch: basket_reminders_enabled).
*/

const WAIT_HOURS = 24;
const MAX_AGE_DAYS = 14;
const PER_PERSON_DAYS = 7;
const OFFER_CODE = 'WELCOME15';

export async function basketRemindersJob(ctx: JobContext): Promise<void> {
  const now = ctx.now.getTime();
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
      visitor: {
        select: {
          contact: {
            select: { id: true, name: true, email: true, subscriber: { select: { id: true, status: true } } },
          },
        },
      },
    },
    orderBy: { updatedAt: 'asc' },
  });

  const live = await advertisedDiscount(OFFER_CODE).catch(() => null);
  const offerLive = Boolean(live && live.headline === '15% off' && !live.condition);

  for (const basket of baskets) {
    if (!ctx.canSend()) {
      ctx.count('left for next run');
      continue;
    }
    const contact = basket.visitor.contact;
    if (!contact) {
      ctx.count('skipped: no contact');
      continue;
    }
    if (contact.subscriber?.status !== 'SUBSCRIBED') {
      ctx.count('skipped: not subscribed');
      continue;
    }
    const orderedSince = await prisma.order.count({ where: { contactId: contact.id, createdAt: { gte: basket.createdAt } } });
    if (orderedSince > 0) {
      ctx.count('skipped: ordered since');
      continue;
    }
    const recentlyReminded = await prisma.basket.count({
      where: { visitor: { contactId: contact.id }, remindedAt: { gte: new Date(now - PER_PERSON_DAYS * 86400e3) } },
    });
    if (recentlyReminded > 0) {
      ctx.count('skipped: reminded this week');
      continue;
    }

    const saved = (basket.items as unknown as BasketLine[]) ?? [];
    const priced = await priceLines(saved.map((l) => ({ productId: l.productId, quantity: l.quantity })));
    const rows = await prisma.product.findMany({
      where: { id: { in: priced.map((l) => l.productId) }, inStock: true },
      select: { id: true, name: true, category: { select: { slug: true } } },
    });
    const allowed = new Set(
      rows.filter((p) => !excludedFromMarketing({ name: p.name, categorySlug: p.category?.slug })).map((p) => p.id)
    );
    const lines = priced.filter((l) => allowed.has(l.productId));
    if (lines.length === 0) {
      ctx.count('skipped: nothing in stock that may be emailed');
      continue;
    }

    const paid = await prisma.order.count({ where: { contactId: contact.id, status: { notIn: ['NEW', 'CANCELLED'] } } });
    const usedOffer = await prisma.discountRedemption.count({ where: { contactId: contact.id, discount: { code: OFFER_CODE } } });
    const offer = offerLive && paid === 0 && usedOffer === 0;

    const token = newRestoreToken();
    const firstName = (contact.name ?? '').trim().split(/\s+/)[0] ?? '';
    const html = renderBasketReminderHTML({
      firstName: firstName.length > 1 && firstName.length < 20 && !firstName.includes('@') ? firstName : '',
      lines,
      restoreUrl: `${SITE.url}/basket/restore?token=${token}`,
      unsubscribeUrl: UNSUBSCRIBE_PLACEHOLDER,
      offer,
      reachedCheckout: Boolean(basket.checkoutAt),
    });
    const message = {
      key: `basket:${basket.id}`,
      job: 'basket-reminders',
      kind: 'MARKETING' as const,
      to: contact.email,
      subject: basketReminderSubject(lines, offer),
      html,
      contactId: contact.id,
      subscriberId: contact.subscriber?.id ?? null,
    };

    if (ctx.dryRun) {
      const outcome = await ctx.send(message);
      if (outcome.status === 'dry-run') ctx.count(offer ? 'would send, with WELCOME15' : 'would send, no offer');
      continue;
    }

    /* Claim the basket before sending, so two overlapping runs cannot both mail it. */
    const claimed = await prisma.basket.updateMany({
      where: { id: basket.id, remindedAt: null },
      data: { remindedAt: new Date(), restoreTokenHash: hashRestoreToken(token) },
    });
    if (claimed.count === 0) {
      ctx.count('skipped: claimed by another run');
      continue;
    }

    const outcome = await ctx.send(message);
    if (outcome.status !== 'sent') {
      /* Not sent (refused, capped, already emailed today): release the claim for another day. */
      await prisma.basket.update({ where: { id: basket.id }, data: { remindedAt: null, restoreTokenHash: null } });
      continue;
    }

    const subtotal = lines.reduce((s, l) => s + l.price * l.quantity, 0);
    await recordActivity(prisma, {
      contactId: contact.id,
      type: 'MESSAGE_RECORDED',
      summary: `Emailed a basket reminder: ${lines.length} product${lines.length === 1 ? '' : 's'}, $${subtotal.toFixed(2)}${offer ? ', with the WELCOME15 offer' : ''}.`,
      detail: lines.map((l) => `${l.quantity} × ${l.name}`).join('\n'),
    }).catch(() => {});
  }
}
