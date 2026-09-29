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
    const supportedCurrencies = ['btc', 'usdt'];
    if (!supportedCurrencies.includes(pay_currency.toLowerCase())) {
      return NextResponse.json(
        { error: `Unsupported currency: ${pay_currency}. Supported: ${supportedCurrencies.join(', ')}` },
        { status: 400 }
      );
    }

    // Generate order number
    const orderNumber = `MRA-${Date.now().toString().slice(-8)}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

    // Create order in database with "pending" status
    const order = await prisma.order.create({
      data: {
        reference: orderNumber,
        status: 'PENDING',
        customerEmail: email,
        // Add other fields as needed based on your Order schema
        // items, subtotal, shipping, total, etc.
        notes: `Crypto payment - ${pay_currency.toUpperCase()}`,
      },
    });

    // Create payment with NOWPayments
    const paymentResponse = await createPayment({
      price_amount: total,
      price_currency: 'usd',
      pay_currency: pay_currency.toLowerCase(),
      order_id: order.reference,
      order_description: `Order ${order.reference}`,
      ipn_callback_url: `${SITE.url}/api/webhooks/nowpayments`,
      success_url: `${SITE.url}/checkout/success?order=${order.reference}`,
      cancel_url: `${SITE.url}/checkout/cancelled?order=${order.reference}`,
    });

    // Store the payment ID in the order for reference
    await prisma.order.update({
      where: { id: order.id },
      data: {
        notes: `${order.notes} | Payment ID: ${paymentResponse.id}`,
      },
    });

    console.log(`[Crypto Checkout] Created order ${order.reference} with payment ID ${paymentResponse.id}`);

    return NextResponse.json({
      success: true,
      order_id: order.id,
      order_reference: order.reference,
      payment_url: paymentResponse.payment_url,
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
