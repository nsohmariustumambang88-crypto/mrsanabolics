'use server';

import { revalidatePath } from 'next/cache';
import type { MessageChannel } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { recordActivity } from '@/lib/crm/contacts';

/*
  One-to-one correspondence, recorded after the fact.

  Same honesty as campaigns: NOTHING HERE SENDS ANYTHING. A person replies from their own mail
  client, or picks up the phone, and then writes down what they said — so the next person to
  open that contact can read the conversation instead of guessing at it. `recordedBy` is who
  says they sent it, taken from the session rather than typed.

  This is also why there is no "compose" screen and no "Send" button: a box you type into that
  then does not deliver is worse than no box at all, because it looks exactly like one that does.
*/

export type ActionResult = { ok: true } | { ok: false; error: string };

const EXPIRED = 'Your session has expired. Sign in again.';

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

function text(form: FormData, key: string): string {
  const raw = form.get(key);
  return typeof raw === 'string' ? raw.trim() : '';
}

const CHANNELS: Record<MessageChannel, { label: string; noun: string }> = {
  EMAIL: { label: 'Email', noun: 'Email' },
  PHONE: { label: 'Phone', noun: 'Phone call' },
  OTHER: { label: 'Other', noun: 'Message' },
};

/** The date this was sent, from a datetime-local field. Blank means now. */
function parseSentAt(raw: string): Date | null {
  if (!raw) return new Date();
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  /*
    A minute of slack for clock skew between the browser and the server, and no more. A message
    dated into the future has not been sent, and a log that accepts one stops being a log.
  */
  if (parsed.getTime() > Date.now() + 60_000) return null;
  return parsed;
}

export async function recordMessage(form: FormData): Promise<ActionResult> {
  const who = await admin();
  if (!who) return fail(EXPIRED);

  const contactId = text(form, 'contactId');
  if (!contactId) return fail('Choose who this was sent to.');

  const channelRaw = text(form, 'channel') || 'EMAIL';
  if (!(channelRaw in CHANNELS)) return fail('Unknown channel.');
  const channel = channelRaw as MessageChannel;

  const subject = text(form, 'subject');
  if (subject.length > 300) return fail('That subject is too long.');

  const body = text(form, 'body');
  if (!body) return fail('Write down what was actually said — that is the whole value of this.');
  if (body.length > 20000) return fail('That is longer than this log is meant to hold.');

  const sentAt = parseSentAt(text(form, 'sentAt'));
  if (!sentAt) return fail('That date is not a moment in the past.');

  const contact = await prisma.contact.findUnique({
    where: { id: contactId },
    select: { id: true, email: true, name: true },
  });
  if (!contact) return fail('That contact no longer exists.');

  /*
    The message is written first, then the timeline line. Two single writes rather than an
    interactive transaction — see CLAUDE.md on PgBouncer: `$transaction(async tx => …)` holds a
    connection across round trips and against Neon that blew Prisma's ceiling and deadlocked
    concurrent admin writes. The order matters: if the second write fails, the record of the
    message survives, which is the half that would be expensive to lose.
  */
  await prisma.outboundMessage.create({
    data: {
      contactId: contact.id,
      channel,
      subject: subject || null,
      body,
      sentAt,
      recordedBy: who.email,
    },
  });

  /*
    Written for a human at the point it happens. Rebuilding this sentence later from a type and
    a foreign key is how timelines end up saying "message" and nothing else.
  */
  const noun = CHANNELS[channel].noun;
  const summary = subject ? `${noun} recorded: “${subject}”` : `${noun} recorded.`;

  const sentDay = sentAt.toISOString().slice(0, 10);
  const today = new Date().toISOString().slice(0, 10);

  await recordActivity(prisma, {
    contactId: contact.id,
    type: 'MESSAGE_RECORDED',
    summary,
    detail: sentDay === today ? body : `Sent ${sentDay}.\n\n${body}`,
    actorEmail: who.email,
  });

  revalidatePath('/admin/messages');
  revalidatePath('/admin/contacts');
  revalidatePath(`/admin/contacts/${contact.id}`);
  return { ok: true };
}

/**
 * Remove a recorded message.
 *
 * The contact's timeline entry stays. ContactActivity is append-only for a reason — a history
 * you can quietly edit answers no question you would ask a history — so this deletes the log
 * row and leaves the line saying a message was recorded. That is a slight redundancy on
 * purpose: it is here for a duplicate or a misfiled row, not for tidying away a conversation.
 */
export async function deleteMessage(id: string): Promise<ActionResult> {
  const who = await admin();
  if (!who) return fail(EXPIRED);

  const message = await prisma.outboundMessage.findUnique({
    where: { id },
    select: { contactId: true },
  });
  if (!message) return fail('That message no longer exists.');

  await prisma.outboundMessage.delete({ where: { id } });

  revalidatePath('/admin/messages');
  revalidatePath(`/admin/contacts/${message.contactId}`);
  return { ok: true };
}
