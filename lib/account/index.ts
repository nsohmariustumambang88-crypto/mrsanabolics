import 'server-only';

import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { readAccountToken, ACCOUNT_COOKIE } from './session';

/*
  Who is signed in to the storefront, according to the database.

  The same two-step the admin uses, for the same reason: a valid signature only proves the
  cookie has not been tampered with. It cannot know that the account was deleted, or that the
  password was changed on another device since the token was minted. So the row is re-read and
  the versions compared on every request that acts on an identity.

  Note what is NOT here: no middleware guard. /account is a storefront page, and an anonymous
  visitor should see a sign-in prompt rather than be bounced at the edge — the admin bounces
  because there is nothing there for a stranger to see.
*/

export type CustomerIdentity = {
  id: string;
  email: string;
  name: string | null;
  contactId: string | null;
};

export async function getCurrentCustomer(): Promise<CustomerIdentity | null> {
  const token = cookies().get(ACCOUNT_COOKIE)?.value;
  const session = await readAccountToken(token);
  if (!session) return null;

  const customer = await prisma.customer
    .findUnique({
      where: { id: session.sub },
      select: { id: true, email: true, name: true, contactId: true, sessionVersion: true },
    })
    .catch(() => null);

  if (!customer) return null;
  /* Issued before a password change or a "sign out everywhere". */
  if (customer.sessionVersion !== session.ver) return null;

  return {
    id: customer.id,
    email: customer.email,
    name: customer.name,
    contactId: customer.contactId,
  };
}

/** For routes that must not run for anonymous callers. Throws so it cannot fall through. */
export async function requireCustomer(): Promise<CustomerIdentity> {
  const customer = await getCurrentCustomer();
  if (!customer) throw new Error('UNAUTHORISED');
  return customer;
}

export async function isCustomerSignedIn(): Promise<boolean> {
  return (await getCurrentCustomer()) !== null;
}

export { ACCOUNT_COOKIE };
