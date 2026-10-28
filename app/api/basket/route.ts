import { NextResponse, type NextRequest } from 'next/server';
import { saveBasket } from '@/lib/basket';

/*
  The browser's copy of its cart, saved against its analytics visitor (`mra_vid`).

  Called by the store provider a moment after the cart changes, and by the checkout when it
  opens (`checkout: true`). The body is product ids and quantities only; lib/basket prices them.
  Like /api/track it always answers 204 and never throws: saving a basket must never be the
  reason the cart or the checkout misbehaves. Rate limited per visitor, in memory.
*/

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const recent = new Map<string, number[]>();
const WINDOW_MS = 60 * 1000;
const MAX_PER_WINDOW = 30;

function rateLimited(key: string): boolean {
  const now = Date.now();
  const hits = (recent.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  hits.push(now);
  recent.set(key, hits);
  if (recent.size > 5000) {
    recent.forEach((times, k) => {
      if (times.every((t) => now - t > WINDOW_MS)) recent.delete(k);
    });
  }
  return hits.length > MAX_PER_WINDOW;
}

export async function POST(request: NextRequest) {
  const token = request.cookies.get('mra_vid')?.value;
  if (!token || rateLimited(token)) return new NextResponse(null, { status: 204 });
  try {
    const body = (await request.json().catch(() => null)) as { items?: unknown; checkout?: unknown } | null;
    if (body) await saveBasket(token, body.items, { checkout: body.checkout === true });
  } catch (error) {
    console.error('[basket] save failed:', error);
  }
  return new NextResponse(null, { status: 204 });
}
