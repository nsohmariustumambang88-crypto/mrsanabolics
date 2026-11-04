import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createPayment } from '@/lib/crypto/nowpayments';
import { SITE } from '@/lib/site';
import { placeCheckoutOrder, type CheckoutSubmitInput } from '@/lib/checkout/place-order';
import { formatCryptoNote } from '@/lib/checkout/order-notes';

const SUPPORTED = ['btc', 'eth'];

/*
  A crypto order is created exactly like any other checkout order: prices come from the database,
  the discount and the minimum order are applied, and the items and address are saved. Only then
  is NOWPayments asked for an invoice, for the total the server worked out. Nothing about the
  amount comes from the browser.
*/
export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as
    | (CheckoutSubmitInput & { pay_currency?: string })
    | null;
  if (!body) {
    return NextResponse.json({ error: 'That order could not be read.' }, { status: 400 });
  }

  const payCurrency = String(body.pay_currency ?? '').toLowerCase();
  if (!SUPPORTED.includes(payCurrency)) {
    return NextResponse.json(
      { error: `Unsupported currency. Supported: ${SUPPORTED.join(', ').toUpperCase()}` },
      { status: 400 }
    );
  }

  try {
    const placed = await placeCheckoutOrder({
      ...body,
      paymentMethod: 'crypto',
      cryptoAsset: payCurrency.toUpperCase(),
    });
    if (!placed.ok) {
      return NextResponse.json({ error: placed.error }, { status: 400 });
    }

    const order = await prisma.order.findUnique({
      where: { reference: placed.reference },
      select: { id: true, reference: true, total: true },
    });
    if (!order) {
      return NextResponse.json({ error: 'The order could not be found.' }, { status: 500 });
    }

    let payment;
    try {
      payment = await createPayment({
        price_amount: Number(order.total),
        price_currency: 'usd',
        pay_currency: payCurrency,
        order_id: order.reference,
        order_description: `Order ${order.reference}`,
        /* No success/cancel URLs: the customer pays on our own payment-confirmation page. */
        ipn_callback_url: `${SITE.url}/api/webhooks/nowpayments`,
      });
    } catch (paymentError) {
      console.error(`[Crypto Checkout] Payment creation failed for ${order.reference}:`, paymentError);
      return NextResponse.json(
        {
          error: 'Your order was saved, but the payment could not be started. Please try again or contact support.',
          order_reference: order.reference,
        },
        { status: 400 }
      );
    }

    // NOWPayments returns `payment_id`; older responses used `id`.
    const paymentId = (payment as { payment_id?: string | number; id?: string | number }).payment_id
      ?? (payment as { id?: string | number }).id;
    if (!paymentId) {
      console.error('[Crypto Checkout] Payment response missing payment_id:', JSON.stringify(payment));
      return NextResponse.json({ error: 'The payment could not be started.' }, { status: 500 });
    }

    /*
      The payment page, the payment-status route and the webhook all read this note through
      lib/checkout/order-notes. The amount and address are stored so the page can show them
      without asking NOWPayments again, which can take most of a minute to answer.
    */
    await prisma.order.update({
      where: { id: order.id },
      data: {
        notes: formatCryptoNote({
          asset: payCurrency,
          paymentId: String(paymentId),
          payAmount: payment.pay_amount != null ? String(payment.pay_amount) : undefined,
          payAddress: payment.pay_address,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      order_id: order.id,
      order_reference: order.reference,
      payment_url: `${SITE.url}/checkout/payment-confirmation?order=${order.reference}`,
      pay_amount: payment.pay_amount,
      pay_currency: payment.pay_currency,
    });
  } catch (error) {
    console.error('[Crypto Checkout] Error:', error);
    return NextResponse.json({ error: 'Failed to create the payment.' }, { status: 500 });
  }
}
