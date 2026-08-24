import { NextResponse } from 'next/server';
import { sessionCookieOptions, SESSION_COOKIE } from '@/lib/auth/session';

/* Clear the cookie by overwriting it with an immediately-expired one. */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, '', sessionCookieOptions(0));
  return response;
}
