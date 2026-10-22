import { NextResponse } from 'next/server';
import { requestPasswordReset } from '@/lib/account/password-reset';
import { clientIp } from '@/lib/ip-hash';

/*
  Ask for a password reset link.

  One answer for every address — registered, unknown or malformed — so the form cannot be used
  to find out who has an account here. The work behind it (lib/account/password-reset.ts) sends
  mail only to an account's stored address, at most once a minute per account.

  Rate limited per IP, because each accepted request may send an email from our domain and a
  form that sends mail on demand is a spam cannon pointed at whoever's address is typed in. In
  memory and per instance, like the sign-in limit: crude, but it bounds the damage.
*/

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const WINDOW_MS = 15 * 60 * 1000;
const MAX_PER_WINDOW = 5;
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

const ANSWER = {
  ok: true,
  message:
    'If there is an account with that address, we have sent it a link to reset the password. It works for 60 minutes. Check your spam folder if it has not arrived in a few minutes.',
};

export async function POST(request: Request) {
  if (rateLimited(clientIp(request) ?? 'unknown')) {
    return NextResponse.json(
      { error: 'Too many reset requests. Wait a few minutes and try again.' },
      { status: 429 }
    );
  }

  const body = (await request.json().catch(() => null)) as { email?: unknown; company?: unknown } | null;

  /* Honeypot: a field people never see. Filled means a bot; it gets the normal answer. */
  if (body && typeof body.company === 'string' && body.company.trim() !== '') {
    return NextResponse.json(ANSWER);
  }

  const email = typeof body?.email === 'string' ? body.email : '';
  if (!email.trim()) {
    return NextResponse.json({ error: 'Enter the email address on your account.' }, { status: 400 });
  }

  try {
    await requestPasswordReset(email);
  } catch (error) {
    /* A database hiccup must not become a different answer for some addresses. */
    console.error('[password reset] request failed:', error);
  }

  return NextResponse.json(ANSWER);
}
