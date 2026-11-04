'use server';

import {
  placeCheckoutOrder,
  type CheckoutResult,
  type CheckoutSubmitInput,
} from '@/lib/checkout/place-order';

export type { CheckoutSubmitInput };

/*
  The checkout's "Place order" button, for the methods paid by hand (bank transfer, Cash App).

  Crypto is refused here on purpose. A crypto order needs a NOWPayments invoice the moment it
  exists, and only /api/crypto/checkout creates one; an order placed through this action would
  say "Order placed" to somebody with no address to pay to. See lib/checkout/place-order.ts.
*/
export async function submitCheckout(input: CheckoutSubmitInput): Promise<CheckoutResult> {
  if (input?.paymentMethod === 'crypto') {
    return { ok: false, error: 'To pay with crypto, choose Pay with BTC or Pay with ETH above.' };
  }
  return placeCheckoutOrder(input);
}
