import { NextResponse } from 'next/server';
import { clientIp } from '@/lib/ip-hash';
import { visitorMessagesAfter } from '@/lib/chat';
import { chatTokenFrom, overLimit } from '@/lib/chat/http';

/*
  The widget's poll: every message newer than the one it last holds.

  A browser with no chat cookie has never sent a message, so it is answered without touching the
  database — most visitors who open the panel and read it cost nothing. The cookie is the only
  key: there is no conversation id in the URL, so one visitor cannot ask for another's thread.

  The limit is generous, because a two-second poll is 300 requests in ten minutes by design; it
  exists to stop a loop, not a reader.
*/

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const WINDOW_MS = 10 * 60 * 1000;
const MAX_POLLS = 900;

export async function GET(request: Request) {
  const noStore = { 'Cache-Control': 'no-store' };

  if (overLimit('chat-poll', clientIp(request) ?? 'local', MAX_POLLS, WINDOW_MS)) {
    return NextResponse.json({ error: 'Too many requests.' }, { status: 429, headers: noStore });
  }

  const token = chatTokenFrom(request);
  if (!token) return NextResponse.json({ status: null, messages: [] }, { headers: noStore });

  const after = new URL(request.url).searchParams.get('after');
  const result = await visitorMessagesAfter(token, after);
  return NextResponse.json(result, { headers: noStore });
}
