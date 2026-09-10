import { NextResponse } from 'next/server';
import { authenticateCustomer } from '@/lib/account/accounts';
import {
  createAccountToken,
  accountCookieOptions,
  ACCOUNT_COOKIE,
  ACCOUNT_MAX_AGE_SECONDS,
} from '@/lib/account/session';
import { clientIp } from '@/lib/ip-hash';

/*
  Sign in to the storefront.

  The refusal wording and the constant-time behaviour both live in
  lib/account/accounts.ts — this route's job is the cookie and the rate limit.

  Rate limiting is keyed on the IP alone rather than IP+email. Keying it on the pair looks
  fairer but is weaker: an attacker walking a password list across many addresses from one
  connection never trips a per-pair counter. Per-IP is what makes online guessing slow.

  In memory, so it resets on redeploy and is per-instance — crude, but it turns unlimited
  guessing into something bounded. Redis for a real deployment.
*/

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 10;
const attempts = new Map<string, { count: number; resetAt: number }>();

function rateLimited(key: string): boolean {
  const now = Date.now();
  const entry = attempts.get(key);

  if (!entry || now > entry.resetAt) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    if (attempts.size > 5000) {
      attempts.forEach((value, k) => {
        if (now > value.resetAt) attempts.delete(k);
      });
    }
    return false;
  }

  entry.count += 1;
  return entry.count > MAX_ATTEMPTS;
}

export async function POST(request: Request) {
  const ip = clientIp(request) ?? 'unknown';

  if (rateLimited(ip)) {
    return NextResponse.json(
      { error: 'Too many sign-in attempts. Wait a few minutes and try again.' },
      { status: 429 }
    );
  }

  const body = (await request.json().catch(() => null)) as {
    email?: string;
    password?: string;
  } | null;

  if (!body?.email || !body?.password) {
    return NextResponse.json(
      { error: 'That email address and password do not match an account.' },
      { status: 400 }
    );
  }

  const result = await authenticateCustomer({ email: body.email, password: body.password });
  if (!result.ok) {
    /* 401, and the same sentence whichever half was wrong. */
    return NextResponse.json({ error: result.error }, { status: 401 });
  }

  const token = await createAccountToken({
    sub: result.customer.id,
    email: result.customer.email,
    ver: result.sessionVersion,
  });

  const response = NextResponse.json({ ok: true, email: result.customer.email });
  response.cookies.set(ACCOUNT_COOKIE, token, accountCookieOptions(ACCOUNT_MAX_AGE_SECONDS));
  return response;
}
