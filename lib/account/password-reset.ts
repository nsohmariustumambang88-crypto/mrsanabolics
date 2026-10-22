import 'server-only';

import { createHash, randomBytes } from 'crypto';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth/password';
import { recordActivity } from '@/lib/crm/contacts';
import { sendPasswordChangedEmail, sendPasswordResetEmail } from '@/lib/email/resend';
import { SITE } from '@/lib/site';
import { checkCustomerPassword } from './accounts';

/*
  Forgot password: an emailed link that sets a new one.

  What it is built to hold, and why:

  - THE LINK CARRIES A RANDOM TOKEN, THE DATABASE ONLY ITS HASH. 32 random bytes in the link,
    SHA-256 of them on Customer.resetTokenHash. Somebody who reads the table — a backup file, a
    leaked dump — holds hashes that open nothing. The token alone identifies the account, so no
    email address travels in the URL (or into the browser history and server logs with it).
  - SHORT AND SINGLE-USE. It works for RESET_MINUTES and once: setting the password clears it, a
    new request replaces it, and changing the password from the account clears it too. The
    clearing write is conditional on the hash still being there, so two tabs submitting the same
    link cannot both win.
  - SETTING THE PASSWORD SIGNS OUT EVERY OTHER SESSION, by bumping sessionVersion exactly as a
    password change does. "Somebody is in my account" is the commonest reason to reset.
  - THE REQUEST NEVER SAYS WHETHER AN ACCOUNT EXISTS. The route answers one sentence for every
    address, the same membership-oracle rule /api/subscribe and sign-in keep. (Registration does
    reveal it — see accounts.ts — so this is consistency, not the only line of defence.)
  - A SECOND EMAIL CONFIRMS THE CHANGE, so an owner who did not ask for it finds out.

  The email address used is the account's own, never one supplied with the reset — the request
  names an address, and mail goes only to the stored address that matched it.
*/

export const RESET_MINUTES = 60;
/** One link per account per minute: a double-click, not a mailbox flood. */
const RESEND_COOLDOWN_MS = 60 * 1000;

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** 43 base64url characters from 32 bytes; anything else is not one of ours. */
function looksLikeToken(token: unknown): token is string {
  return typeof token === 'string' && /^[A-Za-z0-9_-]{43}$/.test(token);
}

/**
 * Issue a reset link for the account with this address, if there is one. Always resolves the
 * same way, so the caller cannot tell — and must not tell the visitor — which happened.
 */
export async function requestPasswordReset(rawEmail: string): Promise<void> {
  const email = rawEmail.trim().toLowerCase();
  if (!email.includes('@') || email.length > 254) return;

  const customer = await prisma.customer.findUnique({
    where: { email },
    select: { id: true, email: true, contactId: true, resetRequestedAt: true },
  });
  if (!customer) return;

  if (customer.resetRequestedAt && Date.now() - customer.resetRequestedAt.getTime() < RESEND_COOLDOWN_MS) {
    return;
  }

  const token = randomBytes(32).toString('base64url');
  const now = new Date();
  await prisma.customer.update({
    where: { id: customer.id },
    data: {
      resetTokenHash: hashToken(token),
      resetTokenExpiresAt: new Date(now.getTime() + RESET_MINUTES * 60 * 1000),
      resetRequestedAt: now,
    },
  });

  try {
    await sendPasswordResetEmail(customer.email, `${SITE.url}/auth/reset?token=${token}`, RESET_MINUTES);
  } catch (error) {
    /* Logged, never surfaced: the visitor gets the same answer either way. */
    console.error('[password reset] email failed:', error);
    return;
  }

  if (customer.contactId) {
    await recordActivity(prisma, {
      contactId: customer.contactId,
      type: 'DETAILS_UPDATED',
      summary: 'Asked for a password reset link.',
      detail: `Emailed to the account address; valid for ${RESET_MINUTES} minutes.`,
    }).catch(() => {});
  }
}

/** Whether a link is still good, so the page can say so before anybody types a password. */
export async function isResetTokenValid(token: unknown): Promise<boolean> {
  if (!looksLikeToken(token)) return false;
  const customer = await prisma.customer.findUnique({
    where: { resetTokenHash: hashToken(token) },
    select: { resetTokenExpiresAt: true },
  });
  return Boolean(customer?.resetTokenExpiresAt && customer.resetTokenExpiresAt > new Date());
}

export type ResetResult =
  | { ok: true; customer: { id: string; email: string }; sessionVersion: number }
  | { ok: false; error: string; expired?: boolean };

const EXPIRED = 'This reset link has expired or has already been used. Ask for a new one below.';

export async function resetPasswordWithToken(token: unknown, password: string): Promise<ResetResult> {
  if (!looksLikeToken(token)) return { ok: false, error: EXPIRED, expired: true };

  const tokenHash = hashToken(token);
  const customer = await prisma.customer.findUnique({
    where: { resetTokenHash: tokenHash },
    select: { id: true, email: true, contactId: true, resetTokenExpiresAt: true },
  });
  if (!customer || !customer.resetTokenExpiresAt || customer.resetTokenExpiresAt <= new Date()) {
    return { ok: false, error: EXPIRED, expired: true };
  }

  const problem = checkCustomerPassword(password);
  if (problem) return { ok: false, error: problem };

  /* Conditional on the hash still being there: the link is spent by whichever request lands first. */
  const spent = await prisma.customer.updateMany({
    where: { id: customer.id, resetTokenHash: tokenHash, resetTokenExpiresAt: { gt: new Date() } },
    data: {
      passwordHash: await hashPassword(password),
      sessionVersion: { increment: 1 },
      resetTokenHash: null,
      resetTokenExpiresAt: null,
    },
  });
  if (spent.count === 0) return { ok: false, error: EXPIRED, expired: true };

  const { sessionVersion } = await prisma.customer.findUniqueOrThrow({
    where: { id: customer.id },
    select: { sessionVersion: true },
  });

  await sendPasswordChangedEmail(customer.email, `${SITE.url}/auth`).catch((error) =>
    console.error('[password reset] confirmation email failed:', error)
  );

  if (customer.contactId) {
    await recordActivity(prisma, {
      contactId: customer.contactId,
      type: 'DETAILS_UPDATED',
      summary: 'Set a new password with a reset link.',
      detail: 'Every other signed-in session was signed out.',
    }).catch(() => {});
  }

  return { ok: true, customer: { id: customer.id, email: customer.email }, sessionVersion };
}
