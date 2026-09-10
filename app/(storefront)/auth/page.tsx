import type { Metadata } from 'next';
import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { AuthForm } from '@/components/account/auth-form';
import { getCurrentCustomer } from '@/lib/account';

/*
  Sign in / open an account.

  A server page wrapping a client form, for the reason documented for /shop: the form reads
  `useSearchParams`, and in Next 13.5 that must sit inside a Suspense boundary or the route
  cannot be prerendered at all. Putting the boundary here keeps the shell static and lets the
  interactive half hydrate on its own.

  Somebody already signed in has no business on this page, so they are sent to their account
  rather than shown a form that would replace their session with the same one.
*/

export const metadata: Metadata = {
  title: 'Sign in',
  /* An account gateway has nothing for a crawler, and robots.ts already disallows it. */
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function AuthPage() {
  if (await getCurrentCustomer()) redirect('/account');

  return (
    <Suspense fallback={<div className="min-h-[calc(100vh-8rem)]" />}>
      <AuthForm />
    </Suspense>
  );
}
