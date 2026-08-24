'use client';

import * as React from 'react';
import Link from 'next/link';
import { Mail, Lock, User, ArrowRight, Check, Info } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { MarbleBath } from '@/components/ebru/marble-bath';
import { DropMark } from '@/components/ebru/drop-mark';
import { cn } from '@/lib/utils';

type Mode = 'login' | 'register' | 'forgot';

/*
  Auth is not implemented — PRODUCT.md records this route as a UI mock, and Supabase is
  installed but unwired. The form therefore says so plainly instead of staging a fake success
  state that implies an account was created.
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

export default function AuthPage() {
  const [mode, setMode] = React.useState<Mode>('login');
  const [submitted, setSubmitted] = React.useState(false);
  const copy = COPY[mode];

  const switchMode = (next: Mode) => {
    setMode(next);
    setSubmitted(false);
  };

  return (
    <div className="grid min-h-[calc(100vh-8rem)] lg:grid-cols-2">
      <div className="flex flex-col justify-center px-4 py-12 sm:px-6 sm:py-16 lg:px-16">
        <div className="mx-auto w-full max-w-sm">
          <Link href="/" className="inline-flex items-center gap-3">
            <DropMark className="h-9 w-9" />
            <span className="font-display text-lg font-semibold tracking-[-0.03em]">
              MrAnabolics
            </span>
          </Link>

          <h1 className="mt-8 sm:mt-10 font-display text-3xl font-semibold tracking-[-0.035em]">
            {copy.title}
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-ink-soft">{copy.body}</p>

          <p className="mt-6 flex gap-2.5 border border-rule bg-paper-sunk p-3.5 text-xs leading-relaxed text-ink-soft">
            <Info
              className="mt-0.5 h-3.5 w-3.5 shrink-0 text-pigment-saffron"
              strokeWidth={1.75}
            />
            <span>
              Accounts are not connected on this demonstration build. The form validates and
              responds, but nothing is stored and no account is created.
            </span>
          </p>

          {submitted ? (
            <div className="mt-8 border border-rule bg-card p-6">
              <Check className="h-6 w-6 text-pigment-verdigris" strokeWidth={2} />
              <p className="mt-4 font-display text-base font-semibold tracking-[-0.02em]">
                Form accepted
              </p>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                In a connected build this would{' '}
                {mode === 'forgot'
                  ? 'send a reset link to that address.'
                  : mode === 'register'
                    ? 'create your account and sign you in.'
                    : 'sign you in and return you to where you were.'}
              </p>
              <button
                type="button"
                onClick={() => setSubmitted(false)}
                className="mt-5 text-sm text-pigment-indigo underline underline-offset-4"
              >
                Back to the form
              </button>
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setSubmitted(true);
              }}
              className="mt-8 space-y-5"
            >
              {mode === 'register' && (
                <Field
                  id="name"
                  label="Full name"
                  type="text"
                  placeholder="Alex Rivera"
                  icon={User}
                />
              )}
              <Field
                id="email"
                label="Email"
                type="email"
                placeholder="you@domain.com"
                icon={Mail}
              />
              {mode !== 'forgot' && (
                <Field
                  id="password"
                  label="Password"
                  type="password"
                  placeholder="••••••••"
                  icon={Lock}
                />
              )}

              {mode === 'login' && (
                <div className="flex items-center justify-between text-sm">
                  <label className="flex items-center gap-2 text-ink-soft">
                    <input type="checkbox" className="accent-pigment-indigo" />
                    Keep me signed in
                  </label>
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
                className="group flex w-full items-center justify-center gap-2.5 rounded-full bg-pigment-indigo px-6 py-3.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-pigment-indigo-lift"
              >
                {copy.action}
                <ArrowRight
                  className="h-4 w-4"
                  strokeWidth={1.75}
                />
              </button>
            </form>
          )}

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

function Field({
  id,
  label,
  type,
  placeholder,
  icon: Icon,
}: {
  id: string;
  label: string;
  type: string;
  placeholder: string;
  icon: LucideIcon;
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
          required
          placeholder={placeholder}
          autoComplete={
            id === 'email' ? 'email' : id === 'password' ? 'current-password' : 'name'
          }
          className={cn(
          'w-full bg-transparent px-3 py-2.5 text-sm outline-none placeholder:text-ink-faint'
          )}
        />
      </div>
    </div>
  );
}
