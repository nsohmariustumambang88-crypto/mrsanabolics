'use client';

import * as React from 'react';
import Link from 'next/link';
import { Lock, ArrowRight, Check } from 'lucide-react';
import { MarbleBath } from '@/components/ebru/marble-bath';
import { AUTH_BUTTON, Field } from '@/components/account/auth-form';
import { cn } from '@/lib/utils';

/*
  The page a reset email links to: choose a new password, then go straight into the account.

  The server page has already checked the link, so an expired or used one shows that state at
  once rather than after somebody has typed a password twice. The rules (ten characters, not an
  obvious password) are the server's — checkCustomerPassword — and its message is shown as given;
  the length hint here is a courtesy, not the control.

  On success the session cookie arrives with the response, so this does a full navigation to
  /account for the same reason the sign-in form does: a client push would reuse the anonymous
  render and the header would still say "Sign in".
*/

export function ResetPasswordForm({
  token,
  valid,
  email = null,
}: {
  token: string;
  valid: boolean;
  /** The account the link belongs to, for the hidden username field below. */
  email?: string | null;
}) {
  const [password, setPassword] = React.useState('');
  const [confirm, setConfirm] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [expired, setExpired] = React.useState(!valid);
  const [done, setDone] = React.useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError('The two passwords are not the same.');
      return;
    }
    setBusy(true);
    try {
      const response = await fetch('/api/account/reset', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string; expired?: boolean };
      if (!response.ok) {
        if (data.expired) setExpired(true);
        setError(data.error ?? 'That did not work. Try again.');
        setBusy(false);
        return;
      }
      setDone(true);
      window.location.assign('/account');
    } catch {
      setError('We could not reach the server. Check your connection and try again.');
      setBusy(false);
    }
  }

  return (
    <div className="grid lg:min-h-[calc(100vh-8rem)] lg:grid-cols-2">
      <div className="flex flex-col px-4 pb-12 pt-8 sm:px-6 sm:pt-14 lg:justify-center lg:px-16 lg:py-16">
        <div className="mx-auto w-full max-w-sm">
          {expired ? (
            <>
              <h1 className="font-display text-3xl font-semibold leading-[1.1] tracking-[-0.035em]">
                This link has expired
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                Reset links work once and for 60 minutes. Ask for a new one and use the newest email
                you receive.
              </p>
              <Link href="/auth?mode=forgot" className={cn(AUTH_BUTTON, 'mt-7')}>
                Send me a new link
                <ArrowRight className="size-4" strokeWidth={2} />
              </Link>
              <p className="mt-8 border-t border-rule pt-6 text-sm text-ink-soft">
                Remembered it?{' '}
                <Link href="/auth" className="font-medium text-pigment-indigo underline underline-offset-4">
                  Sign in
                </Link>
              </p>
            </>
          ) : (
            <>
              <h1 className="font-display text-3xl font-semibold leading-[1.1] tracking-[-0.035em]">
                Choose a new password
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                Use at least 10 characters. Once it is saved you will be signed in, and any other
                device signed in to your account will be signed out.
              </p>

              {error && (
                <p
                  role="alert"
                  className="mt-6 rounded-lg border border-pigment-madder/40 bg-paper-sunk p-3.5 text-sm leading-relaxed text-pigment-madder"
                >
                  {error}
                </p>
              )}

              {done ? (
                <p role="status" className="mt-8 flex items-center gap-2.5 text-sm text-pigment-verdigris">
                  <Check className="h-4 w-4" strokeWidth={2} />
                  Password saved. Taking you to your account…
                </p>
              ) : (
                <form onSubmit={submit} className="mt-7 space-y-4">
                  {/*
                    Which account this password is for. Password managers read a hidden
                    `username` field on a change-password form to update the right saved login
                    instead of saving a second one with no name.
                  */}
                  {email && (
                    <input
                      type="email"
                      name="username"
                      autoComplete="username"
                      value={email}
                      readOnly
                      hidden
                    />
                  )}
                  <Field
                    id="new-password"
                    label="New password"
                    type="password"
                    placeholder="At least 10 characters"
                    icon={Lock}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                  />
                  <Field
                    id="confirm-password"
                    label="Type it again"
                    type="password"
                    placeholder="The same password"
                    icon={Lock}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    autoComplete="new-password"
                  />
                  <button type="submit" disabled={busy} className={cn(AUTH_BUTTON, 'mt-2')}>
                    {busy ? 'One moment…' : 'Save password and sign in'}
                    {!busy && <ArrowRight className="size-4" strokeWidth={2} />}
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      </div>

      <div className="relative hidden overflow-hidden border-l border-rule lg:block">
        <MarbleBath className="absolute inset-0 h-full w-full" seed={904} density={0.8} />
      </div>
    </div>
  );
}
