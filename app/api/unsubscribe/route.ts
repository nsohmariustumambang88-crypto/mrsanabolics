import { NextResponse } from 'next/server';
import { unsubscribeByToken } from '@/lib/marketing/subscribe';
import { SITE } from '@/lib/site';

/*
  Perform the opt-out.

  A native form POST answered with a 303, the same shape the admin login uses: no client
  JavaScript in the path, so unsubscribing works in a text browser, in a mail client's
  built-in view, and if the bundle fails to load. Someone trying to leave a mailing list must
  never be blocked by a script that did not run — that is how a complaint becomes a spam
  report, which costs the sending domain far more than the subscriber was worth.
*/

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const form = await request.formData();
  const token = String(form.get('token') ?? '');

  const result = await unsubscribeByToken(token);
  const url = new URL('/unsubscribe', SITE.url);

  if (result.ok) {
    url.searchParams.set('done', '1');
  } else {
    /* Send the token back so the page can explain rather than showing a bare error. */
    url.searchParams.set('token', token);
  }

  return NextResponse.redirect(url, 303);
}
