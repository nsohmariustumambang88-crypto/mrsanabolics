import { NextResponse } from 'next/server';
import { registerCustomer } from '@/lib/account/accounts';
import {
  createAccountToken,
  accountCookieOptions,
  ACCOUNT_COOKIE,
  ACCOUNT_MAX_AGE_SECONDS,
} from '@/lib/account/session';
import { clientIp } from '@/lib/ip-hash';
import { attachVisitorByEmail, visitorTokenFrom } from '@/lib/analytics/identify';

/*
  Open an account.

  Public by necessity, so it is rate limited per IP — harder than sign-in, because this endpoint
  WRITES a row and reveals whether an address is already registered. That disclosure is argued
  for in lib/account/accounts.ts; the limit here is what stops it being usable as a bulk
  enumeration tool.

  Registering signs you in. The alternative — create the account, then ask the person to type
  the password they just chose — is friction with no security benefit, since they demonstrably
  hold the credential.

  What this route does NOT do: create a Subscriber. Opening an account is not consent to be
  emailed, and the newsletter box on this form posts separately to /api/subscribe with its own
  consent sentence. That separation is the whole design of the marketing tables.
*/

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_WINDOW = 5;
const attempts = new Map<string, { count: number; resetAt: number }>();

function rateLimited(key: string): boolean {
  const now = Date.now();
  const entry = attempts.get(key);

  if (!entry || now > entry.resetAt) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });

    /* Per-process and unbounded otherwise; drop expired entries on the way past. */
    if (attempts.size > 5000) {
      attempts.forEach((value, k) => {
        if (now > value.resetAt) attempts.delete(k);
      });
    }
    return false;
  }

  entry.count += 1;
  return entry.count > MAX_PER_WINDOW;
}

export async function POST(request: Request) {
  const ip = clientIp(request) ?? 'unknown';

  if (rateLimited(ip)) {
    return NextResponse.json(
      { error: 'Too many attempts from this connection. Try again later.' },
      { status: 429 }
    );
  }

  const body = (await request.json().catch(() => null)) as {
    email?: string;
    password?: string;
    name?: string;
    company?: string;
  } | null;

  if (!body?.email || !body?.password) {
    return NextResponse.json({ error: 'An email address and password are required.' }, { status: 400 });
  }

  /* Honeypot: hidden from people, filled by bots. Answers exactly like a success, because
     telling a bot it was caught is telling it how to pass. */
  if (body.company) {
    return NextResponse.json({ ok: true }, { status: 201 });
  }

  const result = await registerCustomer({
    email: body.email,
    password: body.password,
    name: body.name,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error, field: result.field }, { status: 400 });
  }

  /* They typed their own address, so this browser's history can be joined to the person. */
  await attachVisitorByEmail(visitorTokenFrom(request), result.customer.email);

  const token = await createAccountToken({
    sub: result.customer.id,
    email: result.customer.email,
    ver: 1,
  });

  const response = NextResponse.json({ ok: true, email: result.customer.email }, { status: 201 });
  response.cookies.set(ACCOUNT_COOKIE, token, accountCookieOptions(ACCOUNT_MAX_AGE_SECONDS));
  return response;
}
