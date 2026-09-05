import { NextResponse } from 'next/server';
import { evaluateDiscount, reasonMessage } from '@/lib/discounts';
import { clientIp } from '@/lib/ip-hash';
import { formatPrice } from '@/lib/format';

/*
  Check a discount code against a basket.

  Public by necessity — a shopper has to be able to try one — which makes it the second open
  write-adjacent path on the site after /api/subscribe, and it is the more attractive one to
  abuse: unlimited tries against a short alphanumeric code is how private codes leak. So it is
  rate limited per IP on the same shape as the subscribe route.

  The response says only what a shopper needs: whether it worked, how much, whether shipping is
  free, and a sentence. Never the discount's internals — not its id, its type, its limits, its
  window, its remaining uses, nor which of those it fell foul of. `reasonMessage` deliberately
  gives "not valid" for both an unknown code and an expired one, because a response that told
  them apart would turn this endpoint into a way to enumerate every code ever issued. See the
  note in lib/discounts/index.ts before changing the wording.

  Nothing here redeems anything. Validating is not using: `redeemDiscount` is called when an
  order is actually recorded, so a shopper who tries a code and leaves has not consumed it.
*/

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 12;
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

type ValidateResponse = {
  valid: boolean;
  amount: number;
  freeShipping: boolean;
  message: string;
};

function reply(body: ValidateResponse, status = 200) {
  return NextResponse.json(body, { status });
}

export async function POST(request: Request) {
  const ip = clientIp(request);

  if (rateLimited(ip ?? 'local')) {
    return reply(
      {
        valid: false,
        amount: 0,
        freeShipping: false,
        message: 'Too many attempts from this connection. Try again shortly.',
      },
      429
    );
  }

  const body = (await request.json().catch(() => null)) as {
    code?: unknown;
    subtotal?: unknown;
  } | null;

  const code = typeof body?.code === 'string' ? body.code : '';
  if (!code.trim()) {
    return reply(
      { valid: false, amount: 0, freeShipping: false, message: 'Enter a code.' },
      400
    );
  }

  /* A code is short. Anything much longer is not a shopper typing. */
  if (code.length > 64) {
    return reply({
      valid: false,
      amount: 0,
      freeShipping: false,
      message: 'That code is not valid.',
    });
  }

  const subtotalRaw = typeof body?.subtotal === 'number' ? body.subtotal : Number.NaN;
  if (!Number.isFinite(subtotalRaw) || subtotalRaw < 0) {
    return reply(
      {
        valid: false,
        amount: 0,
        freeShipping: false,
        message: 'We could not read your basket total.',
      },
      400
    );
  }

  /*
    No contactId is taken from the request. A per-customer limit checked against an id the
    caller supplied is not a limit — it would be checked against whoever they claimed to be.
    That check happens where the identity is known: when the order is recorded.
  */
  const result = await evaluateDiscount({ code, subtotal: subtotalRaw });

  if (!result.ok) {
    return reply({
      valid: false,
      amount: 0,
      freeShipping: false,
      message: reasonMessage(result.reason),
    });
  }

  const message = result.freeShipping
    ? result.amount > 0
      ? `${formatPrice(result.amount)} off and free shipping applied.`
      : 'Free shipping applied.'
    : `${formatPrice(result.amount)} off applied.`;

  return reply({
    valid: true,
    amount: result.amount,
    freeShipping: result.freeShipping,
    message,
  });
}
