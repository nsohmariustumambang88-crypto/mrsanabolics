import { redirect } from 'next/navigation';
import { getCurrentAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { WpChrome } from '@/components/admin/wp-chrome';
import './../wp-admin.css';

/*
  The admin shell.

  Middleware already turned anonymous requests away at the edge, but that only proved the
  cookie's signature. This re-reads the account from Postgres, which is what catches a deleted
  user or a session invalidated by a password change. Middleware is the bouncer; this is the
  check at the till.

  Deliberately outside the storefront route group: no shop header, no cart drawer, and — more
  importantly — no dependency on the catalogue query, so the admin still loads when the
  storefront's data does not.

  The visual system here is wp-admin, not ebru. Every rule in wp-admin.css is scoped under the
  .wp-admin class applied below, so importing it cannot reach the storefront even though Next
  hoists layout CSS into the global sheet. That scope is load-bearing: the two systems define
  overlapping ideas (border, background, muted text) with incompatible values.
*/

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Admin',
  robots: { index: false, follow: false },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await getCurrentAdmin();
  if (!admin) redirect('/admin/login');

  /* The menu carries live counts, so a category with nothing in it is visibly empty rather
     than looking like a route that failed. */
  const [categories, pendingReviews, openEnquiries, openOrders] = await Promise.all([
    prisma.category.findMany({
      orderBy: { position: 'asc' },
      select: { slug: true, name: true, _count: { select: { products: true } } },
    }),
    /* Reviews awaiting a person, not all reviews — the bubble is a queue, not a total. */
    prisma.review.count({ where: { status: 'PENDING' } }),
    /* The menu bubble counts messages still waiting on a person, the way wp-admin counts
       comments awaiting moderation. */
    prisma.enquiry.count({ where: { status: { in: ['NEW', 'OPEN'] } } }),
    /* Orders still needing somebody to act, counted the same way. */
    prisma.order.count({ where: { status: { in: ['NEW', 'CONFIRMED', 'PACKED'] } } }),
  ]);

  return (
    <div className="wp-admin">
      <WpChrome
        email={admin.email}
        pendingReviews={pendingReviews}
        openEnquiries={openEnquiries}
        openOrders={openOrders}
        categories={categories.map((c) => ({
          slug: c.slug,
          name: c.name,
          listed: c._count.products,
        }))}
      />

      <div className="wp-content-area">
        <div className="wp-wrap">{children}</div>
      </div>
    </div>
  );
}
