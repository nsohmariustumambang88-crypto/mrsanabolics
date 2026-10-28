import { NextResponse, type NextRequest } from 'next/server';
import { restoreBasket } from '@/lib/basket';

/*
  The lines behind a reminder's "restore my basket" link, for /basket/restore to put back into
  the cart on whatever device opened it. Prices and stock are today's (lib/basket re-reads them);
  the token is single-purpose and expires RESTORE_DAYS after the reminder.
*/

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const lines = await restoreBasket(request.nextUrl.searchParams.get('token')).catch(() => null);
  if (!lines) {
    return NextResponse.json({ ok: false, items: [] }, { status: 404, headers: { 'cache-control': 'no-store' } });
  }
  return NextResponse.json({ ok: true, items: lines }, { headers: { 'cache-control': 'no-store' } });
}
