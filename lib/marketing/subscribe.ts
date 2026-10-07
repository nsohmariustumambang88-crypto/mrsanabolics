import 'server-only';

import { randomBytes } from 'node:crypto';
import { prisma } from '@/lib/prisma';
import { CONSENT, type ConsentSource, looksLikeEmail, normaliseEmail } from '@/lib/marketing/consent';
import { hashIp } from '@/lib/ip-hash';
import { attachContactForSubscriber, recordUnsubscribeActivity } from '@/lib/crm/contacts';
import { initiateWelcomeSequence } from '@/lib/email/welcome-sequence';

/*
  Writing and revoking marketing consent.

  Every path into the subscriber table goes through here, so the rules hold everywhere:

  - An address is only stored alongside the exact sentence the person agreed to, the moment,
    and the page. Consent you cannot evidence is consent you do not have.
  - Re-subscribing after an unsubscribe is an explicit act that records fresh consent. It never
    happens as a side effect of someone browsing again — the commonest way a suppression list
    quietly leaks and a domain gets blacklisted.
  - Unsubscribe is by random token, never by email address. A token derived from the address
    would let anyone unsubscribe anyone; a random one can only be known from a real email.

  There is no function here that records an address without a consent action, because the
  product does not support silent collection.
*/

export type SubscribeInput = {
  email: string;
  source: ConsentSource;
  path?: string | null;
  ip?: string | null;
  /** Basket value at the moment of capture, for abandoned-cart recovery. */
  abandonedValue?: number | null;
};

export type SubscribeResult =
  | { ok: true; created: boolean; resubscribed: boolean }
  | { ok: false; error: string };

export async function subscribe(input: SubscribeInput): Promise<SubscribeResult> {
  const email = normaliseEmail(input.email);
  if (!looksLikeEmail(email)) return { ok: false, error: 'That does not look like an email address.' };

  const consentText = CONSENT[input.source];
  if (!consentText) return { ok: false, error: 'Unknown sign-up source.' };

  const existing = await prisma.subscriber.findUnique({
    where: { email },
    select: { id: true, status: true },
  });

  const shared = {
    source: input.source,
    consentAt: new Date(),
    consentText,
    consentPath: input.path ?? null,
    ipHash: hashIp(input.ip ?? null),
    abandonedValue: input.abandonedValue ?? null,
    abandonedAt: input.abandonedValue != null ? new Date() : null,
    lastSeenAt: new Date(),
    lastSeenPath: input.path ?? null,
  };

  if (!existing) {
    const unsubscribeToken = randomBytes(24).toString('base64url');
    await prisma.subscriber.create({
      data: {
        email,
        ...shared,
        unsubscribeToken,
      },
    });

    await attachContactForSubscriber({
      email,
      source: input.source,
      consentText,
      path: input.path ?? null,
      resubscribed: false,
      logConsent: true,
    });

    /* Trigger welcome sequence for new subscribers */
    await initiateWelcomeSequence(email, unsubscribeToken).catch((error) => {
      console.error('Failed to initiate welcome sequence:', error);
    });

    return { ok: true, created: true, resubscribed: false };
  }

  const resubscribed = existing.status === 'UNSUBSCRIBED';

  await prisma.subscriber.update({
    where: { email },
    data: {
      ...shared,
      /* Coming back is an explicit act, so it clears the opt-out and records new consent. */
      status: 'SUBSCRIBED',
      unsubscribedAt: null,
      pageViews: { increment: 1 },
    },
  });

  await attachContactForSubscriber({
    email,
    source: input.source,
    consentText,
    path: input.path ?? null,
    resubscribed,
    /* Already subscribed and simply asked again: refresh the link, not the timeline. */
    logConsent: resubscribed,
  });

  return { ok: true, created: false, resubscribed };
}

/** One click from an email footer. Returns the address so the page can confirm which one went. */
export async function unsubscribeByToken(
  token: string
): Promise<{ ok: true; email: string } | { ok: false; error: string }> {
  if (!token || token.length < 16) return { ok: false, error: 'That link is not valid.' };

  const found = await prisma.subscriber.findUnique({
    where: { unsubscribeToken: token },
    select: { email: true },
  });

  if (!found) return { ok: false, error: 'That link is not valid, or it has already been used.' };

  await prisma.subscriber.update({
    where: { unsubscribeToken: token },
    data: { status: 'UNSUBSCRIBED', unsubscribedAt: new Date() },
  });


  await recordUnsubscribeActivity(found.email);

  return { ok: true, email: found.email };
}

/*
  Behavioural context, recorded only for people who have already opted in.

  This is what makes "they browsed and did not buy" actionable: the last page seen and a view
  count are enough to segment a promotion. It deliberately cannot create a row — an address
  that is not already a subscriber is not tracked at all.
*/
export async function touchSubscriber(email: string, path: string): Promise<void> {
  const normalised = normaliseEmail(email);
  await prisma.subscriber
    .updateMany({
      where: { email: normalised, status: 'SUBSCRIBED' },
      data: { lastSeenAt: new Date(), lastSeenPath: path, pageViews: { increment: 1 } },
    })
    .catch(() => {
      /* Analytics must never break a page render. */
    });
}
