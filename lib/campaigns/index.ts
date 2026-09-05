import 'server-only';

import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getSettings } from '@/lib/settings';

/*
  Campaign audiences, and the checks that stand between a draft and a send.

  THIS BUILD SENDS NO EMAIL. Nothing in this file delivers anything, and nothing in the admin
  built on it pretends to. What it does is answer the two questions a person needs answered
  before they go and send from a real platform: who would this go to, and is it lawful to send.

  ONE RULE GOVERNS THE WHOLE FILE. Only SUBSCRIBED rows are ever reachable from here. That is
  not enforced by remembering to add `status: 'SUBSCRIBED'` at each call site — someone will
  forget, and the cost of forgetting is mailing people who explicitly opted out, which is the
  one mistake that burns the sending domain and is also the one the law is least forgiving
  about. So the condition is welded into `segmentWhere` below, every query goes through it, and
  a segment's own clause NARROWS that set. It cannot widen it: an `AND` has no way to.
*/

export type SegmentKey = 'subscribed' | 'abandoned' | 'recent';

export type Segment = {
  key: SegmentKey;
  label: string;
  description: string;
  /**
   * The narrowing clause for this segment, ANDed with the consent condition by `segmentWhere`.
   *
   * A function rather than a literal because `recent` is relative to now — a value computed at
   * module load would freeze the window at whenever the server process started, and on a
   * long-lived process that quietly stops meaning "the last 30 days" within a day.
   *
   * Never put a `status` clause in here. It would be ANDed, so it could only narrow further,
   * but it would also read as though this were the place status is decided. It is not.
   */
  where: () => Prisma.SubscriberWhereInput;
};

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

export const SEGMENTS: Segment[] = [
  {
    key: 'subscribed',
    label: 'Everyone subscribed',
    description: 'Every address with live marketing consent, whatever it came from.',
    where: () => ({}),
  },
  {
    key: 'abandoned',
    label: 'Left a basket',
    description:
      'Subscribed people who reached checkout and left without ordering. The basket value is on the subscriber row, so a recovery message can name it.',
    where: () => ({ abandonedValue: { not: null } }),
  },
  {
    key: 'recent',
    label: 'Subscribed in the last 30 days',
    description:
      'Consent given within the last 30 days. The warmest part of the list, and the part least likely to mark a first message as spam.',
    where: () => ({ consentAt: { gte: daysAgo(30) } }),
  },
];

const BY_KEY = new Map(SEGMENTS.map((s) => [s.key, s]));

export function isSegmentKey(value: string): value is SegmentKey {
  return BY_KEY.has(value as SegmentKey);
}

/**
 * The segment for a stored key.
 *
 * Falls back to `subscribed` rather than throwing: a campaign row whose segment string no
 * longer matches a declared segment must still open on screen, and the fallback is the widest
 * *consented* set, never a wider one.
 */
export function getSegment(key: string): Segment {
  return BY_KEY.get(key as SegmentKey) ?? SEGMENTS[0];
}

/**
 * The only place a subscriber query is built in this module.
 *
 * `status: 'SUBSCRIBED'` lives here and nowhere else, so an unsubscribed address is unreachable
 * by construction rather than by everyone remembering a filter.
 */
function segmentWhere(segment: Segment): Prisma.SubscriberWhereInput {
  return { AND: [{ status: 'SUBSCRIBED' }, segment.where()] };
}

function resolve(segment: Segment | SegmentKey | string): Segment {
  return typeof segment === 'string' ? getSegment(segment) : segment;
}

/** How many consented people this segment currently covers. */
export function countSegment(segment: Segment | SegmentKey | string): Promise<number> {
  return prisma.subscriber.count({ where: segmentWhere(resolve(segment)) });
}

/** Every segment's current size, keyed by segment key. One query per segment, run together. */
export async function countAllSegments(): Promise<Record<SegmentKey, number>> {
  const counts = await Promise.all(SEGMENTS.map((s) => countSegment(s)));
  const out = {} as Record<SegmentKey, number>;
  SEGMENTS.forEach((s, i) => {
    out[s.key] = counts[i];
  });
  return out;
}

export type Recipient = {
  email: string;
  /** The address's own opt-out token. Any real send has to build its unsubscribe link from it. */
  unsubscribeToken: string;
  consentAt: Date;
  contactId: string | null;
};

/**
 * The actual people in a segment.
 *
 * Returns the unsubscribe token alongside the address on purpose: a list exported without one
 * is a list that cannot carry a working opt-out, and a marketing email without a working
 * opt-out is unlawful under both PECR and CAN-SPAM. Handing over the addresses on their own
 * would be handing over the half that gets somebody fined.
 */
export function resolveSegment(
  segment: Segment | SegmentKey | string,
  take = 5000
): Promise<Recipient[]> {
  return prisma.subscriber.findMany({
    where: segmentWhere(resolve(segment)),
    orderBy: { consentAt: 'desc' },
    take,
    select: { email: true, unsubscribeToken: true, consentAt: true, contactId: true },
  });
}

/* ------------------------------------------------------------------------ readiness */

export type ReadinessProblem = {
  key: string;
  /** One line, written for a person, saying what is missing and why it blocks. */
  label: string;
  /** Where to go and fix it, when there is one place. */
  href?: string;
  hrefLabel?: string;
};

export type CampaignLike = {
  subject: string;
  body: string;
  segment: string;
};

/**
 * Everything standing between this campaign and being marked ready.
 *
 * The last two are law, not preference. CAN-SPAM requires a physical postal address in every
 * commercial message, and PECR/GDPR expect an identifiable sender — so a campaign with no
 * postal address and no from address is one that cannot lawfully be sent, whoever sends it and
 * from whatever platform. Blocking here is cheaper than finding out afterwards.
 *
 * Settings are read through `getSettings` so the memo is shared with the rest of the app; a
 * caller that already has them can pass them in rather than paying for a second read.
 */
export async function readinessProblems(
  campaign: CampaignLike,
  settings?: Record<string, string>
): Promise<ReadinessProblem[]> {
  const [config, audience] = await Promise.all([
    settings ? Promise.resolve(settings) : getSettings(),
    countSegment(campaign.segment),
  ]);

  const problems: ReadinessProblem[] = [];

  if (!campaign.subject.trim()) {
    problems.push({
      key: 'subject',
      label: 'No subject line. It is the only part of the message most people will read.',
    });
  }

  if (!campaign.body.trim()) {
    problems.push({ key: 'body', label: 'Nothing written in the body yet.' });
  }

  if (audience === 0) {
    problems.push({
      key: 'audience',
      label: `Nobody is in "${getSegment(campaign.segment).label}" — there is no one to send this to.`,
      href: '/admin/subscribers',
      hrefLabel: 'Subscribers',
    });
  }

  if (!(config.postal_address ?? '').trim()) {
    problems.push({
      key: 'postal_address',
      label:
        'No postal address on file. CAN-SPAM requires a physical address in the footer of every marketing email.',
      href: '/admin/settings',
      hrefLabel: 'Settings',
    });
  }

  if (!(config.email_from_address ?? '').trim()) {
    problems.push({
      key: 'email_from_address',
      label:
        'No from address on file. Every message needs an identifiable sender on a domain you control.',
      href: '/admin/settings',
      hrefLabel: 'Settings',
    });
  }

  return problems;
}
