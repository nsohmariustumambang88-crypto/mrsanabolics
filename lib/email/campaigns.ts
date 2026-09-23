import 'server-only';

import { prisma } from '@/lib/prisma';
import { sendNewsletterCampaign } from './resend';

/**
 * Send a newsletter campaign to all subscribers
 */
export async function sendCampaign(
  campaignId: string,
  subject: string,
  message: string
): Promise<{ ok: true; sent: number } | { ok: false; error: string }> {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: { status: true },
  });

  if (!campaign) {
    return { ok: false, error: 'Campaign not found' };
  }

  if (campaign.status === 'SENT') {
    return { ok: false, error: 'This campaign has already been sent' };
  }

  /* Fetch all subscribed recipients */
  const subscribers = await prisma.subscriber.findMany({
    where: { status: 'SUBSCRIBED' },
    select: { email: true, unsubscribeToken: true },
  });

  if (subscribers.length === 0) {
    return { ok: false, error: 'No subscribers to send to' };
  }

  try {
    /* Send to all subscribers */
    await sendNewsletterCampaign(
      subscribers.map((s) => s.email),
      subject,
      message,
      subscribers[0].unsubscribeToken // Use first subscriber's token as template
    );

    /* Mark campaign as sent */
    await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        status: 'SENT',
        sentAt: new Date(),
        recipientCount: subscribers.length,
      },
    });

    return { ok: true, sent: subscribers.length };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Failed to send campaign' };
  }
}
