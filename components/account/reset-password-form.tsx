'use client';

import * as React from 'react';
import Link from 'next/link';
import { Lock, ArrowRight, Check } from 'lucide-react';
import { MarbleBath } from '@/components/ebru/marble-bath';
import { BullMark } from '@/components/brand/bull-mark';
import { Field } from '@/components/account/auth-form';

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

export function ResetPasswordForm({ token, valid }: { token: string; valid: boolean }) {
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
    <div className="grid min-h-[calc(100vh-8rem)] lg:grid-cols-2">
      <div className="flex flex-col justify-center px-4 py-12 sm:px-6 sm:py-16 lg:px-16">
        <div className="mx-auto w-full max-w-sm">
          <Link href="/" className="inline-flex items-center gap-3">
            <BullMark className="w-20 shrink-0" />
            <span className="font-display text-lg font-semibold tracking-[-0.03em]">MrAnabolics</span>
          </Link>

          {expired ? (
            <>
              <h1 className="mt-8 font-display text-3xl font-semibold tracking-[-0.035em] sm:mt-10">
                This link has expired
              </h1>
              <p className="mt-3 text-sm leading-relaxed text-ink-soft">
                Reset links work once and for 60 minutes. Ask for a new one and use the newest email
                you receive.
              </p>
              <Link
                href="/auth?mode=forgot"
                className="mt-8 flex w-full items-center justify-center gap-2.5 rounded-full bg-pigment-indigo px-6 py-3.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-pigment-indigo-lift"
              >
                Send me a new link
                <ArrowRight className="h-4 w-4" strokeWidth={1.75} />
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
              <h1 className="mt-8 font-display text-3xl font-semibold tracking-[-0.035em] sm:mt-10">
                Choose a new password
              </h1>
              <p className="mt-3 text-sm leading-relaxed text-ink-soft">
                Use at least 10 characters. Once it is saved you will be signed in, and any other
                device signed in to your account will be signed out.
              </p>

              {error && (
                <p
                  role="alert"
                  className="mt-6 border border-pigment-madder/40 bg-paper-sunk p-3.5 text-xs leading-relaxed text-pigment-madder"
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
                <form onSubmit={submit} className="mt-8 space-y-5">
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
                  <button
                    type="submit"
                    disabled={busy}
                    className="flex w-full items-center justify-center gap-2.5 rounded-full bg-pigment-indigo px-6 py-3.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-pigment-indigo-lift disabled:opacity-50"
                  >
                    {busy ? 'One moment…' : 'Save password and sign in'}
                    {!busy && <ArrowRight className="h-4 w-4" strokeWidth={1.75} />}
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
