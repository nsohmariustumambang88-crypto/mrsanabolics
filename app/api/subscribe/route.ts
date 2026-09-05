import { NextResponse } from 'next/server';
import { subscribe } from '@/lib/marketing/subscribe';
import { SOURCES, type ConsentSource } from '@/lib/marketing/consent';
import { attachVisitorByEmail, visitorTokenFrom } from '@/lib/analytics/identify';

/*
  Marketing sign-up.

  Public by necessity — anyone can subscribe — which makes it the one open write path on the
  site, so it is rate limited per IP. Without that it is a free way to fill the table, and a
  worse one to use this domain to send confirmation mail at an address someone else owns.

  It never reports whether an address was already on the list. "You are already subscribed" is
  a membership oracle: it turns the form into a way to test whether a given person shops here,
  which is exactly the kind of leak the address was given in confidence to avoid.

  Node runtime: the consent record hashes the IP with node:crypto.
*/

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 6;
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

function clientIp(request: Request): string | null {
  const forwarded = request.headers.get('x-forwarded-for');
  return forwarded?.split(',')[0].trim() || null;
}

export async function POST(request: Request) {
  const ip = clientIp(request);

  if (rateLimited(ip ?? 'local')) {
    return NextResponse.json(
      { error: 'Too many sign-ups from this connection. Try again shortly.' },
      { status: 429 }
    );
  }

  const body = (await request.json().catch(() => null)) as {
    email?: string;
    source?: string;
    path?: string;
    consent?: boolean;
    cartValue?: number;
  } | null;

  if (!body?.email) {
    return NextResponse.json({ error: 'An email address is required.' }, { status: 400 });
  }

  /*
    The consent flag is checked server-side as well as in the form. A client that posts
    directly has not shown anyone a checkbox, and an unticked box is not consent however the
    request was assembled.
  */
  if (body.consent !== true) {
    return NextResponse.json(
      { error: 'Tick the consent box to subscribe.' },
      { status: 400 }
    );
  }

  if (!body.source || !SOURCES.includes(body.source as ConsentSource)) {
    return NextResponse.json({ error: 'Unknown sign-up source.' }, { status: 400 });
  }

  const result = await subscribe({
    email: body.email,
    source: body.source as ConsentSource,
    path: body.path ?? null,
    ip,
    abandonedValue: typeof body.cartValue === 'number' ? body.cartValue : null,
  });

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });

  /*
    They typed their own address and submitted it, so the browsing this browser has already
    done can be joined to the person. This is the only kind of moment where that link is made —
    analytics never works out who somebody is on its own. It cannot fail the sign-up.
  */
  await attachVisitorByEmail(visitorTokenFrom(request), body.email);

  /* One answer whether the address was new, returning, or already present. */
  return NextResponse.json({ ok: true }, { status: 201 });
}
