import { NextResponse, type NextRequest } from 'next/server';

/*
  The visitor's country as the CDN sees it, for preselecting the country selector.

  Pages are static, so they cannot read this header themselves without becoming per-request
  renders; the browser asks once per tab instead. Only the two-letter code leaves this route —
  never an IP, a city or anything finer — and nothing is stored. The answer is a guess the
  visitor can override; it never redirects anyone, so a crawler always gets the page it asked for.
*/

export const dynamic = 'force-dynamic';

export function GET(request: NextRequest) {
  const raw =
    request.headers.get('x-vercel-ip-country') ??
    request.headers.get('cf-ipcountry') ??
    request.headers.get('x-nf-geo-country') ??
    null;
  const country = raw && /^[A-Za-z]{2}$/.test(raw) ? raw.toUpperCase() : null;
  return NextResponse.json(
    { country },
    { headers: { 'cache-control': 'private, no-store', vary: 'x-vercel-ip-country' } }
  );
}
