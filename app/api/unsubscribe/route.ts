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

  It is also the RFC 8058 one-click target. Marketing email carries
  `List-Unsubscribe: <…/api/unsubscribe?token=…>` and `List-Unsubscribe-Post:
  List-Unsubscribe=One-Click`; the mailbox provider then POSTs `List-Unsubscribe=One-Click` to
  that address, with the token in the query string, and expects a plain 200, not a redirect.
  Only a POST unsubscribes: a GET of the same address does nothing, because mail scanners fetch
  links.
*/

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/*
  Some mail apps open the List-Unsubscribe address in a browser instead of POSTing to it. That
  GET changes nothing (scanners fetch links too): it shows the confirmation page, whose button
  POSTs back here.
*/
export function GET(request: Request) {
  const token = new URL(request.url).searchParams.get('token') ?? '';
  const url = new URL('/unsubscribe', SITE.url);
  if (token) url.searchParams.set('token', token);
  return NextResponse.redirect(url, 303);
}

export async function POST(request: Request) {
  const query = new URL(request.url).searchParams;
  const form = await request.formData().catch(() => null);
  const oneClick = form?.get('List-Unsubscribe') === 'One-Click';
  const token = String(form?.get('token') ?? query.get('token') ?? '');

  const result = await unsubscribeByToken(token);

  if (oneClick) {
    /* Whatever the outcome, the provider only needs to know the request was received. */
    return new NextResponse(result.ok ? 'Unsubscribed.' : 'Received.', {
      status: 200,
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    });
  }
  const url = new URL('/unsubscribe', SITE.url);

  if (result.ok) {
    url.searchParams.set('done', '1');
  } else {
    /* Send the token back so the page can explain rather than showing a bare error. */
    url.searchParams.set('token', token);
  }

  return NextResponse.redirect(url, 303);
}
