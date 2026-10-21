import { getPaymentStatus } from '@/lib/crypto/nowpayments';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/*
  What the payment page needs to show, and nothing more: the amount, the coin, the address and the
  status. The caller must name the order the payment belongs to (`?order=MRA-…`), and the payment
  id must be the one recorded on that order — a bare payment id is not enough to read anything.
  NOWPayments' full record (order description, purchase id, timestamps, fees) never leaves here.
*/
export async function GET(
  request: NextRequest,
  { params }: { params: { paymentId: string } }
) {
  const paymentId = params.paymentId;
  const reference = request.nextUrl.searchParams.get('order');
  const notFound = NextResponse.json({ error: 'Payment not found' }, { status: 404 });

  if (!/^\d+$/.test(paymentId ?? '') || !reference) return notFound;

  try {
    const order = await prisma.order.findUnique({
      where: { reference },
      select: { notes: true },
    });
    if (order?.notes?.match(/Payment ID: (\d+)/)?.[1] !== paymentId) return notFound;

    const payment = await getPaymentStatus(paymentId);
    return NextResponse.json(
      {
        pay_amount: payment.pay_amount,
        pay_currency: payment.pay_currency,
        pay_address: (payment as { pay_address?: string }).pay_address ?? '',
        payment_status: payment.payment_status,
      },
      { headers: { 'cache-control': 'private, no-store' } }
    );
  } catch (error) {
    console.error('[Payment Status] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch payment status' }, { status: 500 });
  }
}
