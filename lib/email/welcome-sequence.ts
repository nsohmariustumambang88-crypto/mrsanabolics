import 'server-only';

import { prisma } from '@/lib/prisma';
import {
  sendWelcomeEmail1,
  sendWelcomeEmail2,
  sendWelcomeEmail3,
} from './resend';

export type WelcomeSequenceStep = 1 | 2 | 3;

export interface WelcomeSequenceSchedule {
  email1: 'immediate';
  email2: 'day-3';
  email3: 'day-7';
}

const WELCOME_SEQUENCE_SCHEDULE: Record<WelcomeSequenceStep, number> = {
  1: 0, // immediate
  2: 3 * 24 * 60 * 60 * 1000, // 3 days
  3: 7 * 24 * 60 * 60 * 1000, // 7 days
};

/**
 * Send welcome email 1 immediately when subscriber signs up.
 * Schedule emails 2 and 3 for later delivery.
 */
export async function initiateWelcomeSequence(email: string, unsubscribeToken: string) {
  try {
    // Send email 1 immediately
    await sendWelcomeEmail1(email, unsubscribeToken);

    // Get the subscriber to update tracking
    const subscriber = await prisma.subscriber.findUnique({
      where: { email },
      select: { id: true, welcomeStep: true },
    });

    if (subscriber) {
      // Schedule emails 2 and 3
      const now = new Date();
      const email2Scheduled = new Date(now.getTime() + WELCOME_SEQUENCE_SCHEDULE[2]);
      const email3Scheduled = new Date(now.getTime() + WELCOME_SEQUENCE_SCHEDULE[3]);

      await prisma.subscriber.update({
        where: { id: subscriber.id },
        data: {
          welcomeStep: 1,
          welcomeEmail2At: email2Scheduled,
          welcomeEmail3At: email3Scheduled,
        },
      });
    }

    return { ok: true };
  } catch (error) {
    console.error('Welcome sequence error:', error);
    return { ok: false, error: error instanceof Error ? error.message : 'Failed to start welcome sequence' };
  }
}

/**
 * Process scheduled welcome emails (call this in a cron job).
 * Sends email 2 for subscribers due at this time.
 */
export async function sendScheduledWelcomeEmail2() {
  try {
    const now = new Date();
    const subscribers = await prisma.subscriber.findMany({
      where: {
        status: 'SUBSCRIBED',
        welcomeStep: 1,
        welcomeEmail2At: { lte: now },
      },
      select: { email: true, unsubscribeToken: true, id: true },
      take: 100, // Batch to avoid overload
    });

    if (subscribers.length === 0) return { ok: true, sent: 0 };

    for (const subscriber of subscribers) {
      await sendWelcomeEmail2(subscriber.email, subscriber.unsubscribeToken);
      await prisma.subscriber.update({
        where: { id: subscriber.id },
        data: { welcomeStep: 2 },
      });
    }

    return { ok: true, sent: subscribers.length };
  } catch (error) {
    console.error('Welcome email 2 error:', error);
    return { ok: false, error: error instanceof Error ? error.message : 'Failed to send welcome email 2' };
  }
}

/**
 * Process scheduled welcome emails (call this in a cron job).
 * Sends email 3 for subscribers due at this time.
 */
export async function sendScheduledWelcomeEmail3() {
  try {
    const now = new Date();
    const subscribers = await prisma.subscriber.findMany({
      where: {
        status: 'SUBSCRIBED',
        welcomeStep: 2,
        welcomeEmail3At: { lte: now },
      },
      select: { email: true, unsubscribeToken: true, id: true },
      take: 100, // Batch to avoid overload
    });

    if (subscribers.length === 0) return { ok: true, sent: 0 };

    for (const subscriber of subscribers) {
      await sendWelcomeEmail3(subscriber.email, subscriber.unsubscribeToken);
      await prisma.subscriber.update({
        where: { id: subscriber.id },
        data: { welcomeStep: 3 },
      });
    }

    return { ok: true, sent: subscribers.length };
  } catch (error) {
    console.error('Welcome email 3 error:', error);
    return { ok: false, error: error instanceof Error ? error.message : 'Failed to send welcome email 3' };
  }
}
