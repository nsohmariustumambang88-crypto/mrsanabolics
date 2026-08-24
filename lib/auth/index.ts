import 'server-only';

import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { readSessionToken, SESSION_COOKIE } from './session';

/*
  Who is signed in, according to the database.

  Middleware only proves a cookie's signature is intact — it cannot reach Postgres from the
  edge. That is enough to keep anonymous traffic out of /admin, but it is not enough to act
  on: the account may have been deleted, or its sessionVersion bumped by a password change
  since the token was issued.

  So every admin page and every mutation calls requireAdmin(), which re-reads the row and
  compares versions. Middleware is the bouncer; this is the check at the till.
*/

export type AdminIdentity = {
  id: string;
  email: string;
  name: string | null;
};

export async function getCurrentAdmin(): Promise<AdminIdentity | null> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  const session = await readSessionToken(token);
  if (!session) return null;

  const user = await prisma.adminUser.findUnique({
    where: { id: session.sub },
    select: { id: true, email: true, name: true, sessionVersion: true },
  });

  if (!user) return null;
  /* The token was issued before a password change or a forced sign-out. */
  if (user.sessionVersion !== session.ver) return null;

  return { id: user.id, email: user.email, name: user.name };
}

/**
 * For pages and actions that must not run for anonymous callers.
 *
 * Throws rather than returning null so a forgotten check cannot silently fall through to a
 * mutation — the caller has to handle it, and the admin layout redirects.
 */
export async function requireAdmin(): Promise<AdminIdentity> {
  const admin = await getCurrentAdmin();
  if (!admin) throw new Error('UNAUTHORISED');
  return admin;
}

export async function isAdminSignedIn(): Promise<boolean> {
  return (await getCurrentAdmin()) !== null;
}

export { SESSION_COOKIE };
