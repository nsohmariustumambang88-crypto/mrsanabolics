import { NextResponse } from 'next/server';
import { submitEnquiry } from '@/lib/crm/enquiries';
import { clientIp } from '@/lib/ip-hash';
import { attachVisitorByEmail, visitorTokenFrom } from '@/lib/analytics/identify';

/*
  The public contact form.

  Open by necessity, so it is rate limited per IP like /api/subscribe. An unlimited write path
  attached to a message body is a spam relay waiting to be found, and the cost lands on whoever
  reads the queue.

  Two things this route deliberately does not do:

  - It does not subscribe anyone. Writing to support is not consent to marketing, and the code
    path that stores this message cannot reach the subscriber table at all (lib/crm/enquiries.ts).
  - It does not report whether the address is already known to us. The subscribe route avoids
    that same membership oracle for the same reason: a form that answers "we know you" is a
    tool for testing who shops here.

  Node runtime: the origin evidence is hashed with node:crypto.
*/

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 4;
const hits = new Map<string, { count: number; first: number }>();

function rateLimited(key: string): boolean {
  const now = Date.now();
  const entry = hits.get(key);

  if (!entry || now - entry.first > WINDOW_MS) {
    hits.set(key, { count: 1, first: now });
    return false;
  }

  entry.count += 1;
  return entry.count > MAX_PER_WINDOW;
}

export async function POST(request: Request) {
  const ip = clientIp(request);

  if (rateLimited(ip ?? 'local')) {
    return NextResponse.json(
      { error: 'Too many messages from this connection. Try again shortly.' },
      { status: 429 }
    );
  }

  const body = (await request.json().catch(() => null)) as {
    name?: string;
    email?: string;
    subject?: string;
    message?: string;
    path?: string;
    /*
      A field no human sees and no real submission fills. Bots complete every input they find,
      so a filled honeypot is the cheapest possible spam signal — no puzzle for the visitor and
      no third-party script on the page.
    */
    company?: string;
  } | null;

  if (!body) {
    return NextResponse.json({ error: 'That message could not be read.' }, { status: 400 });
  }

  /* Answer exactly as if it had worked. Telling a bot it was caught is telling it how to pass. */
  if (typeof body.company === 'string' && body.company.trim().length > 0) {
    return NextResponse.json({ ok: true }, { status: 201 });
  }

  const result = await submitEnquiry({
    name: body.name ?? '',
    email: body.email ?? '',
    subject: body.subject ?? '',
    message: body.message ?? '',
    path: body.path ?? null,
    ip,
  });

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });

  /*
    They gave their own address in the form they just sent, so this browser can be joined to
    the contact it belongs to. The only kind of moment where that link is made — and it can
    never fail the enquiry.
  */
  await attachVisitorByEmail(visitorTokenFrom(request), body.email ?? '');

  return NextResponse.json({ ok: true }, { status: 201 });
}
