import Link from 'next/link';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { WpSubsubsub } from '@/components/admin/wp-ui';
import { WpScreenMeta } from '@/components/admin/wp-notice';
import { OrdersTable, type OrderRow } from '@/components/admin/orders-table';

/*
  The order queue.

  Defaults to the work rather than the archive: "Open" first, meaning anything that still needs
  somebody to act. That is the same choice the enquiries screen makes, for the same reason.

  Nothing on this screen concerns payment. See the note on the Order model — this build does not
  collect money, so there is no paid/unpaid state to show and no total-received figure to sum.
*/

export const dynamic = 'force-dynamic';

type Params = { q?: string; filter?: string };

const TABS = [
  { key: 'open', label: 'Open' },
  { key: 'all', label: 'All' },
  { key: 'new', label: 'New' },
  { key: 'shipped', label: 'Shipped' },
  { key: 'delivered', label: 'Delivered' },
  { key: 'cancelled', label: 'Cancelled' },
] as const;

function filterWhere(filter?: string): Prisma.OrderWhereInput {
  switch (filter) {
    case 'open':
      return { status: { in: ['NEW', 'CONFIRMED', 'PACKED'] } };
    case 'new':
      return { status: 'NEW' };
    case 'shipped':
      return { status: 'SHIPPED' };
    case 'delivered':
      return { status: 'DELIVERED' };
    case 'cancelled':
      return { status: 'CANCELLED' };
    default:
      return {};
  }
}

export default async function AdminOrdersPage({ searchParams }: { searchParams: Params }) {
  await requireAdmin();

  const activeTab = searchParams.filter ?? 'open';
  const q = searchParams.q?.trim();

  const where: Prisma.OrderWhereInput = { ...filterWhere(activeTab) };
  if (q) {
    where.OR = [
      { reference: { contains: q, mode: 'insensitive' } },
      { shipName: { contains: q, mode: 'insensitive' } },
      { contact: { email: { contains: q, mode: 'insensitive' } } },
      { contact: { name: { contains: q, mode: 'insensitive' } } },
    ];
  }

  const [rows, counts] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 300,
      include: {
        contact: { select: { id: true, name: true, email: true } },
        _count: { select: { items: true } },
      },
    }),
    Promise.all(TABS.map((t) => prisma.order.count({ where: filterWhere(t.key) }))),
  ]);

  const data: OrderRow[] = rows.map((o) => ({
    id: o.id,
    reference: o.reference,
    status: o.status,
    contactId: o.contact.id,
    contactName: o.contact.name ?? o.contact.email,
    contactEmail: o.contact.email,
    itemCount: o._count.items,
    total: o.total.toString(),
    shipCity: o.shipCity,
    shipCountry: o.shipCountry,
    createdAt: o.createdAt.toISOString(),
  }));

  const href = (patch: Partial<Params>) => {
    const next = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...searchParams, ...patch })) {
      if (v) next.set(k, String(v));
    }
    const qs = next.toString();
    return qs ? `/admin/orders?${qs}` : '/admin/orders';
  };

  return (
    <>
      <WpScreenMeta
        help={
          <div>
            <p className="mt-0">
              <strong>Orders are recorded here, not taken on the storefront.</strong> The public
              checkout cannot place one, because this build collects no payment. Add New records an
              order somebody placed another way — by phone, by email, in person.
            </p>
            <p>
              <strong>There is no paid/unpaid state anywhere in this system,</strong> deliberately.
              Nothing here observes money moving, so nothing here should claim it did.
            </p>
            <p className="mb-0">
              <strong>Confirmed, Shipped and Cancelled are stamped once,</strong> the first time an
              order reaches them. Moving an order back does not clear the stamp — how long
              something took is a fact.
            </p>
          </div>
        }
      />

      <h1 className="wp-heading-inline">Orders</h1>
      <Link href="/admin/orders/new" className="wp-page-title-action">
        Add New
      </Link>

      <hr className="my-2 border-0 border-t border-[#c3c4c7]" />

      <WpSubsubsub
        items={TABS.map((t, i) => ({
          href: href({ filter: t.key }),
          label: t.label,
          count: counts[i],
          current: activeTab === t.key,
        }))}
      />

      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <p className="wp-subtitle m-0">
          Showing {data.length}
          {data.length === 300 && ' (capped)'} — newest first.
        </p>

        <form method="get" action="/admin/orders" className="flex items-center gap-2">
          <input type="hidden" name="filter" value={activeTab} />
          <label className="wp-screen-reader-text" htmlFor="order-search">
            Search orders
          </label>
          <input
            id="order-search"
            name="q"
            defaultValue={searchParams.q ?? ''}
            placeholder="Reference, name or address"
            className="wp-input wp-input-search"
          />
          <button type="submit" className="wp-button">
            Search
          </button>
          {q && (
            <Link href={href({ q: undefined })} className="wp-button">
              Clear
            </Link>
          )}
        </form>
      </div>

      <OrdersTable rows={data} />
    </>
  );
}
