import type { Metadata } from 'next';
import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { AccountView, type AccountOrder } from '@/components/account/account-view';
import { getCurrentCustomer } from '@/lib/account';
import { prisma } from '@/lib/prisma';

/* Disallowed in robots.ts; the meta tag says the same thing to crawlers that ignore it. */
export const metadata: Metadata = {
  title: 'Your account',
  robots: { index: false, follow: false },
};

/*
  A person's own account.

  Reads the session on the server, so an anonymous visitor is redirected rather than shown a
  shell full of somebody's placeholder history. `next` carries them back here after signing in.

  Orders are found through the CRM Contact rather than through the Customer row, because that
  is where they actually hang: an order recorded by phone before this person opened an account
  is still theirs, and linking on the contact is what makes it appear. Registering upserts the
  contact by email, so the history joins up by itself.
*/

export const dynamic = 'force-dynamic';

export default async function AccountPage() {
  const customer = await getCurrentCustomer();
  if (!customer) redirect('/auth?next=/account');

  const orders: AccountOrder[] = customer.contactId
    ? await prisma.order
        .findMany({
          where: { contactId: customer.contactId },
          orderBy: { createdAt: 'desc' },
          take: 50,
          select: {
            id: true,
            reference: true,
            status: true,
            total: true,
            currency: true,
            createdAt: true,
            shipCity: true,
            shipCountry: true,
            _count: { select: { items: true } },
          },
        })
        .then((rows) =>
          rows.map((o) => ({
            id: o.id,
            reference: o.reference,
            status: o.status,
            total: o.total.toString(),
            currency: o.currency,
            placedAt: o.createdAt.toISOString(),
            destination: [o.shipCity, o.shipCountry].filter(Boolean).join(', '),
            itemCount: o._count.items,
          }))
        )
        .catch(() => [])
    : [];

  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <AccountView
        customer={{ email: customer.email, name: customer.name }}
        orders={orders}
      />
    </Suspense>
  );
}
