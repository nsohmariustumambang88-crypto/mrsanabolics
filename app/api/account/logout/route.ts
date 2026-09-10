import { NextResponse } from 'next/server';
import { ACCOUNT_COOKIE, accountCookieOptions } from '@/lib/account/session';

/*
  Sign out.

  POST only. A GET that destroys a session can be fired by anything that fetches a URL — a
  prefetcher, a link scanner, an image tag on another site — which is the same reasoning that
  makes the unsubscribe link confirm on GET and act on POST.

  The cookie is overwritten with an empty value and maxAge 0 rather than deleted by name, so the
  attributes match the ones it was set with. A Set-Cookie whose path or sameSite differs from
  the original leaves the original in place, and the person stays signed in while being told
  they are not.

  This clears the browser's session only. It does not bump sessionVersion, so other devices stay
  signed in — that is what "sign out everywhere" is for, and it belongs behind a password.
*/

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  /* Same-origin only: a cross-site form post should not be able to sign somebody out. */
  const origin = request.headers.get('origin');
  const host = request.headers.get('host');
  if (origin && host && new URL(origin).host !== host) {
    return NextResponse.json({ error: 'Cross-origin sign-out refused.' }, { status: 403 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(ACCOUNT_COOKIE, '', accountCookieOptions(0));
  return response;
}
