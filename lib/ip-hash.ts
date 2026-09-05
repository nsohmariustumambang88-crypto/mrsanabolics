import 'server-only';

import { createHash } from 'node:crypto';

/*
  One definition of "record where this came from without storing where it came from".

  Both the marketing consent record and the CRM enquiry keep evidence of origin. They must
  hash identically or the same visitor appears as two different people, so this lives in one
  file rather than being written twice.

  No salt, no hash. A hardcoded fallback would be worse than nothing: an unsalted SHA-256 of
  an IPv4 address is trivially reversed by hashing all four billion of them, so it would look
  like protection while being plaintext.
*/
export function hashIp(ip: string | null | undefined): string | null {
  const salt = process.env.SUBSCRIBER_IP_SALT;
  if (!ip || !salt) return null;
  return createHash('sha256').update(salt).update(ip).digest('hex');
}

/** The first hop in X-Forwarded-For is the client; the rest are proxies that appended themselves. */
export function clientIp(request: Request): string | null {
  const forwarded = request.headers.get('x-forwarded-for');
  return forwarded?.split(',')[0].trim() || null;
}
