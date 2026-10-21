import { NextResponse, type NextRequest } from 'next/server';
import { recordSearch } from '@/lib/analytics/track';

/*
  Log what somebody searched for, and how many products came back.

  This is the other half of /api/track: that route records where people went, this one records
  what they asked for. The second is worth more. A term that returned nothing is a customer
  telling you, in their own words, what they came for and could not find — it is the only
  analytics row that names a gap in the catalogue rather than describing traffic.

  It reads the same first-party `mra_vid` cookie the view tracker sets, and never creates one:
  a search from a browser that has not been seen yet is still worth recording, just unattached.
  No IP is read, stored or hashed here.

  Like /api/track this always answers 204 and never throws to the caller. A failed analytics
  write must never be the reason a search box appears broken.
*/

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const COOKIE = 'mra_vid';
const MAX_TERM = 200;

/* One term per browser per second is plenty; a search box fires on every keystroke. */
const lastSeen = new Map<string, number>();
const MIN_GAP_MS = 1000;

function tooSoon(key: string): boolean {
  const now = Date.now();
  const previous = lastSeen.get(key);
  if (previous && now - previous < MIN_GAP_MS) return true;
  lastSeen.set(key, now);

  /* The map is per-process and unbounded otherwise; drop anything stale on the way past. */
  if (lastSeen.size > 5000) {
    lastSeen.forEach((at, k) => {
      if (now - at > 60_000) lastSeen.delete(k);
    });
  }
  return false;
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get(COOKIE)?.value ?? '';

    const body = (await request.json().catch(() => null)) as
      | { term?: unknown; resultCount?: unknown }
      | null;
    if (!body) return new NextResponse(null, { status: 204 });

    const term = typeof body.term === 'string' ? body.term.trim().slice(0, MAX_TERM) : '';
    if (!term) return new NextResponse(null, { status: 204 });

    /*
      "{search_term_string}" is the placeholder in our WebSite JSON-LD search template. Crawlers
      open /shop?q={search_term_string} literally; nobody typed it, so it is not a search.
    */
    if (/[{}]/.test(term)) return new NextResponse(null, { status: 204 });

    const resultCount = Number(body.resultCount);
    if (!Number.isFinite(resultCount) || resultCount < 0) {
      return new NextResponse(null, { status: 204 });
    }

    if (tooSoon(`${token}:${term.toLowerCase()}`)) {
      return new NextResponse(null, { status: 204 });
    }

    await recordSearch({ token, term, resultCount: Math.floor(resultCount) });
  } catch {
    /* Swallowed on purpose. See the note at the top. */
  }

  return new NextResponse(null, { status: 204 });
}
