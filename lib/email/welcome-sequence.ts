import 'server-only';

import { prisma } from '@/lib/prisma';
import { sendWelcomeEmail1 } from './resend';

/*
  The welcome sequence's first step: email 1 at sign-up, and the dates emails 2 and 3 fall due.

  Emails 2 and 3 are sent by the automation's daily job (lib/automation/jobs/welcome.ts), which
  replaced `sendScheduledWelcomeEmail2/3` here on 21 November 2026. Those moved a subscriber's
  `welcomeStep` on without looking at Resend's answer, so a refused email counted as sent.
*/

const DAY = 24 * 60 * 60 * 1000;
const EMAIL_2_AFTER = 3 * DAY;
const EMAIL_3_AFTER = 7 * DAY;

/**
 * Send welcome email 1 immediately when a subscriber signs up, and set the dates emails 2 and 3
 * fall due. Nothing is recorded as sent when Resend refuses.
 */
export async function initiateWelcomeSequence(email: string, unsubscribeToken: string) {
  try {
    const emailResult = await sendWelcomeEmail1(email, unsubscribeToken);

    if (emailResult.error) {
      console.error(`Welcome email 1 failed for ${email}:`, emailResult.error);
      return { ok: false, error: `Email send failed: ${emailResult.error.message}` };
    }

    const subscriber = await prisma.subscriber.findUnique({
      where: { email },
      select: { id: true },
    });
    if (!subscriber) {
      return { ok: false, error: 'Subscriber not found after creation' };
    }

    const now = Date.now();
    await prisma.subscriber.update({
      where: { id: subscriber.id },
      data: {
        welcomeStep: 1,
        welcomeEmail2At: new Date(now + EMAIL_2_AFTER),
        welcomeEmail3At: new Date(now + EMAIL_3_AFTER),
      },
    });

    return { ok: true };
  } catch (error) {
    console.error('Welcome sequence error:', error);
    return { ok: false, error: error instanceof Error ? error.message : 'Failed to start welcome sequence' };
  }
}
