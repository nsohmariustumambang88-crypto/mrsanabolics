'use client';

import * as React from 'react';
import Link from 'next/link';
import { Mail, Lock, User, ArrowRight, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';

type Mode = 'login' | 'register' | 'forgot';

export default function AuthPage() {
  const [mode, setMode] = React.useState<Mode>('login');
  const [submitted, setSubmitted] = React.useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 2500);
  };

  const titles = {
    login: 'Welcome Back',
    register: 'Create Your Account',
    forgot: 'Reset Your Password',
  };
  const descriptions = {
    login: 'Sign in to access your dashboard, orders, and wishlist.',
    register: 'Join MrAnabolics for exclusive offers and faster checkout.',
    forgot: 'Enter your email and we will send you a reset link.',
  };

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-md flex-col justify-center px-4 py-16">
      <div className="text-center">
        <Link href="/" className="inline-flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-emerald-600">
            <span className="font-display text-xl font-extrabold text-black">M</span>
          </div>
        </Link>
        <h1 className="mt-6 font-display text-3xl font-bold tracking-tight">{titles[mode]}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{descriptions[mode]}</p>
      </div>

      <div className="mt-8 rounded-2xl border border-border/50 bg-card p-6">
        {submitted ? (
          <div className="flex flex-col items-center py-8 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent/10">
              <Check className="h-7 w-7 text-accent" />
            </div>
            <p className="mt-4 font-medium">
              {mode === 'forgot' ? 'Reset link sent!' : 'Success!'}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {mode === 'forgot'
                ? 'Check your inbox for password reset instructions.'
                : 'Redirecting to your dashboard...'}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <Label htmlFor="name">Full Name</Label>
                <div className="relative mt-1.5">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="name" className="pl-10" placeholder="John Doe" required />
                </div>
              </div>
            )}
            <div>
              <Label htmlFor="email">Email</Label>
              <div className="relative mt-1.5">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="email" type="email" className="pl-10" placeholder="your@email.com" required />
              </div>
            </div>
            {mode !== 'forgot' && (
              <div>
                <Label htmlFor="password">Password</Label>
                <div className="relative mt-1.5">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="password" type="password" className="pl-10" placeholder="••••••••" required />
                </div>
              </div>
            )}

            {mode === 'login' && (
              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 text-muted-foreground">
                  <input type="checkbox" className="accent-accent" />
                  Remember me
                </label>
                <button type="button" onClick={() => setMode('forgot')} className="text-accent hover:underline">
                  Forgot password?
                </button>
              </div>
            )}

            <Button type="submit" className="w-full gap-2 bg-accent text-black hover:bg-accent/90">
              {mode === 'login' && 'Sign In'}
              {mode === 'register' && 'Create Account'}
              {mode === 'forgot' && 'Send Reset Link'}
              <ArrowRight className="h-4 w-4" />
            </Button>

            {mode !== 'forgot' && (
              <>
                <div className="relative my-4">
                  <Separator />
                  <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-3 text-xs text-muted-foreground">
                    or
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Button type="button" variant="outline">Google</Button>
                  <Button type="button" variant="outline">Apple</Button>
                </div>
              </>
            )}
          </form>
        )}

        <div className="mt-6 text-center text-sm text-muted-foreground">
          {mode === 'login' && (
            <>
              Don&apos;t have an account?{' '}
              <button onClick={() => setMode('register')} className="font-medium text-accent hover:underline">
                Sign up
              </button>
            </>
          )}
          {mode === 'register' && (
            <>
              Already have an account?{' '}
              <button onClick={() => setMode('login')} className="font-medium text-accent hover:underline">
                Sign in
              </button>
            </>
          )}
          {mode === 'forgot' && (
            <button onClick={() => setMode('login')} className="font-medium text-accent hover:underline">
              Back to sign in
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
