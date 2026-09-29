import { prisma } from '@/lib/prisma';
import { createPayment } from '@/lib/crypto/nowpayments';
import { SITE } from '@/lib/site';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { items, total, email, pay_currency } = body;

    if (!items || !total || !email || !pay_currency) {
      return NextResponse.json(
        { error: 'Missing required fields: items, total, email, pay_currency' },
        { status: 400 }
      );
    }

    // Validate pay_currency is supported
    const supportedCurrencies = ['btc', 'eth', 'usdt'];
    if (!supportedCurrencies.includes(pay_currency.toLowerCase())) {
      return NextResponse.json(
        { error: `Unsupported currency: ${pay_currency}. Supported: ${supportedCurrencies.join(', ')}` },
        { status: 400 }
      );
    }

    // Generate order number
    const orderNumber = `MRA-${Date.now().toString().slice(-8)}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

    // Create or get contact by email
    const contact = await prisma.contact.upsert({
      where: { email },
      update: {},
      create: {
        email,
        firstSource: 'crypto-checkout',
      },
    });

    // Create order in database with NEW status
    const order = await prisma.order.create({
      data: {
        reference: orderNumber,
        status: 'NEW',
        contactId: contact.id,
        shipName: '',
        shipLine1: '',
        shipCity: '',
        shipPostcode: '',
        shipCountry: '',
        subtotal: total,
        shipping: 0,
        total: total,
        notes: `Crypto payment - ${pay_currency.toUpperCase()}`,
      },
    });

    // Create payment with NOWPayments
    let paymentResponse;
    try {
      paymentResponse = await createPayment({
        price_amount: total,
        price_currency: 'usd',
        pay_currency: pay_currency.toLowerCase(),
        order_id: order.reference,
        order_description: `Order ${order.reference}`,
        ipn_callback_url: `${SITE.url}/api/webhooks/nowpayments`,
        success_url: `${SITE.url}/checkout/success?order=${order.reference}`,
        cancel_url: `${SITE.url}/checkout/cancelled?order=${order.reference}`,
      });
    } catch (paymentError) {
      // Log the error but still return the order details so customer can try again
      console.error(`[Crypto Checkout] Payment creation failed for order ${order.reference}:`, paymentError);
      return NextResponse.json(
        {
          error: paymentError instanceof Error ? paymentError.message : 'Payment creation failed',
          order_reference: order.reference,
          order_id: order.id,
        },
        { status: 400 }
      );
    }

    // Store the payment ID in the order for reference
    await prisma.order.update({
      where: { id: order.id },
      data: {
        notes: `${order.notes} | Payment ID: ${paymentResponse.id}`,
      },
    });

    console.log(`[Crypto Checkout] Created order ${order.reference} with payment ID ${paymentResponse.id}`);
    console.log('[Crypto Checkout] Payment response:', JSON.stringify(paymentResponse));

    // Validate payment response has required fields
    if (!paymentResponse.id) {
      console.error('[Crypto Checkout] Payment response missing id field:', JSON.stringify(paymentResponse));
      throw new Error(`NOWPayments response missing id field. Response: ${JSON.stringify(paymentResponse)}`);
    }

    // NOWPayments should return payment_url, but if not, construct it from payment ID
    let paymentUrl = (paymentResponse as any).payment_url;
    if (!paymentUrl) {
      // Fallback: construct payment URL from payment ID
      paymentUrl = `https://nowpayments.io/payment/${paymentResponse.id}`;
      console.log(`[Crypto Checkout] Constructed payment URL from ID: ${paymentUrl}`);
    }

    return NextResponse.json({
      success: true,
      order_id: order.id,
      order_reference: order.reference,
      payment_url: paymentUrl,
      pay_amount: paymentResponse.pay_amount,
      pay_currency: paymentResponse.pay_currency,
    });
  } catch (error) {
    console.error('[Crypto Checkout] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create payment' },
      { status: 500 }
    );
  }
}
