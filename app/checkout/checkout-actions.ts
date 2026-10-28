'use server';

import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { createOrder, type CreateOrderInput } from '@/lib/orders/orders';
import { quoteDelivery } from '@/lib/delivery';
import { markBasketOrdered } from '@/lib/basket';

export type CheckoutSubmitInput = {
  email: string;
  firstName: string;
  lastName: string;
  country: string;
  cart: Array<{ productId: string; quantity: number }>;
  shipping: {
    line1: string;
    line2?: string;
    city: string;
    postcode: string;
  };
  shippingMethod?: string;
  discountCode?: string;
  paymentMethod?: string;
  cryptoAsset?: string;
};

export async function submitCheckout(
  input: CheckoutSubmitInput
): Promise<{ ok: true; reference: string } | { ok: false; error: string }> {
  // Strict email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!input.email || !emailRegex.test(input.email)) {
    return { ok: false, error: 'Valid email required' };
  }

  if (!input.firstName || !input.lastName) {
    return { ok: false, error: 'Name required' };
  }

  if (!input.shipping.line1 || !input.shipping.city || !input.shipping.postcode) {
    return { ok: false, error: 'Complete address required' };
  }

  if (input.cart.length === 0) {
    return { ok: false, error: 'Cart is empty' };
  }

  try {
    /* Shipping is quoted here from the delivery zones, never taken from the browser. */
    const products = await prisma.product.findMany({
      where: { id: { in: input.cart.map((line) => line.productId) } },
      select: { id: true, price: true },
    });
    const priceOf = new Map(products.map((p) => [p.id, Number(p.price)]));
    const subtotal = input.cart.reduce(
      (sum, line) => sum + (priceOf.get(line.productId) ?? 0) * line.quantity,
      0
    );
    const quote = await quoteDelivery({ country: input.country, subtotal });
    const rate = quote.options.find((option) => option.name === input.shippingMethod);
    if (!rate) {
      return { ok: false, error: 'Choose a delivery option for your country.' };
    }

    /* Upsert contact - create if new, fetch if exists */
    const contact = await prisma.contact.upsert({
      where: { email: input.email },
      update: {
        name: `${input.firstName} ${input.lastName}`,
      },
      create: {
        email: input.email,
        name: `${input.firstName} ${input.lastName}`,
        firstSource: 'checkout',
      },
      select: { id: true },
    });

    /* Build notes with payment method info */
    let notes = '';
    if (input.paymentMethod) {
      notes = `Payment: ${input.paymentMethod}`;
      if (input.cryptoAsset) {
        notes += ` (${input.cryptoAsset})`;
      }
    }

    /* Create the order */
    const result = await createOrder({
      contactId: contact.id,
      lines: input.cart,
      shipping: {
        name: `${input.firstName} ${input.lastName}`,
        line1: input.shipping.line1,
        line2: input.shipping.line2 ?? null,
        city: input.shipping.city,
        postcode: input.shipping.postcode,
        country: input.country,
      },
      shippingCost: rate.price,
      shippingMethod: rate.name,
      discountCode: input.discountCode,
      /* The shopper was shown this code applied; never charge them more than that silently. */
      requireDiscount: Boolean(input.discountCode),
      notes: notes || null,
    });

    if (!result.ok) {
      return result;
    }

    /* The basket this browser saved (lib/basket) became an order: never remind about it. */
    await markBasketOrdered(cookies().get('mra_vid')?.value, result.reference).catch(() => {});

    return { ok: true, reference: result.reference };
  } catch (error) {
    console.error('Checkout error:', error);
    return { ok: false, error: 'Failed to place order. Please try again.' };
  }
}
