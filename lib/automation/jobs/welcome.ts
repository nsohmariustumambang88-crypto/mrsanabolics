import 'server-only';

import { prisma } from '@/lib/prisma';
import { advertisedDiscount } from '@/lib/discounts';
import { welcomeEmail2, welcomeEmail3 } from '@/lib/automation/templates';
import { markSkipped } from '@/lib/automation/sender';
import type { JobContext } from '@/lib/automation/run';

/*
  Welcome emails 2 and 3. Email 1 goes at sign-up (lib/marketing/subscribe.ts → welcome-sequence),
  which sets `welcomeEmail2At` (3 days on) and `welcomeEmail3At` (7 days on).

  The owner's rules (20 November 2026), for the email due and the rest of the sequence:
  - the backlog is skipped: an email that fell due before this job existed (BACKLOG_BEFORE) is
    never sent. That was 18 people when he decided and 21 by 21 November;
  - after that, anyone more than 7 days past the date an email was due is skipped.
  A skipped email is written to the email log as SKIPPED, so no later run sends it, and
  `welcomeStep` is moved to 3 (sequence finished).

  Marketing: the sender re-checks consent, adds the unsubscribe link and the postal address, and
  allows one marketing email a day per person. `welcomeStep` moves on only after Resend accepted
  the email; a refusal leaves it where it was, to be tried again (the old sender moved it on even
  when Resend refused).
*/

const DAY = 86_400_000;
const OVERDUE_LIMIT = 7 * DAY;
const OFFER_CODE = 'WELCOME15';
/** Emails that fell due before the job was built are the overdue backlog the owner chose to skip. */
const BACKLOG_BEFORE = Date.parse('2026-11-21T00:00:00Z');

export async function welcomeJob(ctx: JobContext): Promise<void> {
  const now = ctx.now.getTime();
  const due = await prisma.subscriber.findMany({
    where: {
      status: 'SUBSCRIBED',
      OR: [
        { welcomeStep: 1, welcomeEmail2At: { lte: ctx.now } },
        { welcomeStep: 2, welcomeEmail3At: { lte: ctx.now } },
      ],
    },
    orderBy: { createdAt: 'asc' },
    select: { id: true, email: true, welcomeStep: true, welcomeEmail2At: true, welcomeEmail3At: true, contactId: true },
  });

  const live = await advertisedDiscount(OFFER_CODE).catch(() => null);

  for (const sub of due) {
    if (!ctx.canSend()) {
      ctx.count('left for next run');
      continue;
    }
    const step: 2 | 3 = sub.welcomeStep === 1 ? 2 : 3;
    const dueAt = (step === 2 ? sub.welcomeEmail2At : sub.welcomeEmail3At)?.getTime() ?? now;

    const backlog = dueAt < BACKLOG_BEFORE;
    if (backlog || now - dueAt > OVERDUE_LIMIT) {
      ctx.count(backlog ? `skipped: email ${step} overdue before launch` : `skipped: email ${step} more than 7 days overdue`);
      if (!ctx.dryRun) {
        for (const s of step === 2 ? [2, 3] : [3]) {
          await markSkipped({
            key: `welcome:${sub.id}:${s}`,
            job: 'welcome',
            kind: 'MARKETING',
            to: sub.email,
            subject: `Welcome email ${s}`,
            reason: backlog
              ? 'Overdue before the job existed (the backlog); skipped by the owner’s rule.'
              : 'More than 7 days overdue when the job ran; skipped by the owner’s rule.',
            subscriberId: sub.id,
            runId: ctx.runId,
          });
        }
        await prisma.subscriber.updateMany({ where: { id: sub.id, welcomeStep: sub.welcomeStep }, data: { welcomeStep: 3 } });
      }
      continue;
    }

    let offer: { code: string; headline: string; condition: string } | null = null;
    if (step === 3 && live) {
      const used = sub.contactId
        ? await prisma.discountRedemption.count({ where: { contactId: sub.contactId, discount: { code: OFFER_CODE } } })
        : 0;
      if (used === 0) offer = { code: live.code, headline: live.headline, condition: live.condition };
    }
    const email = step === 2 ? welcomeEmail2() : welcomeEmail3(offer);

    const outcome = await ctx.send({
      key: `welcome:${sub.id}:${step}`,
      job: 'welcome',
      kind: 'MARKETING',
      to: sub.email,
      subject: email.subject,
      html: email.html,
      subscriberId: sub.id,
      contactId: sub.contactId,
    });
    if (outcome.status === 'sent') {
      await prisma.subscriber.updateMany({ where: { id: sub.id, welcomeStep: sub.welcomeStep }, data: { welcomeStep: step } });
      ctx.count(`welcome ${step} sent`);
    } else if (outcome.status === 'dry-run') {
      ctx.count(`would send welcome ${step}`);
    } else if (outcome.status === 'skipped' && outcome.reason === 'already sent') {
      /* Sent by an earlier run whose step update did not land: catch the step up. */
      await prisma.subscriber.updateMany({ where: { id: sub.id, welcomeStep: sub.welcomeStep }, data: { welcomeStep: step } });
    }
  }
}
