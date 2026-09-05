import { NextResponse } from 'next/server';
import { quoteDelivery, MAX_SUBTOTAL, normaliseCountry, normaliseSubtotal } from '@/lib/delivery';
import { clientIp } from '@/lib/ip-hash';

/*
  What can this basket be delivered by, to this country?

  Public, because the checkout has to ask before anyone has an account or a session. It reveals
  nothing that is not already a published shipping table, so there is no membership oracle to
  worry about here — but it does reach Postgres on every call, so it is rate limited per IP for
  the same reason /api/subscribe is: an unlimited path to the database is a free way to hold
  connections open on a Neon endpoint that has very few of them.

  Input is normalised before it goes near a query. The country is upper-cased and length-checked
  (the zones store ISO alpha-2, and a two-letter check is the whole validation — the codes
  themselves are staff-entered data, not an enum this file should duplicate), and the subtotal is
  clamped: a negative basket would win every minSubtotal test the wrong way round and a basket of
  1e308 would make every freeOverSubtotal fire.

  POST rather than GET because the basket value is the customer's, and a cacheable URL carrying it
  is a value that ends up in a proxy log.

  Node runtime: Prisma.
*/

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const WINDOW_MS = 60 * 1000;
const MAX_PER_WINDOW = 60;
const hits = new Map<string, { count: number; first: number }>();

function rateLimited(key: string): boolean {
  const now = Date.now();
  const entry = hits.get(key);

  if (!entry || now - entry.first > WINDOW_MS) {
    hits.set(key, { count: 1, first: now });
    return false;
  }

  entry.count += 1;
  return entry.count > MAX_PER_WINDOW;
}

export async function POST(request: Request) {
  if (rateLimited(clientIp(request) ?? 'local')) {
    return NextResponse.json(
      { error: 'Too many requests from this connection. Try again shortly.' },
      { status: 429 }
    );
  }

  const body = (await request.json().catch(() => null)) as {
    country?: unknown;
    subtotal?: unknown;
  } | null;

  if (!body) {
    return NextResponse.json({ error: 'That request could not be read.' }, { status: 400 });
  }

  const country = normaliseCountry(body.country);
  if (!country) {
    return NextResponse.json(
      { error: 'Give a two-letter country code, such as US or GB.' },
      { status: 400 }
    );
  }

  const subtotal = normaliseSubtotal(body.subtotal);

  const quote = await quoteDelivery({ country, subtotal });

  /*
    A country nothing covers is a 200 with no options, not an error. It is a true and complete
    answer to what was asked, and the checkout has to render it as "we cannot ship there yet"
    either way — turning it into a 4xx only tempts a caller to treat it as its own bug.
  */
  return NextResponse.json(
    {
      ok: true,
      country,
      subtotal,
      zone: quote.zone,
      options: quote.options,
      /* Echoed so a caller can tell a clamped basket from the one it sent. */
      maxSubtotal: MAX_SUBTOTAL,
    },
    { status: 200 }
  );
}
