'use server';

import { requireAdmin } from '@/lib/auth';
import { cleanBody, postStaffReply, setConversationStatus } from '@/lib/chat';
import type { StaffMessageDto } from '@/lib/chat';
import { MAX_MESSAGE_LENGTH } from '@/lib/chat/shared';

/*
  Live chat, from the admin side.

  requireAdmin() first in every action: a server action is a public endpoint with a generated URL,
  and middleware does not cover it. The reply is stamped with the signed-in administrator's
  address from the session, never from the form, so nobody can post as somebody else.

  NO revalidatePath HERE, deliberately. The inbox keeps itself current by polling, and the screen
  is force-dynamic, so there is no cached page to refresh. Revalidating made the action re-render
  the whole admin layout and page before it answered: eight database reads through the pooler,
  and a Send button that sat on "Sending…" for well over six seconds after the reply had already
  been saved.
*/

export type ActionResult = { ok: true } | { ok: false; error: string };

async function admin(): Promise<{ email: string } | null> {
  try {
    const session = await requireAdmin();
    return { email: session.email };
  } catch {
    return null;
  }
}

export async function replyToChatAction(
  conversationId: string,
  rawBody: string
): Promise<{ ok: true; message: StaffMessageDto } | { ok: false; error: string }> {
  const who = await admin();
  if (!who) return { ok: false, error: 'Your session has expired. Sign in again.' };

  const body = cleanBody(rawBody);
  if (!body) {
    return { ok: false, error: `Write a reply of up to ${MAX_MESSAGE_LENGTH.toLocaleString('en-US')} characters.` };
  }

  return postStaffReply({ conversationId, body, staffEmail: who.email });
}

export async function setChatStatusAction(
  conversationId: string,
  status: 'OPEN' | 'CLOSED'
): Promise<ActionResult> {
  const who = await admin();
  if (!who) return { ok: false, error: 'Your session has expired. Sign in again.' };
  if (status !== 'OPEN' && status !== 'CLOSED') return { ok: false, error: 'Unknown status.' };

  return setConversationStatus(conversationId, status);
}
