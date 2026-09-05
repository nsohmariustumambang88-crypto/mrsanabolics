import 'server-only';

import { prisma } from '@/lib/prisma';
import { looksLikeEmail, normaliseEmail } from '@/lib/marketing/consent';
import { hashIp } from '@/lib/ip-hash';
import {
  MAX_MESSAGE_LENGTH,
  MAX_NAME_LENGTH,
  MIN_MESSAGE_LENGTH,
  isEnquirySubject,
} from '@/lib/crm/subjects';

/*
  Storing a message someone sent us.

  Note what this does NOT do: it does not create, modify or revive a Subscriber. Replying to a
  person who wrote to you is correspondence and needs no marketing consent — but it is not
  permission to send them anything else either, and quietly adding enquirers to a mailing list
  is the single commonest way an otherwise honest list becomes unmailable.

  The contact record it creates carries no consent. lib/crm/contacts.ts explains why that
  separation is in the schema rather than in a convention.
*/

export type EnquiryInput = {
  name: string;
  email: string;
  subject: string;
  message: string;
  path?: string | null;
  ip?: string | null;
};

export type EnquiryResult = { ok: true } | { ok: false; error: string };

export async function submitEnquiry(input: EnquiryInput): Promise<EnquiryResult> {
  const name = input.name?.trim() ?? '';
  const email = normaliseEmail(input.email ?? '');
  const message = input.message?.trim() ?? '';
  const subject = input.subject?.trim() ?? '';

  if (!name || name.length > MAX_NAME_LENGTH) {
    return { ok: false, error: 'Tell us who to reply to.' };
  }

  if (!looksLikeEmail(email)) {
    return { ok: false, error: 'That address is missing an @ or a domain.' };
  }

  if (!isEnquirySubject(subject)) {
    return { ok: false, error: 'Pick one of the listed subjects.' };
  }

  if (message.length < MIN_MESSAGE_LENGTH) {
    return { ok: false, error: 'A little more detail helps us answer in one reply.' };
  }

  if (message.length > MAX_MESSAGE_LENGTH) {
    return { ok: false, error: 'That message is too long to send through this form.' };
  }

  /*
    An enquiry with no contact is unanswerable, and a contact conjured by a message that was
    never stored is a person we cannot explain knowing — so the two have to land together.

    They do, without an interactive transaction. Each branch below is a SINGLE nested write, and
    a nested write is atomic by itself. That matters here: this database is Neon behind
    PgBouncer, and wrapping several remote round trips in prisma.$transaction(async tx => …)
    exceeded Prisma's 5s ceiling under real latency and deadlocked against concurrent writes.
  */
  const existing = await prisma.contact.findUnique({
    where: { email },
    select: { id: true, name: true },
  });

  const enquiry = {
    name,
    email,
    subject,
    message,
    path: input.path ?? null,
    ipHash: hashIp(input.ip),
  };

  const received = {
    type: 'ENQUIRY_RECEIVED' as const,
    summary: `Sent an enquiry: ${subject}`,
    detail: message,
  };

  if (!existing) {
    await prisma.contact.create({
      data: {
        email,
        name,
        firstSource: 'contact form',
        enquiries: { create: enquiry },
        activities: {
          create: [
            { type: 'CONTACT_CREATED', summary: 'First seen via contact form.' },
            received,
          ],
        },
      },
    });

    return { ok: true };
  }

  await prisma.contact.update({
    where: { id: existing.id },
    data: {
      /* Fill a missing name, never blank one someone already gave. */
      ...(existing.name ? {} : { name }),
      lastActivityAt: new Date(),
      enquiries: { create: enquiry },
      activities: { create: received },
    },
  });

  return { ok: true };
}
