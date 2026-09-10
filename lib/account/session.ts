import { SignJWT, jwtVerify } from 'jose';

/*
  Customer session tokens.

  A near-copy of lib/auth/session.ts, and the duplication is deliberate. The two systems differ
  in exactly the places that matter — a different cookie name and a different JWT **audience** —
  and those two constants are the entire boundary between a shopper and an administrator.

  Because `jwtVerify` is given an audience, a token minted here is REJECTED by the admin reader
  and vice versa: not merely unlikely to pass, but cryptographically refused. Sharing one module
  with a role field inside the payload would put that boundary behind a conditional, and a
  conditional is something a later refactor can get wrong. Two files cannot be got wrong.

  Everything else follows the admin module for the same reasons documented there: HttpOnly so a
  script on the page cannot read the cookie, SameSite=Lax so another origin cannot ride it, and
  `ver` carrying sessionVersion so a stolen cookie stays revocable.

  Node-only APIs are avoided so this can be read at the edge. bcrypt lives in lib/auth/password.ts
  and must never be imported from here.
*/

export const ACCOUNT_COOKIE = 'mranabolics_account';
const ISSUER = 'mranabolics';
/* The line that stops a customer token authenticating as an admin. Do not align these. */
const AUDIENCE = 'mranabolics:account';

/** Thirty days. A shop session is lower-risk than an admin one and re-login is friction. */
export const ACCOUNT_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export type AccountSession = {
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

export async function createAccountToken(payload: AccountSession): Promise<string> {
  return new SignJWT({ email: payload.email, ver: payload.ver })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(payload.sub)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${ACCOUNT_MAX_AGE_SECONDS}s`)
    .sign(secretKey());
}

/** Returns null for anything invalid — expired, tampered, wrong audience — never throws. */
export async function readAccountToken(
  token: string | undefined
): Promise<AccountSession | null> {
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

/** Shared by the sign-in and sign-out routes, so the attributes cannot drift apart. */
export function accountCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    /* Secure in production only: localhost is not https and the cookie would be dropped. */
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge,
  };
}
