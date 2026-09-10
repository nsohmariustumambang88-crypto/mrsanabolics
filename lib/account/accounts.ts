import 'server-only';

import { prisma } from '@/lib/prisma';
import { hashPassword, verifyPassword } from '@/lib/auth/password';
import { upsertContact, recordActivity } from '@/lib/crm/contacts';

/*
  Opening and using a storefront account.

  Three rules this module exists to keep, none of which are obvious from the outside:

  1. AN ACCOUNT IS NOT MARKETING CONSENT. Registering creates a Customer and links a Contact —
     it never writes a Subscriber. Somebody opening an account to track an order has agreed to
     nothing about email, and the only thing in this codebase that grants that is the ticked box
     on a form. `lib/crm/contacts.ts` has no "create and subscribe" helper for the same reason.

  2. SIGNING IN NEVER SAYS WHICH HALF WAS WRONG. "No account with that address" turns the form
     into a way to test who shops here — the same membership oracle /api/subscribe refuses to
     be. Both failures return one sentence, and the work done is the same either way so the
     timing does not leak it either.

  3. THE PASSWORD IS CHECKED SERVER-SIDE, ALWAYS. The form's own validation is a courtesy to
     the person typing; it is not a control.

  Registration DOES reveal that an address is already registered, which is a deliberate and
  narrower exception to (2). The alternative — accepting the sign-up and silently not creating
  an account — leaves somebody with a password that will never work and no way to find out why.
  Every service that hides this sends a "you already have an account" email instead, and this
  build sends no email. Rate limiting on the route is what keeps that from being an enumeration
  tool.
*/

export type AccountIdentity = {
  id: string;
  email: string;
  name: string | null;
};

export type RegisterResult =
  | { ok: true; customer: AccountIdentity }
  | { ok: false; error: string; field?: 'email' | 'password' | 'name' };

export type SignInResult =
  | { ok: true; customer: AccountIdentity; sessionVersion: number }
  | { ok: false; error: string };

const MIN_PASSWORD = 10;
const MAX_PASSWORD = 200;

/** One sentence for both halves of a failed sign-in. See rule 2. */
const SIGNIN_REFUSAL = 'That email address and password do not match an account.';

function normaliseEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

/**
 * Deliberately loose.
 *
 * Strict address validation rejects real addresses — quoted locals, new TLDs, plus-addressing
 * behind an over-eager regex — and catches almost no typos that matter. The real check is
 * whether mail arrives.
 */
function looksLikeEmail(value: string): boolean {
  return /^[^@\s]+@[^@\s.]+\.[^@\s]+$/.test(value) && value.length <= 254;
}

/**
 * The bar for a customer password.
 *
 * Lower than the admin's twelve characters, and the asymmetry is intentional: an administrator
 * can alter the catalogue and read the CRM, a customer can see their own orders. Length still
 * does the work — character-class rules mostly produce predictable substitutions.
 */
export function checkCustomerPassword(plain: string): string | null {
  if (plain.length < MIN_PASSWORD) return `Use at least ${MIN_PASSWORD} characters.`;
  if (plain.length > MAX_PASSWORD) return 'That is longer than 200 characters.';
  if (/^\s|\s$/.test(plain)) return 'Remove the leading or trailing space.';

  const lowered = plain.toLowerCase();
  const obvious = ['password', '12345678', 'qwertyui', 'letmein', 'iloveyou', 'mranabolics'];
  if (obvious.some((bad) => lowered.includes(bad))) {
    return 'That is one of the first passwords an attacker tries. Pick something else.';
  }
  return null;
}

export async function registerCustomer(input: {
  email: string;
  password: string;
  name?: string;
}): Promise<RegisterResult> {
  const email = normaliseEmail(input.email);
  const name = input.name?.trim().slice(0, 120) || null;

  if (!looksLikeEmail(email)) {
    return { ok: false, error: 'That does not look like an email address.', field: 'email' };
  }

  const problem = checkCustomerPassword(input.password);
  if (problem) return { ok: false, error: problem, field: 'password' };

  const existing = await prisma.customer.findUnique({ where: { email }, select: { id: true } });
  if (existing) {
    /* See the note at the top: narrower than rule 2, and rate limiting is the mitigation. */
    return {
      ok: false,
      error: 'There is already an account with that address. Sign in instead.',
      field: 'email',
    };
  }

  const passwordHash = await hashPassword(input.password);

  /*
    The person may already exist in the CRM — they wrote in, or an order was recorded for them.
    Link to that row rather than creating a second one, so their history and their account are
    the same person. `upsertContact` never touches the subscriber table.
  */
  const contact = await upsertContact(prisma, {
    email,
    name,
    firstSource: 'opened an account',
  });

  const customer = await prisma.customer.create({
    data: { email, name, passwordHash, contactId: contact.id },
    select: { id: true, email: true, name: true },
  });

  await recordActivity(prisma, {
    contactId: contact.id,
    type: 'ACCOUNT_CREATED',
    summary: 'Opened a storefront account.',
    detail: 'Registered through /auth. No marketing consent was given or implied by this.',
  }).catch(() => {
    /* The timeline is a convenience; failing to write it must not fail the registration. */
  });

  return { ok: true, customer };
}

export async function authenticateCustomer(input: {
  email: string;
  password: string;
}): Promise<SignInResult> {
  const email = normaliseEmail(input.email);

  const customer = await prisma.customer.findUnique({
    where: { email },
    select: { id: true, email: true, name: true, passwordHash: true, sessionVersion: true },
  });

  /*
    Hash against a dummy when the account does not exist, so a miss costs the same ~250ms as a
    wrong password. Returning early here is what turns a sign-in form into a timing oracle for
    which addresses are registered.
  */
  if (!customer) {
    await verifyPassword(input.password, '$2a$12$0000000000000000000000000000000000000000000000000000');
    return { ok: false, error: SIGNIN_REFUSAL };
  }

  const matches = await verifyPassword(input.password, customer.passwordHash);
  if (!matches) return { ok: false, error: SIGNIN_REFUSAL };

  await prisma.customer
    .update({ where: { id: customer.id }, data: { lastLoginAt: new Date() } })
    .catch(() => {
      /* A failed bookkeeping write must not refuse a valid sign-in. */
    });

  return {
    ok: true,
    customer: { id: customer.id, email: customer.email, name: customer.name },
    sessionVersion: customer.sessionVersion,
  };
}

/**
 * Change a password and invalidate every existing session.
 *
 * Bumping sessionVersion is the point: a password change that leaves old cookies working is not
 * a password change, and "someone is in my account" is exactly when this gets used.
 */
export async function changeCustomerPassword(
  customerId: string,
  currentPassword: string,
  nextPassword: string
): Promise<{ ok: true; sessionVersion: number } | { ok: false; error: string }> {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: { passwordHash: true, sessionVersion: true },
  });
  if (!customer) return { ok: false, error: 'That account no longer exists.' };

  if (!(await verifyPassword(currentPassword, customer.passwordHash))) {
    return { ok: false, error: 'Your current password is not right.' };
  }

  const problem = checkCustomerPassword(nextPassword);
  if (problem) return { ok: false, error: problem };

  const updated = await prisma.customer.update({
    where: { id: customerId },
    data: {
      passwordHash: await hashPassword(nextPassword),
      sessionVersion: { increment: 1 },
    },
    select: { sessionVersion: true },
  });

  return { ok: true, sessionVersion: updated.sessionVersion };
}
