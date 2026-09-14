import { NextResponse } from 'next/server';
import { clientIp } from '@/lib/ip-hash';
import { attachVisitorDetails } from '@/lib/chat';
import { chatTokenFrom, overLimit } from '@/lib/chat/http';
import { attachVisitorByEmail, visitorTokenFrom } from '@/lib/analytics/identify';

/*
  "Leave your address so we can reply if you go."

  It links the conversation to a Contact, and that is all. It never subscribes anyone: asking a
  shop a question is not consent to its marketing. And it answers the same way for an address the
  shop already knows as for a new one, so it cannot be used to test who shops here.
*/

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 6;

export async function POST(request: Request) {
  if (overLimit('chat-details', clientIp(request) ?? 'local', MAX_PER_WINDOW, WINDOW_MS)) {
    return NextResponse.json({ error: 'Too many attempts. Try again shortly.' }, { status: 429 });
  }

  const input = (await request.json().catch(() => null)) as {
    email?: unknown;
    name?: unknown;
    website?: unknown;
  } | null;
  if (!input) return NextResponse.json({ error: 'That could not be read.' }, { status: 400 });

  if (typeof input.website === 'string' && input.website.trim()) {
    return NextResponse.json({ ok: true });
  }

  const token = chatTokenFrom(request);
  if (!token) {
    return NextResponse.json({ error: 'Send a message first, then leave your address.' }, { status: 400 });
  }

  const email = typeof input.email === 'string' ? input.email : '';
  const result = await attachVisitorDetails({
    token,
    email,
    name: typeof input.name === 'string' ? input.name : null,
  });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });

  /* They typed their own address, so this browser's analytics can be joined to them. */
  await attachVisitorByEmail(visitorTokenFrom(request), email);

  return NextResponse.json({ ok: true });
}
