import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { expireUnpaidOrdersSafe } from '@/lib/orders/payment-expiry';
import { CRYPTO_DETECTED_EVENT } from '@/lib/orders/payment-deadline';

export const dynamic = 'force-dynamic';

/*
  Polled by the payment page every few seconds. Answers only the status, the total and whether
  NOWPayments has seen the coins arrive — nothing about the customer. Each poll also applies the
  90-minute expiry to this one order (lib/orders/payment-expiry.ts), so an open page turns to
  "cancelled" when the time is up rather than whenever an admin next looks.
*/
export async function GET(
  request: NextRequest,
  { params }: { params: { reference: string } }
) {
  try {
    const orderReference = params.reference;

    if (!orderReference) {
      return NextResponse.json(
        { error: 'Order reference required' },
        { status: 400 }
      );
    }

    await expireUnpaidOrdersSafe({ reference: orderReference });

    const order = await prisma.order.findUnique({
      where: { reference: orderReference },
      select: {
        status: true,
        total: true,
        createdAt: true,
        events: { where: { summary: CRYPTO_DETECTED_EVENT }, select: { id: true }, take: 1 },
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        status: order.status,
        total: order.total,
        createdAt: order.createdAt,
        paymentDetected: order.events.length > 0,
      },
      { headers: { 'cache-control': 'private, no-store' } }
    );
  } catch (error) {
    console.error('[Order Status] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch order status' }, { status: 500 });
  }
}
