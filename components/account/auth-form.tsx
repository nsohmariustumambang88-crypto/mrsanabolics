'use client';

import * as React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Mail, Lock, User, ArrowLeft, ArrowRight, Eye, EyeOff, Info } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { MarbleBath } from '@/components/ebru/marble-bath';
import { cn } from '@/lib/utils';

type Mode = 'login' | 'register' | 'forgot';

/*
  The look follows the reference store the owner chose (20–21 November 2026): one switch at the
  top for "Sign in / Create account", filled 48px fields with small bold labels, and a full-width
  ink button, all at the 4px radius the product cards use. The header already carries the bull
  and the name, so the form no longer repeats them; on a phone that repeat pushed the button
  below the fold.
*/

/** The primary button of the account forms (this one and the password reset). */
export const AUTH_BUTTON =
  'flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-ink px-6 text-sm font-bold text-paper transition-colors hover:bg-ink-soft disabled:opacity-50';

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
    body: 'Sign in for your orders and batch certificates.',
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
    <div className="grid lg:min-h-[calc(100vh-8rem)] lg:grid-cols-2">
      <div className="flex flex-col px-4 pb-12 pt-7 sm:px-6 sm:pt-14 lg:justify-center lg:px-16 lg:py-16">
        <div className="mx-auto w-full max-w-sm">
          {mode === 'forgot' ? (
            <button
              type="button"
              onClick={() => switchMode('login')}
              className="-ml-2 inline-flex h-10 items-center gap-1.5 rounded-lg px-2 text-sm font-bold transition-colors hover:bg-paper-sunk"
            >
              <ArrowLeft className="size-[1.125rem]" strokeWidth={2} />
              Back to sign in
            </button>
          ) : (
            /*
              The two ways in, as one switch at the top (the reference store's pattern), rather
              than a link at the foot of the form that a phone keyboard covers.
            */
            <div className="grid grid-cols-2 gap-1 rounded-lg bg-paper-sunk p-1" role="group" aria-label="Sign in or open an account">
              {(['login', 'register'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  aria-pressed={mode === m}
                  onClick={() => switchMode(m)}
                  className={cn(
                    'h-10 rounded-[3px] text-sm font-bold transition-colors',
                    mode === m ? 'bg-paper text-ink shadow-[0_1px_3px_hsl(var(--ink)/0.14)]' : 'text-ink-soft hover:text-ink'
                  )}
                >
                  {m === 'login' ? 'Sign in' : 'Create account'}
                </button>
              ))}
            </div>
          )}

          <h1 className="mt-7 font-display text-3xl font-semibold leading-[1.1] tracking-[-0.035em] sm:mt-9">
            {copy.title}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">{copy.body}</p>

          {mode === 'forgot' && sent && (
            <div role="status" className="mt-6 rounded-lg border border-pigment-verdigris/40 bg-paper-sunk p-4 text-sm leading-relaxed">
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
            <p className="mt-6 flex gap-2.5 rounded-lg bg-paper-sunk p-3.5 text-xs leading-relaxed text-ink-soft">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-pigment-indigo" strokeWidth={1.75} />
              <span>The link works once and expires after 60 minutes.</span>
            </p>
          )}

          {error && (
            <p
              role="alert"
              className="mt-6 rounded-lg border border-pigment-madder/40 bg-paper-sunk p-3.5 text-sm leading-relaxed text-pigment-madder"
            >
              {error}
            </p>
          )}

          <form onSubmit={submit} className="mt-7 space-y-4">
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

            {/*
              The email is the account's username. On sign-in it is marked `username`, which is
              what password managers look for to fill a saved login; on register and forgot it is
              `email`, so the browser offers the visitor's own address.
            */}
            <Field
              id="email"
              label="Email"
              type="email"
              placeholder="you@domain.com"
              icon={Mail}
              value={values.email}
              onChange={set('email')}
              autoComplete={mode === 'login' ? 'username' : 'email'}
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

            {/*
              The honeypot. Named and labelled "website" on purpose: browsers autofill a field
              called "Company" from the visitor's saved address (organisation), which would fill
              this silently and turn a real sign-up away as a bot. No browser autofills a website.
              It is still sent as `company`, the key the API routes check.
            */}
            {(mode === 'register' || mode === 'forgot') && (
              <div aria-hidden="true" className="pointer-events-none absolute left-[-9999px]">
                <label htmlFor="auth-website">Website</label>
                <input
                  id="auth-website"
                  name="website"
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                />
              </div>
            )}

            {mode === 'login' && (
              <div className="-mt-1 flex justify-end">
                <button
                  type="button"
                  onClick={() => switchMode('forgot')}
                  className="py-1 text-sm font-semibold text-ink-soft underline underline-offset-4 transition-colors hover:text-ink"
                >
                  Forgot password?
                </button>
              </div>
            )}

            <button type="submit" disabled={busy} className={cn(AUTH_BUTTON, 'mt-2')}>
              {busy ? 'One moment…' : mode === 'forgot' && sent ? 'Send it again' : copy.action}
              {!busy && <ArrowRight className="size-4" strokeWidth={2} />}
            </button>

            {mode === 'register' && (
              <p className="text-xs leading-relaxed text-ink-faint">
                Opening an account does not sign you up for email. The newsletter is a separate,
                ticked box on the footer form.
              </p>
            )}
          </form>
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
  const [shown, setShown] = React.useState(false);
  const isPassword = type === 'password';

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-xs font-bold text-ink-soft">
        {label}
      </label>
      <div className="flex h-12 items-center gap-2.5 rounded-lg border border-transparent bg-paper-sunk pl-3.5 pr-1.5 transition-colors focus-within:border-ink">
        <Icon className="size-[1.125rem] shrink-0 text-ink-faint" strokeWidth={1.75} aria-hidden="true" />
        <input
          id={id}
          name={id}
          type={isPassword && shown ? 'text' : type}
          inputMode={type === 'email' ? 'email' : undefined}
          /* Phones would otherwise capitalise the first letter of an address or a password. */
          autoCapitalize={type === 'email' || type === 'password' ? 'none' : undefined}
          spellCheck={type === 'email' || type === 'password' ? false : undefined}
          required={required}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
          /*
            16px, not 14: iPhones zoom the whole page into any field set smaller than 16px when
            it is tapped, and leave it zoomed after, which is the least app-like thing a form
            can do on a phone.
          */
          className="h-full min-w-0 flex-1 bg-transparent pr-2 text-base outline-none placeholder:text-ink-faint"
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShown((s) => !s)}
            aria-pressed={shown}
            aria-label={shown ? 'Hide password' : 'Show password'}
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-[3px] text-ink-soft transition-colors hover:bg-paper hover:text-ink"
          >
            {shown ? <EyeOff className="size-[1.125rem]" strokeWidth={1.75} /> : <Eye className="size-[1.125rem]" strokeWidth={1.75} />}
          </button>
        )}
      </div>
    </div>
  );
}
