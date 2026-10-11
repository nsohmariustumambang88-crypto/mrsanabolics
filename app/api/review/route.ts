import { NextResponse } from 'next/server';
import { submitReview } from '@/lib/reviews';
import { clientIp, hashIp } from '@/lib/ip-hash';

/*
  The public review form.

  Same shape as /api/enquiry: it is an open write path attached to a free text body, so it
  carries a honeypot. There is no per-connection limit; every submission waits for moderation. The cost of getting this wrong
  does not land on the server, it lands on whoever has to read the moderation queue.

  Two things it deliberately does not do:

  - It never creates or touches a Subscriber. Writing about something you bought is not consent
    to be emailed, and the code path this route calls (lib/reviews/index.ts) cannot reach the
    subscriber table at all.
  - It never publishes. Everything submitted here is PENDING until a person approves it — the
    response says so plainly rather than implying the review is live.

  The raw IP is hashed before it leaves this file and the hash is all that is passed on, so no
  layer below has an address to store by accident. With SUBSCRIBER_IP_SALT unset, hashIp returns
  null and nothing is recorded — see lib/ip-hash.ts on why an unsalted digest is worse.

  Node runtime: hashing uses node:crypto.
*/

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const ip = clientIp(request);

  const body = (await request.json().catch(() => null)) as {
    productId?: string;
    author?: string;
    email?: string;
    rating?: number | string;
    title?: string;
    review?: string;
    /*
      A field no human sees and no real submission fills. Bots complete every input they find,
      so a filled honeypot is the cheapest spam signal available — no puzzle for the visitor,
      no third-party script on the page.
    */
    company?: string;
  } | null;

  if (!body) {
    return NextResponse.json({ error: 'That review could not be read.' }, { status: 400 });
  }

  /* Answer exactly as if it had worked. Telling a bot it was caught is telling it how to pass. */
  if (typeof body.company === 'string' && body.company.trim().length > 0) {
    return NextResponse.json({ ok: true }, { status: 201 });
  }

  if (typeof body.productId !== 'string' || body.productId.length === 0) {
    return NextResponse.json({ error: 'That review could not be read.' }, { status: 400 });
  }

  const result = await submitReview({
    productId: body.productId,
    author: body.author ?? '',
    email: body.email ?? null,
    rating: Number(body.rating),
    title: body.title ?? '',
    body: body.review ?? '',
    ipHash: hashIp(ip),
  });

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });

  return NextResponse.json({ ok: true }, { status: 201 });
}
