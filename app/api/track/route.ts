import { NextResponse, type NextRequest } from 'next/server';
import {
  isVisitorToken,
  newVisitorToken,
  normaliseCountry,
  recordView,
} from '@/lib/analytics/track';

/*
  The visit beacon.

  Three rules shape this file, and all three are about what it refuses to do.

  1. It never stores an IP. Country comes only from an edge header the CDN has already derived
     — x-vercel-ip-country, x-nf-geo, cf-ipcountry — and the address itself is not read, not
     hashed and not passed on. lib/ip-hash.ts exists for consent evidence; analytics does not
     get to borrow it.

  2. It reduces the referrer to a hostname before anything is written. A full referrer URL
     carries the previous page's query string, and that is somebody else's data — their search
     terms, their tracking parameters — arriving in our table by accident.

  3. It always answers 204 and never throws to the client. A page view is the least important
     write on this site; if the database is asleep or the settings read fails, the correct
     outcome is a missing row, never a console error on a customer's screen or a retry storm.

  Node runtime: the token comes from node:crypto and the write goes through Prisma.
*/

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const COOKIE = 'mra_vid';
const YEAR_SECONDS = 60 * 60 * 24 * 365;

/*
  Rate limited per token rather than per IP, because the IP is the thing this route has decided
  not to look at. A token is trivially rotated by whoever wants to, so this is not a security
  control — it is a cap on how much one open tab can write, which is the failure it is actually
  guarding against.
*/
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 40;
const hits = new Map<string, { count: number; first: number }>();

function rateLimited(key: string): boolean {
  const now = Date.now();

  /* Unlike the consent routes, this one is hit on every page of every session, so the map is
     swept rather than left to grow for the lifetime of the process. */
  if (hits.size > 5000) {
    /* Array.from rather than iterating the Map directly: tsconfig targets ES5 here, where a
       Map is not iterable without --downlevelIteration. */
    for (const [k, v] of Array.from(hits.entries())) {
      if (now - v.first > WINDOW_MS) hits.delete(k);
    }
  }

  const entry = hits.get(key);
  if (!entry || now - entry.first > WINDOW_MS) {
    hits.set(key, { count: 1, first: now });
    return false;
  }

  entry.count += 1;
  return entry.count > MAX_PER_WINDOW;
}

/*
  Netlify sends x-nf-geo as JSON, usually base64-encoded; Vercel and Cloudflare send a bare
  two-letter code. Whichever is present, only the country code is taken — the same header on
  Netlify also carries city and coordinates, and this build has no use for either.
*/
function countryFrom(request: NextRequest): string | null {
  const vercel = normaliseCountry(request.headers.get('x-vercel-ip-country'));
  if (vercel) return vercel;

  const netlify = request.headers.get('x-nf-geo');
  if (netlify) {
    for (const candidate of [netlify, safeAtob(netlify)]) {
      if (!candidate) continue;
      try {
        const parsed = JSON.parse(candidate) as { country?: { code?: string } };
        const code = normaliseCountry(parsed?.country?.code);
        if (code) return code;
      } catch {
        /* Not JSON in this shape. Fall through to the next source. */
      }
    }
  }

  return normaliseCountry(request.headers.get('cf-ipcountry'));
}

function safeAtob(value: string): string | null {
  try {
    return Buffer.from(value, 'base64').toString('utf8');
  } catch {
    return null;
  }
}

/** Only same-site, absolute paths. A path is a key in a report, not a redirect target. */
function cleanPath(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const path = value.trim();
  if (!path.startsWith('/') || path.startsWith('//')) return null;
  /* Query strings are dropped: they are the visitor's own parameters, and the report groups
     by page, not by the filters somebody happened to have applied. */
  return path.split('?')[0].split('#')[0].slice(0, 512);
}

export async function POST(request: NextRequest) {
  /* One response object for every exit, so the cookie is set even on the paths that record
     nothing. Otherwise an admin's first page view is what mints their token. */
  const existing = request.cookies.get(COOKIE)?.value;
  const token = isVisitorToken(existing) ? existing : newVisitorToken();

  const response = new NextResponse(null, { status: 204 });
  response.cookies.set({
    name: COOKIE,
    value: token,
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: YEAR_SECONDS,
    secure: process.env.NODE_ENV === 'production',
  });

  try {
    if (rateLimited(token)) return response;

    const body = (await request.json().catch(() => null)) as {
      path?: unknown;
      referrer?: unknown;
    } | null;

    const path = cleanPath(body?.path);
    if (!path) return response;

    /* The admin is staff at work, and /api is machinery. Neither is site usage, and counting
       them would make every report a report about ourselves. */
    if (path === '/admin' || path.startsWith('/admin/') || path.startsWith('/api/')) {
      return response;
    }

    await recordView({
      token,
      path,
      referrer: typeof body?.referrer === 'string' ? body.referrer : null,
      country: countryFrom(request),
    });
  } catch (error) {
    /* Swallowed on purpose. See the header: a failed analytics write must not surface to a
       visitor, and must not tell a caller anything about the database either. */
    if (process.env.NODE_ENV === 'development') {
      console.error('track failed', error);
    }
  }

  return response;
}
