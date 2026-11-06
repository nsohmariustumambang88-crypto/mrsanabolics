import 'server-only';

import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { createOrder } from '@/lib/orders/orders';
import { quoteDelivery } from '@/lib/delivery';
import { markBasketOrdered } from '@/lib/basket';
import { SITE } from '@/lib/site';
import { formatCheckoutNote, PAYMENT_METHOD_LABEL } from '@/lib/checkout/order-notes';
import { checkPhone } from '@/lib/checkout/phone';

export type CheckoutSubmitInput = {
  email: string;
  firstName: string;
  lastName: string;
  /** For the courier. Required, and checked again here with the form's own rule. */
  phone: string;
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

export type CheckoutResult = { ok: true; reference: string } | { ok: false; error: string };

/*
  The one path a storefront order takes into the database, whichever way it is paid.

  It used to live in the `submitCheckout` server action, which the crypto route also called. A
  server action can be called by any browser, so a crypto order could be placed through it with
  no NOWPayments invoice behind it — the customer saw "Order placed" and had no way to pay. The
  action (app/checkout/checkout-actions.ts) now refuses crypto and calls this; only
  /api/crypto/checkout places a crypto order, and it creates the invoice straight after.

  The browser sends no money figure: prices come from the database, shipping from the delivery
  zones, the discount is re-evaluated in createOrder.
*/
export async function placeCheckoutOrder(input: CheckoutSubmitInput): Promise<CheckoutResult> {
  // Strict email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!input.email || !emailRegex.test(input.email)) {
    return { ok: false, error: 'Valid email required' };
  }

  if (!input.firstName || !input.lastName) {
    return { ok: false, error: 'Name required' };
  }

  if (!input.shipping?.line1 || !input.shipping.city || !input.shipping.postcode) {
    return { ok: false, error: 'Complete address required' };
  }

  /* The browser checked this already; a request posted straight to the server has not been. */
  const phoneCheck = checkPhone(input.phone);
  if (!phoneCheck.ok) {
    return { ok: false, error: phoneCheck.error };
  }
  const phone = phoneCheck.phone;

  if (!Array.isArray(input.cart) || input.cart.length === 0) {
    return { ok: false, error: 'Cart is empty' };
  }

  try {
    /* Only a method the admin has listed at /admin/payments. */
    const method = input.paymentMethod
      ? await prisma.paymentMethod.findFirst({
          where: { key: input.paymentMethod, enabled: true },
          select: { key: true, label: true },
        })
      : null;
    if (!method) {
      return { ok: false, error: 'Choose a payment method.' };
    }

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
        phone,
        firstSource: 'checkout',
      },
      select: { id: true, phone: true },
    });

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
        phone,
      },
      shippingCost: rate.price,
      shippingMethod: rate.name,
      discountCode: input.discountCode,
      /* The shopper was shown this code applied; never charge them more than that silently. */
      requireDiscount: Boolean(input.discountCode),
      notes: formatCheckoutNote(method.key, input.cryptoAsset),
      payment: {
        label: method.label || PAYMENT_METHOD_LABEL[method.key] || method.key,
        payLink: (reference) =>
          method.key === 'crypto'
            ? `${SITE.url}/checkout/payment-confirmation?order=${reference}`
            : null,
      },
    });

    if (!result.ok) {
      return result;
    }

    /*
      Give the contact this number only if it has none. A number staff typed in, or one from an
      earlier order, is left as it is: the order keeps its own copy (shipPhone) either way. The
      condition is in the WHERE, so a number saved in the meantime is not overwritten either.
    */
    if (!contact.phone?.trim()) {
      await prisma.contact
        .updateMany({
          where: { id: contact.id, OR: [{ phone: null }, { phone: '' }] },
          data: { phone },
        })
        .catch(() => {
          /* The order carries the number; a contact detail that did not save must not undo it. */
        });
    }

    /* The basket this browser saved (lib/basket) became an order: never remind about it. */
    await markBasketOrdered(cookies().get('mra_vid')?.value, result.reference).catch(() => {});

    return { ok: true, reference: result.reference };
  } catch (error) {
    console.error('Checkout error:', error);
    return { ok: false, error: 'Failed to place order. Please try again.' };
  }
}
