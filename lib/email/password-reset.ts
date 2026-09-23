import 'server-only';

import { createHash, randomBytes } from 'crypto';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth/password';
import { sendPasswordResetEmail } from './resend';

const RESET_TOKEN_EXPIRY_HOURS = 24;
const RESET_TOKEN_LENGTH = 32;

/**
 * Generate a password reset token and send email to customer
 */
export async function sendPasswordReset(email: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const contact = await prisma.contact.findUnique({
    where: { email },
    select: { id: true, name: true },
  });

  if (!contact) {
    /* Don't reveal whether email exists - security best practice */
    return { ok: true };
  }

  /* Generate secure random token */
  const token = randomBytes(RESET_TOKEN_LENGTH).toString('hex');
  const tokenHash = createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);

  /* Store token hash (never store plain tokens) */
  await prisma.contact.update({
    where: { id: contact.id },
    data: {
      passwordResetToken: tokenHash,
      passwordResetExpiresAt: expiresAt,
    },
  });

  /* Build reset link */
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mrsanabolics.com';
  const resetLink = `${baseUrl}/auth/reset-password?token=${token}&email=${encodeURIComponent(email)}`;

  try {
    await sendPasswordResetEmail(email, resetLink);
  } catch (error) {
    /* Email failed, but token is already generated. User can retry */
    console.error('Failed to send password reset email:', error);
  }

  return { ok: true };
}

/**
 * Verify password reset token and reset the password
 */
export async function resetPassword(
  email: string,
  token: string,
  newPassword: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!newPassword || newPassword.length < 8) {
    return { ok: false, error: 'Password must be at least 8 characters' };
  }

  const contact = await prisma.contact.findUnique({
    where: { email },
    select: {
      id: true,
      passwordResetToken: true,
      passwordResetExpiresAt: true,
    },
  });

  if (!contact || !contact.passwordResetToken) {
    return { ok: false, error: 'Invalid or expired password reset link' };
  }

  /* Check expiry */
  if (!contact.passwordResetExpiresAt || contact.passwordResetExpiresAt < new Date()) {
    return { ok: false, error: 'Password reset link has expired' };
  }

  /* Verify token (compare hashes) */
  const tokenHash = createHash('sha256').update(token).digest('hex');
  if (tokenHash !== contact.passwordResetToken) {
    return { ok: false, error: 'Invalid password reset link' };
  }

  /* Hash the new password */
  const passwordHash = await hashPassword(newPassword);

  /* Update password and clear reset token */
  await prisma.contact.update({
    where: { id: contact.id },
    data: {
      password: passwordHash,
      passwordResetToken: null,
      passwordResetExpiresAt: null,
    },
  });

  return { ok: true };
}
