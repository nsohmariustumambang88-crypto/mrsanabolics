import 'server-only';
import crypto from 'crypto';

/*
  NOWPayments signs an IPN as HMAC-SHA512 (hex) of the JSON body with its keys SORTED
  ALPHABETICALLY, recursively, using the IPN secret — not of the bytes it sent. Hashing the raw
  body only matches when NOWPayments happens to send the keys already in order, so a check that
  does only that rejects genuine notifications and leaves paid orders stuck on "waiting".

  Both forms are tried: the sorted one (what the documentation specifies) and the raw body (in
  case a payload arrives already canonical). Comparison is constant-time.
*/

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === 'object') {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((sorted, key) => {
        sorted[key] = sortKeys((value as Record<string, unknown>)[key]);
        return sorted;
      }, {});
  }
  return value;
}

function sameHex(a: string, b: string): boolean {
  const left = Buffer.from(a, 'utf8');
  const right = Buffer.from(b.toLowerCase(), 'utf8');
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

export async function verifyNowpaymentsWebhook(
  body: string,
  signature: string
): Promise<boolean> {
  const secret = process.env.NOWPAYMENTS_IPN_SECRET;

  if (!secret) {
    console.error('NOWPAYMENTS_IPN_SECRET is not set');
    return false;
  }

  try {
    const sign = (text: string) => crypto.createHmac('sha512', secret).update(text, 'utf8').digest('hex');
    const sorted = JSON.stringify(sortKeys(JSON.parse(body)));
    return sameHex(sign(sorted), signature) || sameHex(sign(body), signature);
  } catch (error) {
    console.error('Webhook verification error:', error);
    return false;
  }
}
