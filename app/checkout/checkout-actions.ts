'use server';

import { prisma } from '@/lib/prisma';
import { createOrder, type CreateOrderInput } from '@/lib/orders/orders';

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
  shippingCost: number;
  discountCode?: string;
  total: number;
};

export async function submitCheckout(
  input: CheckoutSubmitInput
): Promise<{ ok: true; reference: string } | { ok: false; error: string }> {
  if (!input.email || !input.email.includes('@')) {
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
      shippingCost: input.shippingCost,
      shippingMethod: input.shippingMethod,
      discountCode: input.discountCode,
    });

    if (!result.ok) {
      return result;
    }

    return { ok: true, reference: result.reference };
  } catch (error) {
    console.error('Checkout error:', error);
    return { ok: false, error: 'Failed to place order. Please try again.' };
  }
}
