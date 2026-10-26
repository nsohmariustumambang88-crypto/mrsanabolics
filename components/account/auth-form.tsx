'use client';

import * as React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Mail, Lock, User, ArrowRight, Info } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { MarbleBath } from '@/components/ebru/marble-bath';
import { BullMark } from '@/components/brand/bull-mark';

type Mode = 'login' | 'register' | 'forgot';

/*
  Sign in, and open an account.

  These are REAL: they post to /api/account/*, which writes a Customer row, hashes the password
  with bcrypt and sets an HttpOnly session cookie.

  FORGOT PASSWORD posts to /api/account/forgot, which emails a single-use link to /auth/reset
  (lib/account/password-reset.ts). The answer is the same sentence for every address, so the
  form says "if there is an account" and never confirms one exists.

  On success the browser does a full navigation rather than a client-side push. The session
  arrives as a Set-Cookie, and every server component that reads it has to run again — a
  router.push would re-use the RSC payload that was rendered for an anonymous visitor, and the
  header would still say "Sign in" to somebody who just signed in.
*/

const COPY: Record<Mode, { title: string; body: string; action: string }> = {
  login: {
    title: 'Welcome back',
    body: 'Sign in for your orders, saved compounds, and batch certificates.',
    action: 'Sign in',
  },
  register: {
    title: 'Open an account',
    body: 'Faster checkout, order history, and release notes for the batches you buy.',
    action: 'Create account',
  },
  forgot: {
    title: 'Reset your password',
    body: 'Enter the address on your account and we will send a reset link.',
    action: 'Send reset link',
  },
};

export function AuthForm() {
  const params = useSearchParams();
  const [mode, setMode] = React.useState<Mode>(() => {
    const asked = params.get('mode');
    return asked === 'register' || asked === 'forgot' ? asked : 'login';
  });
  const [values, setValues] = React.useState({ name: '', email: '', password: '' });
  /* Honeypot: hidden from people, filled by bots. Never read by a human. */
  const [company, setCompany] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  /* The forgot-password answer, once sent. Same sentence whatever the address was. */
  const [sent, setSent] = React.useState<string | null>(null);

  const copy = COPY[mode];
  const set = (key: keyof typeof values) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setValues((v) => ({ ...v, [key]: e.target.value }));

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
    setSent(null);
  };

  async function requestReset() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch('/api/account/forgot', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: values.email, company }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string; message?: string };
      if (!response.ok) setError(data.error ?? 'That did not work. Try again.');
      else setSent(data.message ?? 'If there is an account with that address, we have sent it a reset link.');
    } catch {
      setError('We could not reach the server. Check your connection and try again.');
    }
    setBusy(false);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (mode === 'forgot') {
      await requestReset();
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const response = await fetch(`/api/account/${mode}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(
          mode === 'register'
            ? { name: values.name, email: values.email, password: values.password, company }
            : { email: values.email, password: values.password }
        ),
      });

      const data = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        setError(data.error ?? 'That did not work. Try again.');
        setBusy(false);
        return;
      }

      /* A real navigation, so the server re-reads the new cookie. See the note above. */
      const next = params.get('next');
      window.location.assign(next && next.startsWith('/') ? next : '/account');
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
            <span className="font-display text-lg font-semibold tracking-[-0.03em]">
              MrsAnabolics
            </span>
          </Link>

          <h1 className="mt-8 font-display text-3xl font-semibold tracking-[-0.035em] sm:mt-10">
            {copy.title}
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-ink-soft">{copy.body}</p>

          {mode === 'forgot' && sent && (
            <div role="status" className="mt-6 border border-pigment-verdigris/40 bg-paper-sunk p-4 text-sm leading-relaxed">
              <p className="flex gap-2.5 text-ink">
                <Mail className="mt-0.5 h-4 w-4 shrink-0 text-pigment-verdigris" strokeWidth={1.75} />
                <span>{sent}</span>
              </p>
              <p className="mt-3 text-xs text-ink-soft">
                Nothing after ten minutes? You may have checked out without opening an account, in
                which case there is no password to reset:{' '}
                <button
                  type="button"
                  onClick={() => switchMode('register')}
                  className="underline underline-offset-4"
                >
                  open one with the same address
                </button>{' '}
                and your past orders will appear in it. Still stuck?{' '}
                <Link href="/contact" className="underline underline-offset-4">
                  Write to support
                </Link>
                .
              </p>
            </div>
          )}

          {mode === 'forgot' && !sent && (
            <p className="mt-6 flex gap-2.5 border border-rule bg-paper-sunk p-3.5 text-xs leading-relaxed text-ink-soft">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-pigment-indigo" strokeWidth={1.75} />
              <span>The link works once and expires after 60 minutes.</span>
            </p>
          )}

          {error && (
            <p
              role="alert"
              className="mt-6 border border-pigment-madder/40 bg-paper-sunk p-3.5 text-xs leading-relaxed text-pigment-madder"
            >
              {error}
            </p>
          )}

          <form onSubmit={submit} className="mt-8 space-y-5">
            {mode === 'register' && (
              <Field
                id="name"
                label="Full name"
                type="text"
                placeholder="Alex Rivera"
                icon={User}
                value={values.name}
                onChange={set('name')}
                autoComplete="name"
                required={false}
              />
            )}

            <Field
              id="email"
              label="Email"
              type="email"
              placeholder="you@domain.com"
              icon={Mail}
              value={values.email}
              onChange={set('email')}
              autoComplete="email"
            />

            {mode !== 'forgot' && (
              <Field
                id="password"
                label="Password"
                type="password"
                placeholder="At least 10 characters"
                icon={Lock}
                value={values.password}
                onChange={set('password')}
                autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
              />
            )}

            {(mode === 'register' || mode === 'forgot') && (
              <div aria-hidden="true" className="pointer-events-none absolute left-[-9999px]">
                <label htmlFor="company">Company</label>
                <input
                  id="company"
                  name="company"
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                />
              </div>
            )}

            {mode === 'login' && (
              <div className="flex justify-end text-sm">
                <button
                  type="button"
                  onClick={() => switchMode('forgot')}
                  className="text-pigment-indigo underline underline-offset-4"
                >
                  Forgot password?
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="flex w-full items-center justify-center gap-2.5 rounded-full bg-pigment-indigo px-6 py-3.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-pigment-indigo-lift disabled:opacity-50"
            >
              {busy ? 'One moment…' : mode === 'forgot' && sent ? 'Send it again' : copy.action}
              {!busy && <ArrowRight className="h-4 w-4" strokeWidth={1.75} />}
            </button>

            {mode === 'register' && (
              <p className="text-xs leading-relaxed text-ink-faint">
                Opening an account does not sign you up for email. The newsletter is a separate,
                ticked box on the footer form.
              </p>
            )}
          </form>

          <p className="mt-8 border-t border-rule pt-6 text-sm text-ink-soft">
            {mode === 'login' && (
              <>
                No account yet?{' '}
                <button
                  onClick={() => switchMode('register')}
                  className="font-medium text-pigment-indigo underline underline-offset-4"
                >
                  Open one
                </button>
              </>
            )}
            {mode === 'register' && (
              <>
                Already registered?{' '}
                <button
                  onClick={() => switchMode('login')}
                  className="font-medium text-pigment-indigo underline underline-offset-4"
                >
                  Sign in
                </button>
              </>
            )}
            {mode === 'forgot' && (
              <button
                onClick={() => switchMode('login')}
                className="font-medium text-pigment-indigo underline underline-offset-4"
              >
                Back to sign in
              </button>
            )}
          </p>
        </div>
      </div>

      <div className="relative hidden overflow-hidden border-l border-rule lg:block">
        <MarbleBath className="absolute inset-0 h-full w-full" seed={904} density={0.8} />
      </div>
    </div>
  );
}

export function Field({
  id,
  label,
  type,
  placeholder,
  icon: Icon,
  value,
  onChange,
  autoComplete,
  required = true,
}: {
  id: string;
  label: string;
  type: string;
  placeholder: string;
  icon: LucideIcon;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  autoComplete: string;
  required?: boolean;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
      </label>
      <div className="relative mt-2 flex items-center border-b border-rule-strong focus-within:border-pigment-indigo">
        <Icon className="h-4 w-4 shrink-0 text-ink-faint" strokeWidth={1.6} />
        <input
          id={id}
          name={id}
          type={type}
          required={required}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className="w-full bg-transparent px-3 py-2.5 text-sm outline-none placeholder:text-ink-faint"
        />
      </div>
    </div>
  );
}
