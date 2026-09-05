import 'server-only';

import type { ContactActivityType, ContactStage, Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { normaliseEmail } from '@/lib/marketing/consent';

/*
  The CRM's write path.

  One rule governs this whole file, and it is the reason Contact and Subscriber are separate
  tables: creating or touching a Contact NEVER creates marketing consent. A contact row means
  "we know who this is". Only a Subscriber row means "this person agreed to be emailed", and
  the only way to make one is lib/marketing/subscribe.ts, which demands consent evidence.

  Read that as a constraint on features, not just on code. There is no "add contact and
  subscribe them" helper here, because the moment one exists somebody calls it from a form
  that showed no checkbox.
*/

type Db = Prisma.TransactionClient | typeof prisma;

export type ContactUpsert = {
  email: string;
  name?: string | null;
  phone?: string | null;
  /** The surface this person came from, recorded only when the row is first created. */
  firstSource: string;
};

/**
 * Append one line to a contact's history.
 *
 * The summary is written for a human at the point it happens, because only the code doing the
 * work knows what it did. Rebuilding a sentence later from a type and a foreign key is how
 * timelines end up saying "status changed" and nothing else.
 *
 * One query, not two. The activity row and the lastActivityAt bump go together as a nested
 * write, which matters more than it looks: this database is Neon behind PgBouncer, so every
 * extra round trip is remote latency, and callers that wrapped several of these in an
 * interactive transaction blew Prisma's 5s transaction ceiling and then deadlocked against
 * each other. Nested writes are atomic on their own and need no transaction at all.
 */
export async function recordActivity(
  db: Db,
  input: {
    contactId: string;
    type: ContactActivityType;
    summary: string;
    detail?: string | null;
    actorEmail?: string | null;
  }
): Promise<void> {
  await db.contact.update({
    where: { id: input.contactId },
    data: {
      lastActivityAt: new Date(),
      activities: {
        create: {
          type: input.type,
          summary: input.summary,
          detail: input.detail ?? null,
          actorEmail: input.actorEmail ?? null,
        },
      },
    },
  });
}

/**
 * Find the person, or start knowing them.
 *
 * Details are filled in but never blanked: a later form that omits a phone number must not
 * erase the one someone gave earlier. `firstSource` is write-once for the same reason — it
 * answers "where did this relationship begin", which a second visit cannot change.
 */
export async function upsertContact(
  db: Db,
  input: ContactUpsert
): Promise<{ id: string; created: boolean }> {
  const email = normaliseEmail(input.email);

  const existing = await db.contact.findUnique({
    where: { email },
    select: { id: true, name: true, phone: true },
  });

  if (existing) {
    const patch: Prisma.ContactUpdateInput = {};
    if (!existing.name && input.name) patch.name = input.name;
    if (!existing.phone && input.phone) patch.phone = input.phone;

    if (Object.keys(patch).length) {
      await db.contact.update({ where: { id: existing.id }, data: patch });
    }

    return { id: existing.id, created: false };
  }

  /* The opening timeline entry is nested into the same insert, so a contact cannot exist
     without the line explaining where it came from. */
  const created = await db.contact.create({
    data: {
      email,
      name: input.name ?? null,
      phone: input.phone ?? null,
      firstSource: input.firstSource,
      activities: {
        create: {
          type: 'CONTACT_CREATED',
          summary: `First seen via ${input.firstSource}.`,
        },
      },
    },
    select: { id: true },
  });

  return { id: created.id, created: true };
}

/**
 * Give a marketing subscriber their CRM record and log the consent on the timeline.
 *
 * Called from subscribe() after the consent row is safely written — never before, and never
 * on its own. The activity line carries the wording agreed to, so the timeline shows what a
 * regulator would ask for without a second lookup.
 *
 * The link is refreshed on every sign-up, but the timeline entry is written only when consent
 * actually changed. Somebody re-submitting the newsletter form they already filled in has made
 * no new decision, and a timeline that logs resubmissions buries the ones that matter.
 */
export async function attachContactForSubscriber(input: {
  email: string;
  source: string;
  consentText: string;
  path?: string | null;
  resubscribed: boolean;
  /** False when this was a repeat submission by someone already subscribed. */
  logConsent: boolean;
}): Promise<void> {
  const email = normaliseEmail(input.email);

  const { id: contactId } = await upsertContact(prisma, {
    email,
    firstSource: `${input.source} sign-up`,
  });

  await prisma.subscriber.update({
    where: { email },
    data: { contactId },
  });

  if (!input.logConsent) return;

  await recordActivity(prisma, {
    contactId,
    type: 'SUBSCRIBED',
    summary: input.resubscribed
      ? `Re-subscribed to marketing email via ${input.source}.`
      : `Subscribed to marketing email via ${input.source}.`,
    detail: input.path ? `${input.consentText}\n\nAgreed on ${input.path}` : input.consentText,
  });
}

/** Log an opt-out against the person, so the timeline shows both halves of the decision. */
export async function recordUnsubscribeActivity(email: string): Promise<void> {
  const subscriber = await prisma.subscriber.findUnique({
    where: { email: normaliseEmail(email) },
    select: { contactId: true },
  });

  if (!subscriber?.contactId) return;

  await recordActivity(prisma, {
    contactId: subscriber.contactId,
    type: 'UNSUBSCRIBED',
    summary: 'Unsubscribed from marketing email.',
    detail: 'Used the unsubscribe link. Only they can opt back in.',
  });
}

/*
  Whether this person may be sent marketing email.

  Deliberately a function rather than a field on Contact. A boolean copied onto the contact row
  is a second source of truth that goes stale the moment someone unsubscribes, and the failure
  mode is mailing people who opted out — which is the one mistake that costs the sending domain.
*/
export function marketingConsent(
  subscriber: { status: 'SUBSCRIBED' | 'UNSUBSCRIBED'; consentAt: Date; consentText: string } | null
): { emailable: boolean; label: string } {
  if (!subscriber) {
    return { emailable: false, label: 'No marketing consent on file' };
  }

  return subscriber.status === 'SUBSCRIBED'
    ? { emailable: true, label: 'Consented to marketing email' }
    : { emailable: false, label: 'Unsubscribed — do not email' };
}

export const STAGES: { value: ContactStage; label: string; hint: string }[] = [
  { value: 'LEAD', label: 'Lead', hint: 'Known to us, nothing more yet.' },
  { value: 'ENGAGED', label: 'Engaged', hint: 'Has written in, or opened a conversation.' },
  { value: 'QUALIFIED', label: 'Qualified', hint: 'Worth a person spending time on.' },
  { value: 'DORMANT', label: 'Dormant', hint: 'Went quiet. Kept, not deleted.' },
];
