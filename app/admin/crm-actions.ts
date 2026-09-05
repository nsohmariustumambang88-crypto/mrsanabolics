'use server';

import { revalidatePath } from 'next/cache';
import type { ContactStage, EnquiryStatus, Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { recordActivity } from '@/lib/crm/contacts';
import { looksLikeEmail, normaliseEmail } from '@/lib/marketing/consent';

/*
  CRM mutations.

  Like app/admin/actions.ts, every action calls requireAdmin() first: a server action is a
  public HTTP endpoint with a generated URL, so being unreachable from the UI is not access
  control and middleware does not cover it.

  What is absent matters as much as what is here. There is no action that creates a contact, and
  none that grants marketing consent — the schema keeps those apart (lib/crm/contacts.ts) and an
  admin-typed consent row has nobody's agreement behind it. Contacts arrive because a person did
  something; staff classify them afterwards.
*/

export type ActionResult = { ok: true } | { ok: false; error: string };

function fail(error: string): ActionResult {
  return { ok: false, error };
}

async function admin(): Promise<{ email: string } | null> {
  try {
    const session = await requireAdmin();
    return { email: session.email };
  } catch {
    return null;
  }
}

function refreshContact(contactId: string) {
  revalidatePath('/admin/contacts');
  revalidatePath(`/admin/contacts/${contactId}`);
}

const STAGE_LABEL: Record<ContactStage, string> = {
  LEAD: 'Lead',
  ENGAGED: 'Engaged',
  QUALIFIED: 'Qualified',
  DORMANT: 'Dormant',
};

const STATUS_LABEL: Record<EnquiryStatus, string> = {
  NEW: 'New',
  OPEN: 'Open',
  ANSWERED: 'Answered',
  CLOSED: 'Closed',
};

export async function setContactStage(
  contactId: string,
  stage: ContactStage
): Promise<ActionResult> {
  const who = await admin();
  if (!who) return fail('Your session has expired. Sign in again.');

  if (!STAGE_LABEL[stage]) return fail('Unknown stage.');

  const current = await prisma.contact.findUnique({
    where: { id: contactId },
    select: { stage: true },
  });
  if (!current) return fail('That contact no longer exists.');
  if (current.stage === stage) return { ok: true };

  await prisma.contact.update({ where: { id: contactId }, data: { stage } });

  await recordActivity(prisma, {
    contactId,
    type: 'STAGE_CHANGED',
    summary: `Stage moved from ${STAGE_LABEL[current.stage]} to ${STAGE_LABEL[stage]}.`,
    actorEmail: who.email,
  });

  refreshContact(contactId);
  return { ok: true };
}

export async function updateContactDetails(
  contactId: string,
  form: FormData
): Promise<ActionResult> {
  const who = await admin();
  if (!who) return fail('Your session has expired. Sign in again.');

  const text = (key: string) => {
    const raw = form.get(key);
    if (typeof raw !== 'string') return null;
    const trimmed = raw.trim();
    return trimmed.length ? trimmed : null;
  };

  const name = text('name');
  const phone = text('phone');

  /*
    The email address is not editable here on purpose. It is the identity of the row, the join
    to the consent record, and the thing an unsubscribe was issued against — retyping it would
    silently detach a person from their own opt-out.
  */
  await prisma.contact.update({
    where: { id: contactId },
    data: { name, phone },
  });

  await recordActivity(prisma, {
    contactId,
    type: 'DETAILS_UPDATED',
    summary: 'Contact details edited.',
    detail: `Name: ${name ?? '—'} · Phone: ${phone ?? '—'}`,
    actorEmail: who.email,
  });

  refreshContact(contactId);
  return { ok: true };
}

export async function setContactTags(
  contactId: string,
  rawTags: string[]
): Promise<ActionResult> {
  const who = await admin();
  if (!who) return fail('Your session has expired. Sign in again.');

  /* Normalise so "VIP", "vip" and " vip " are one segment rather than three. */
  const tags = Array.from(
    new Set(
      rawTags
        .map((t) => t.trim().toLowerCase())
        .filter((t) => t.length > 0 && t.length <= 32)
    )
  ).sort();

  if (tags.length > 25) return fail('That is more tags than a segment can usefully mean.');

  const current = await prisma.contact.findUnique({
    where: { id: contactId },
    select: { tags: true },
  });
  if (!current) return fail('That contact no longer exists.');

  const before = [...current.tags].sort();
  if (before.join('|') === tags.join('|')) return { ok: true };

  await prisma.contact.update({ where: { id: contactId }, data: { tags } });

  const added = tags.filter((t) => !before.includes(t));
  const removed = before.filter((t) => !tags.includes(t));

  await recordActivity(prisma, {
    contactId,
    type: 'TAGS_CHANGED',
    summary: [
      added.length ? `Tagged ${added.join(', ')}` : null,
      removed.length ? `Untagged ${removed.join(', ')}` : null,
    ]
      .filter(Boolean)
      .join(' · '),
    actorEmail: who.email,
  });

  refreshContact(contactId);
  return { ok: true };
}

export async function addContactNote(
  contactId: string,
  body: string
): Promise<ActionResult> {
  const who = await admin();
  if (!who) return fail('Your session has expired. Sign in again.');

  const text = body.trim();
  if (!text) return fail('A note needs something in it.');
  if (text.length > 5000) return fail('That note is too long.');

  /* Note and timeline entry in one nested write — atomic, and one round trip rather than three. */
  await prisma.contact.update({
    where: { id: contactId },
    data: {
      lastActivityAt: new Date(),
      notes: { create: { body: text, authorEmail: who.email } },
      activities: {
        create: {
          type: 'NOTE_ADDED',
          summary: 'Note added.',
          detail: text,
          actorEmail: who.email,
        },
      },
    },
  });

  refreshContact(contactId);
  return { ok: true };
}

export async function setEnquiryStatus(
  enquiryId: string,
  status: EnquiryStatus
): Promise<ActionResult> {
  const who = await admin();
  if (!who) return fail('Your session has expired. Sign in again.');

  if (!STATUS_LABEL[status]) return fail('Unknown status.');

  const current = await prisma.enquiry.findUnique({
    where: { id: enquiryId },
    select: { status: true, contactId: true, subject: true },
  });
  if (!current) return fail('That enquiry no longer exists.');
  if (current.status === status) return { ok: true };

  /*
    "Handled" is set once, when it first leaves the open states, and never cleared by reopening.
    It answers "how long did this person wait for an answer", which reopening does not undo.
  */
  const leavingOpen = status === 'ANSWERED' || status === 'CLOSED';

  await prisma.enquiry.update({
    where: { id: enquiryId },
    data: {
      status,
      handledAt: leavingOpen ? new Date() : undefined,
      handledBy: leavingOpen ? who.email : undefined,
    },
  });

  await recordActivity(prisma, {
    contactId: current.contactId,
    type: 'ENQUIRY_STATUS_CHANGED',
    summary: `Enquiry "${current.subject}" moved from ${STATUS_LABEL[current.status]} to ${STATUS_LABEL[status]}.`,
    actorEmail: who.email,
  });

  revalidatePath('/admin/enquiries');
  refreshContact(current.contactId);
  return { ok: true };
}

/* ------------------------------------------------------------------ creating and deleting */

export type CreateContactResult = { ok: true; id: string } | { ok: false; error: string };

/**
 * Add somebody by hand.
 *
 * This is the one place a contact appears without the person having done something, so it is
 * worth being exact about what it may and may not do.
 *
 * It records a PERSON. It does NOT record consent, and it cannot: there is no path from here to
 * the subscriber table, and `firstSource` is stamped as staff-added so the row can never later be
 * mistaken for someone who opted in. Knowing a contact is lawful — you met them, they rang you,
 * they are a supplier. Sending them marketing is not, until they ask for it themselves.
 */
export async function createContact(form: FormData): Promise<CreateContactResult> {
  const who = await admin();
  if (!who) return { ok: false, error: 'Your session has expired. Sign in again.' };

  const text = (key: string) => {
    const raw = form.get(key);
    if (typeof raw !== 'string') return null;
    const trimmed = raw.trim();
    return trimmed.length ? trimmed : null;
  };

  const rawEmail = text('email');
  if (!rawEmail) {
    return { ok: false, error: 'An email address is required — it identifies the contact.' };
  }

  const email = normaliseEmail(rawEmail);
  if (!looksLikeEmail(email)) {
    return { ok: false, error: 'That address is missing an @ or a domain.' };
  }

  const existing = await prisma.contact.findUnique({ where: { email }, select: { id: true } });
  if (existing) {
    /*
      Say so plainly. This is an authenticated staff screen, not the public form — the
      membership-oracle reasoning that keeps /api/subscribe vague does not apply here, and
      silently creating nothing would be worse than an honest refusal.
    */
    return { ok: false, error: 'A contact with that address already exists.' };
  }

  const stage = (text('stage') as ContactStage | null) ?? 'LEAD';
  if (!STAGE_LABEL[stage]) return { ok: false, error: 'Unknown stage.' };

  const tags = Array.from(
    new Set(
      (text('tags') ?? '')
        .split(',')
        .map((t) => t.trim().toLowerCase())
        .filter((t) => t.length > 0 && t.length <= 32)
    )
  ).sort();

  const note = text('note');

  const created = await prisma.contact.create({
    data: {
      email,
      name: text('name'),
      phone: text('phone'),
      stage,
      tags,
      firstSource: 'added by staff',
      activities: {
        create: {
          type: 'CONTACT_CREATED',
          summary: 'Added by hand. No marketing consent was recorded.',
          detail: note,
          actorEmail: who.email,
        },
      },
    },
    select: { id: true },
  });

  revalidatePath('/admin/contacts');
  revalidatePath('/admin');
  return { ok: true, id: created.id };
}

/*
  Deleting a contact.

  Enquiries, notes and activity go with them — the schema cascades, and a message with nobody
  attached is unanswerable anyway.

  The Subscriber row does NOT go. It is the suppression record: if someone opted out, that row is
  the only thing standing between them and being re-added by the next sign-up sweep. Deleting it
  would quietly make an opt-out reversible, which is the failure this whole area exists to prevent.

  What deletion does do is end any live consent. Removing someone from the CRM while leaving them
  on the mailing list is incoherent, and the safe direction is always fewer emails — so a
  SUBSCRIBED contact is unsubscribed as part of the delete, and the row remains as evidence.
*/
/*
  Built as data rather than executed here, so the caller can send the detach and the delete as
  one batched prisma.$transaction([...]) — a single round trip that is still all-or-nothing.

  The interactive form (async tx => …) is what this used to be, and against Neon behind PgBouncer
  it timed out at Prisma's 5s ceiling and deadlocked with concurrent writes on the same rows.
*/
async function detachSubscriberOps(contactIds: string[]) {
  const subscribers = await prisma.subscriber.findMany({
    where: { contactId: { in: contactIds } },
    select: { id: true, status: true },
  });

  const now = new Date();

  return subscribers.map((subscriber) =>
    prisma.subscriber.update({
      where: { id: subscriber.id },
      data: {
        contactId: null,
        /* Ending live consent is the safe direction; an existing opt-out is left as it stands. */
        ...(subscriber.status === 'SUBSCRIBED'
          ? { status: 'UNSUBSCRIBED' as const, unsubscribedAt: now }
          : {}),
      },
    })
  );
}

export async function deleteContact(contactId: string): Promise<ActionResult> {
  const who = await admin();
  if (!who) return fail('Your session has expired. Sign in again.');

  const contact = await prisma.contact.findUnique({
    where: { id: contactId },
    select: { id: true },
  });
  if (!contact) return fail('That contact no longer exists.');

  await prisma.$transaction([
    ...(await detachSubscriberOps([contactId])),
    prisma.contact.delete({ where: { id: contactId } }),
  ]);

  revalidatePath('/admin/contacts');
  revalidatePath('/admin/enquiries');
  revalidatePath('/admin');
  return { ok: true };
}

export type ContactBulkAction =
  | 'delete'
  | 'stage-LEAD'
  | 'stage-ENGAGED'
  | 'stage-QUALIFIED'
  | 'stage-DORMANT';

export async function bulkContactAction(
  contactIds: string[],
  action: ContactBulkAction
): Promise<ActionResult> {
  const who = await admin();
  if (!who) return fail('Your session has expired. Sign in again.');

  if (contactIds.length === 0) return fail('Select at least one contact.');
  /* A guard against a malformed client, not a policy — the UI cannot select more than it shows. */
  if (contactIds.length > 500) return fail('That is more contacts than one action should touch.');

  if (action === 'delete') {
    await prisma.$transaction([
      ...(await detachSubscriberOps(contactIds)),
      prisma.contact.deleteMany({ where: { id: { in: contactIds } } }),
    ]);

    revalidatePath('/admin/contacts');
    revalidatePath('/admin/enquiries');
    revalidatePath('/admin');
    return { ok: true };
  }

  const stage = action.slice('stage-'.length) as ContactStage;
  if (!STAGE_LABEL[stage]) return fail('Unknown bulk action.');

  /*
    Read before writing, so the timeline records the move each contact actually made and anyone
    already at the target stage is not given a "moved from X to X" line.
  */
  const current = await prisma.contact.findMany({
    where: { id: { in: contactIds } },
    select: { id: true, stage: true },
  });

  const moving = current.filter((c) => c.stage !== stage);
  if (moving.length === 0) return { ok: true };

  const now = new Date();

  await prisma.$transaction([
    prisma.contact.updateMany({
      where: { id: { in: moving.map((c) => c.id) } },
      data: { stage },
    }),
    /* One nested write per contact, all in the same batch: still atomic, still one round trip. */
    ...moving.map((c) =>
      prisma.contact.update({
        where: { id: c.id },
        data: {
          lastActivityAt: now,
          activities: {
            create: {
              type: 'STAGE_CHANGED' as const,
              summary: `Stage moved from ${STAGE_LABEL[c.stage]} to ${STAGE_LABEL[stage]}.`,
              actorEmail: who.email,
            },
          },
        },
      })
    ),
  ]);

  revalidatePath('/admin/contacts');
  revalidatePath('/admin');
  return { ok: true };
}

/*
  Deleting an enquiry removes a message somebody actually sent, so it is here for spam and
  duplicates rather than as queue hygiene — "Closed" is what finished work looks like.

  The contact stays. They still wrote to you, and their timeline keeps the line saying so.
*/
export async function deleteEnquiry(enquiryId: string): Promise<ActionResult> {
  const who = await admin();
  if (!who) return fail('Your session has expired. Sign in again.');

  const enquiry = await prisma.enquiry.findUnique({
    where: { id: enquiryId },
    select: { contactId: true },
  });
  if (!enquiry) return fail('That enquiry no longer exists.');

  await prisma.enquiry.delete({ where: { id: enquiryId } });

  revalidatePath('/admin/enquiries');
  refreshContact(enquiry.contactId);
  revalidatePath('/admin');
  return { ok: true };
}

export async function bulkDeleteEnquiries(enquiryIds: string[]): Promise<ActionResult> {
  const who = await admin();
  if (!who) return fail('Your session has expired. Sign in again.');

  if (enquiryIds.length === 0) return fail('Select at least one enquiry.');
  if (enquiryIds.length > 500) return fail('That is more enquiries than one action should touch.');

  await prisma.enquiry.deleteMany({ where: { id: { in: enquiryIds } } });

  revalidatePath('/admin/enquiries');
  revalidatePath('/admin/contacts');
  revalidatePath('/admin');
  return { ok: true };
}
