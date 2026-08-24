import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPassword } from '@/lib/auth/password';
import {
  createSessionToken,
  sessionCookieOptions,
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
} from '@/lib/auth/session';

/*
  Sign in.

  A NATIVE FORM POST, answered with a 303 redirect. The first version used fetch() and then
  navigated with client JavaScript; the cookie was set correctly every time but the navigation
  did not reliably take, leaving the browser on the login page holding a valid session. Letting
  the browser follow a server redirect removes that whole class of bug — the Set-Cookie and the
  Location are processed in one step, in the order the browser guarantees — and it means login
  works with JavaScript disabled.

  303 specifically: it tells the browser to re-issue as GET, so a refresh on the destination
  does not resubmit the password.

  Three defences that are easy to get wrong:

  1. ONE error message for both "no such account" and "wrong password". Distinguishing them
     turns a login form into an account-enumeration oracle.

  2. A dummy hash comparison when the account does not exist, so a missing account burns the
     same ~250ms as a real one. Without it the timing difference leaks what the shared message
     hides.

  3. Rate limiting. In memory, so it resets on redeploy and is per-instance — crude, but it
     turns unlimited online guessing into something slow. Move it to Redis for a real
     deployment.
*/

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/* A real bcrypt hash of a random string, used only to spend the same time as a real compare. */
const DUMMY_HASH = '$2b$12$C6UzMDM.H6dfI/f/IKcEe.ZmoiOJH8fnCqYPBQnUhLb7Vb2P8L7Qy';

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 8;
const attempts = new Map<string, { count: number; first: number }>();

function rateLimited(key: string): boolean {
  const now = Date.now();
  const entry = attempts.get(key);

  if (!entry || now - entry.first > WINDOW_MS) {
    attempts.set(key, { count: 1, first: now });
    return false;
  }

  entry.count += 1;
  return entry.count > MAX_ATTEMPTS;
}

function clientKey(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  return forwarded?.split(',')[0].trim() || 'local';
}

/** Only same-site paths, so `?next=` cannot be used as an open redirect to another origin. */
function safeNext(raw: FormDataEntryValue | null): string {
  const value = typeof raw === 'string' ? raw : '';
  if (!value.startsWith('/') || value.startsWith('//')) return '/admin';
  return value;
}

function backToLogin(request: Request, next: string, error: string) {
  const url = new URL('/admin/login', request.url);
  if (next !== '/admin') url.searchParams.set('next', next);
  url.searchParams.set('error', error);
  return NextResponse.redirect(url, 303);
}

export async function POST(request: Request) {
  const form = await request.formData();

  const email = String(form.get('email') ?? '').trim().toLowerCase();
  const password = String(form.get('password') ?? '');
  const next = safeNext(form.get('next'));

  if (!email || !password) {
    return backToLogin(request, next, 'missing');
  }

  if (rateLimited(clientKey(request))) {
    return backToLogin(request, next, 'throttled');
  }

  const user = await prisma.adminUser.findUnique({ where: { email } });

  /* Always spend the time, so a missing account is indistinguishable from a wrong password. */
  const ok = user
    ? await verifyPassword(password, user.passwordHash)
    : (await verifyPassword(password, DUMMY_HASH), false);

  if (!user || !ok) {
    return backToLogin(request, next, 'invalid');
  }

  await prisma.adminUser.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  const token = await createSessionToken({
    sub: user.id,
    email: user.email,
    ver: user.sessionVersion,
  });

  const response = NextResponse.redirect(new URL(next, request.url), 303);
  response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions(SESSION_MAX_AGE_SECONDS));
  return response;
}
