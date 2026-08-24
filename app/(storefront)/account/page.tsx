import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AccountView } from '@/components/account/account-view';

/* Disallowed in robots.ts; the meta tag says the same thing to crawlers that ignore it. */
export const metadata: Metadata = {
  title: 'Your account',
  robots: { index: false, follow: false },
};

export default function AccountPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <AccountView />
    </Suspense>
  );
}
