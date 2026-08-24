import { SignJWT, jwtVerify } from 'jose';

/*
  Session tokens.

  Deliberately free of Node-only APIs so that middleware can verify a session at the edge.
  bcrypt cannot run there, which is why hashing lives in lib/auth/password.ts and never gets
  imported from this file.

  The session is a signed JWT in an HttpOnly cookie. HttpOnly means script on the page cannot
  read it, so an XSS bug cannot exfiltrate the session; SameSite=Lax means another origin
  cannot make the browser send it on a cross-site POST, which is the CSRF protection.

  A JWT is normally valid until it expires no matter what the server thinks, which makes a
  stolen cookie impossible to revoke. `ver` closes that: it carries the user's sessionVersion,
  the database row holds the current one, and a mismatch rejects the token. Changing a
  password bumps the number and every outstanding session dies.
*/

export const SESSION_COOKIE = 'mranabolics_admin';
const ISSUER = 'mranabolics';
const AUDIENCE = 'mranabolics:admin';

/** Seven days. Long enough to be usable, short enough that a leak is not permanent. */
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export type SessionPayload = {
  sub: string;
  email: string;
  ver: number;
};

function secretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      'AUTH_SECRET is missing or too short. Generate 32+ random bytes and set it in .env.'
    );
  }
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ email: payload.email, ver: payload.ver })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(payload.sub)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(secretKey());
}

/** Returns null for anything invalid — expired, tampered, wrong issuer — never throws. */
export async function readSessionToken(
  token: string | undefined
): Promise<SessionPayload | null> {
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, secretKey(), {
      issuer: ISSUER,
      audience: AUDIENCE,
    });

    if (!payload.sub || typeof payload.email !== 'string' || typeof payload.ver !== 'number') {
      return null;
    }

    return { sub: payload.sub, email: payload.email, ver: payload.ver };
  } catch {
    return null;
  }
}

/** Cookie attributes shared by the login and logout routes, so they cannot drift apart. */
export function sessionCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    /* Secure in production only: localhost is not https and the cookie would be dropped. */
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge,
  };
}
