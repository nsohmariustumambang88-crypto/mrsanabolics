import { getPaymentStatus } from '@/lib/crypto/nowpayments';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { paymentId: string } }
) {
  try {
    const paymentId = params.paymentId;

    if (!paymentId) {
      return NextResponse.json(
        { error: 'Payment ID required' },
        { status: 400 }
      );
    }

    // Get payment details from NOWPayments
    const paymentDetails = await getPaymentStatus(paymentId);

    return NextResponse.json(paymentDetails);
  } catch (error) {
    console.error('[Payment Status] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch payment status' },
      { status: 500 }
    );
  }
}
