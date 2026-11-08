import 'server-only';

import { createHmac, timingSafeEqual } from 'node:crypto';
import { prisma } from '@/lib/prisma';
import { SITE } from '@/lib/site';

/*
  Paying by Cash App: where the money goes, and who may upload a screenshot for an order.

  The $Cashtag and the name on the account are the `cashapp` row of the payment methods table
  (walletAddress, accountName), set at the owner's direction in November 2026. They are read
  whether or not the method is still listed, because an order placed before it was hidden still
  has to be paid.

  The upload link carries a token derived from the order reference with AUTH_SECRET. Only the
  checkout that placed the order and the "Order Received" email know it, so knowing a reference
  (which is short, and printed on paperwork) is not enough to attach a picture to someone's order.
  No column stores it: it can be worked out again from the reference whenever it is needed.
*/

export type CashAppDetails = { tag: string; name: string | null };

export async function cashAppDetails(): Promise<CashAppDetails | null> {
  const row = await prisma.paymentMethod.findUnique({
    where: { key: 'cashapp' },
    select: { walletAddress: true, accountName: true },
  });
  const tag = row?.walletAddress?.trim();
  if (!tag) return null;
  return { tag, name: row?.accountName?.trim() || null };
}

function secret(): string {
  const value = process.env.AUTH_SECRET;
  if (!value || value.length < 32) {
    throw new Error('AUTH_SECRET is missing or too short; payment upload links cannot be made.');
  }
  return value;
}

export function proofToken(reference: string): string {
  return createHmac('sha256', secret())
    .update(`payment-proof:${reference}`)
    .digest('base64url')
    .slice(0, 32);
}

export function proofTokenMatches(reference: string, token: unknown): boolean {
  if (typeof token !== 'string' || token.length !== 32) return false;
  const expected = Buffer.from(proofToken(reference));
  const given = Buffer.from(token);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

/** The page where the customer sees the $Cashtag and uploads the screenshot. */
export function cashAppPayUrl(reference: string): string {
  return `${SITE.url}/checkout/payment-confirmation?order=${encodeURIComponent(reference)}&t=${proofToken(reference)}`;
}
