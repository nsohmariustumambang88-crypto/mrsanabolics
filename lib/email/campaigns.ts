import 'server-only';

import { prisma } from '@/lib/prisma';
import { getSettings } from '@/lib/settings';
import { renderNewsletterHTML } from './templates';
import { UNSUBSCRIBE_PLACEHOLDER } from '@/lib/automation/templates';
import { sendAutomatedEmail } from '@/lib/automation/sender';

/*
  Send a newsletter campaign to every subscriber.

  Fixed on 21 November 2026. It used to give every recipient the FIRST subscriber's unsubscribe
  token, send them all at once with no pacing, and mark the campaign SENT whatever Resend said.
  Now each email goes through the automation's sender (lib/automation/sender.ts): the
  subscriber's own token, one-click List-Unsubscribe, consent re-checked at send time, the postal
  address (refused without one), one email log row per subscriber per campaign so a second
  attempt sends only to whoever did not get it, and about two emails a second.

  The campaign is marked SENT only when every subscriber got it (or can never get it: unsubscribed
  since, no valid address, refused three times). Anyone refused by Resend or skipped because they
  already had a marketing email that day is "left"; the campaign stays unsent, and running it again
  (the next day) reaches only them. Nothing in the admin calls this today (campaigns are written
  here and sent by script, test first, on the owner's word); a long list would also outlast one
  serverless call, so a real send belongs in a script.
*/
export async function sendCampaign(
  campaignId: string,
  subject: string,
  message: string
): Promise<{ ok: true; sent: number } | { ok: false; error: string; sent: number; failed: number; left: number }> {
  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId }, select: { status: true } });
  if (!campaign) return { ok: false, error: 'Campaign not found', sent: 0, failed: 0, left: 0 };
  if (campaign.status === 'SENT') return { ok: false, error: 'This campaign has already been sent', sent: 0, failed: 0, left: 0 };

  const settings = await getSettings();
  const postalAddress = settings.postal_address ?? '';
  if (!postalAddress.trim()) {
    return { ok: false, error: 'Add the postal address on the Email screen first: marketing email may not go out without one.', sent: 0, failed: 0, left: 0 };
  }

  const subscribers = await prisma.subscriber.findMany({
    where: { status: 'SUBSCRIBED' },
    select: { id: true, email: true, contactId: true },
  });
  if (subscribers.length === 0) return { ok: false, error: 'No subscribers to send to', sent: 0, failed: 0, left: 0 };

  const html = renderNewsletterHTML(message, UNSUBSCRIBE_PLACEHOLDER);
  let sent = 0;
  let failed = 0;
  let deferred = 0;
  for (const [i, s] of subscribers.entries()) {
    if (i > 0) await new Promise((r) => setTimeout(r, 550));
    const outcome = await sendAutomatedEmail({
      key: `campaign:${campaignId}:${s.id}`,
      job: 'campaign',
      kind: 'MARKETING',
      to: s.email,
      subject,
      html,
      subscriberId: s.id,
      contactId: s.contactId,
      postalAddress,
    });
    if (outcome.status === 'sent') sent += 1;
    else if (outcome.status === 'failed') failed += 1;
    else if (outcome.status === 'skipped' && outcome.reason === 'already sent') sent += 1;
    else if (outcome.status === 'skipped' && outcome.reason === 'already had a marketing email today') deferred += 1;
  }

  const left = failed + deferred;
  if (left > 0) {
    return {
      ok: false,
      error: `${left} subscriber${left === 1 ? ' has' : 's have'} not had it yet (${failed} refused by Resend, ${deferred} already emailed today). The campaign is not marked sent; sending it again tomorrow reaches only them.`,
      sent,
      failed,
      left,
    };
  }

  await prisma.campaign.update({
    where: { id: campaignId },
    data: { status: 'SENT', sentAt: new Date(), recipientCount: sent },
  });
  return { ok: true, sent };
}
