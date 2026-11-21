import { NextResponse } from 'next/server';
import { weeklyOfferState } from '@/lib/offers/weekly-offer';
import { FRIDAY_PERCENT } from '@/lib/offers/friday';
import { MINIMUM_ORDER } from '@/lib/orders/minimum';

/*
  Is Friday 5% running right now? The server's answer: its clock and the kill switch.

  The banner and the cart ask only when the visitor's own clock says it is Friday, so a page
  cached on Thursday cannot show the offer and nothing is fetched on the other six days. The
  checkout always asks, because its total must match the one createOrder will store.

  Cached at the edge for at most a minute, and never past the next start or end of a window,
  so turning the switch off reaches every visitor within about a minute.
*/

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const now = new Date();
  const state = await weeklyOfferState(now);
  const boundary = new Date(state.active && state.endsAt ? state.endsAt : state.nextStartsAt).getTime();
  const maxAge = Math.max(0, Math.min(60, Math.floor((boundary - now.getTime()) / 1000)));

  return NextResponse.json(
    { ...state, percent: FRIDAY_PERCENT, minimum: MINIMUM_ORDER },
    {
      headers: {
        'cache-control': maxAge > 0 ? `public, max-age=0, s-maxage=${maxAge}` : 'no-store',
      },
    }
  );
}
