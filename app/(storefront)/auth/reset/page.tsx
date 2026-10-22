import type { Metadata } from 'next';
import { ResetPasswordForm } from '@/components/account/reset-password-form';
import { isResetTokenValid } from '@/lib/account/password-reset';

/*
  Where a password reset email lands: /auth/reset?token=…

  The link is checked here, on the server, so an expired or already-used one says so before
  anybody types. `referrer: no-referrer` keeps the token out of the Referer header if the
  visitor follows any link off this page — a token in a URL travels wherever that URL is sent.
  Never indexed, and /auth is disallowed in robots.ts already.
*/

export const metadata: Metadata = {
  title: 'Reset your password',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};

export const dynamic = 'force-dynamic';

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: { token?: string };
}) {
  const token = typeof searchParams.token === 'string' ? searchParams.token : '';
  const valid = await isResetTokenValid(token).catch(() => false);
  return <ResetPasswordForm token={token} valid={valid} />;
}
