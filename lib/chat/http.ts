import 'server-only';

import type { NextResponse } from 'next/server';
import { asBoolean, getSettingsSafe } from '@/lib/settings';
import { isChatToken } from '@/lib/chat';
import { CHAT_COOKIE, CHAT_COOKIE_PATH } from '@/lib/chat/shared';

/*
  What the three public chat routes share: the cookie, the on/off switch and a rate limiter.

  The limiter is per server instance and in memory, like the one on /api/enquiry. It does not
  stop a determined attacker spread across instances; it stops a single connection turning a
  public write path into a spam relay or an API bill, which is the realistic abuse.
*/

export function chatTokenFrom(request: Request): string | null {
  const header = request.headers.get('cookie');
  if (!header) return null;
  for (const part of header.split(';')) {
    const [name, ...rest] = part.trim().split('=');
    if (name === CHAT_COOKIE) {
      const value = decodeURIComponent(rest.join('='));
      return isChatToken(value) ? value : null;
    }
  }
  return null;
}

/** httpOnly, so page script cannot read it; scoped to /api/chat, so pages never send it. */
export function setChatCookie(response: NextResponse, token: string): void {
  response.cookies.set(CHAT_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: CHAT_COOKIE_PATH,
    maxAge: 60 * 60 * 24 * 180,
  });
}

export async function chatEnabled(): Promise<boolean> {
  const settings = await getSettingsSafe();
  return asBoolean(settings.chat_enabled);
}

const buckets = new Map<string, Map<string, { count: number; first: number }>>();

/** True when `key` has used more than `max` hits in `windowMs` on the named bucket. */
export function overLimit(bucket: string, key: string, max: number, windowMs: number): boolean {
  let hits = buckets.get(bucket);
  if (!hits) {
    hits = new Map();
    buckets.set(bucket, hits);
  }
  const now = Date.now();
  const entry = hits.get(key);
  if (!entry || now - entry.first > windowMs) {
    hits.set(key, { count: 1, first: now });
    /* Keep the map from growing without bound on a long-lived instance. */
    if (hits.size > 5000) {
      for (const [k, v] of Array.from(hits)) if (now - v.first > windowMs) hits.delete(k);
    }
    return false;
  }
  entry.count += 1;
  return entry.count > max;
}

/** The page the chat was opened on, without its query string. */
export function cleanPath(raw: unknown): string | null {
  if (typeof raw !== 'string' || !raw.startsWith('/') || raw.startsWith('//')) return null;
  return raw.split(/[?#]/)[0].slice(0, 200);
}
