import { NextResponse } from 'next/server';
import { resetPasswordWithToken } from '@/lib/account/password-reset';
import {
  createAccountToken,
  accountCookieOptions,
  ACCOUNT_COOKIE,
  ACCOUNT_MAX_AGE_SECONDS,
} from '@/lib/account/session';
import { clientIp } from '@/lib/ip-hash';

/*
  Set a new password with a reset link, and sign in.

  Signing in afterwards carries no extra risk: whoever holds a valid link can set the password
  and then sign in with it anyway. The session is minted with the NEW sessionVersion, so it is
  the only one that survives — every cookie issued before the reset is now refused.

  Rate limited per IP so the token cannot be guessed online (it is 256 random bits; the limit is
  belt and braces).
*/

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const WINDOW_MS = 15 * 60 * 1000;
const MAX_PER_WINDOW = 10;
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
  return entry.count > MAX_PER_WINDOW;
}

export async function POST(request: Request) {
  if (rateLimited(clientIp(request) ?? 'unknown')) {
    return NextResponse.json({ error: 'Too many attempts. Wait a few minutes and try again.' }, { status: 429 });
  }

  const body = (await request.json().catch(() => null)) as { token?: unknown; password?: unknown } | null;
  const password = typeof body?.password === 'string' ? body.password : '';

  const result = await resetPasswordWithToken(body?.token, password);
  if (!result.ok) {
    return NextResponse.json({ error: result.error, expired: Boolean(result.expired) }, { status: 400 });
  }

  const token = await createAccountToken({
    sub: result.customer.id,
    email: result.customer.email,
    ver: result.sessionVersion,
  });
  const response = NextResponse.json({ ok: true });
  response.cookies.set(ACCOUNT_COOKIE, token, accountCookieOptions(ACCOUNT_MAX_AGE_SECONDS));
  return response;
}
