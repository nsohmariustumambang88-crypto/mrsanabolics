import { NextResponse, type NextRequest } from 'next/server';
import { expireUnpaidOrders } from '@/lib/orders/payment-expiry';

/*
  The daily backstop for the 90-minute payment window (lib/orders/payment-expiry.ts): cancels
  any order whose time ran out while nobody opened its payment page or the admin. Called by
  Vercel Cron (vercel.json). FAILS CLOSED: with no CRON_SECRET on the project it refuses every
  call. The pages that show orders run the same sweep themselves, so this is a backstop only.
*/

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ ok: false, error: 'CRON_SECRET is not set on this deployment.' }, { status: 503 });
  }
  if (request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: 'Unauthorised.' }, { status: 401 });
  }
  try {
    const cancelled = await expireUnpaidOrders();
    return NextResponse.json({ ok: true, cancelled });
  } catch (error) {
    console.error('[cron payment-deadlines] failed:', error);
    return NextResponse.json({ ok: false, error: 'The run failed; see the logs.' }, { status: 500 });
  }
}
