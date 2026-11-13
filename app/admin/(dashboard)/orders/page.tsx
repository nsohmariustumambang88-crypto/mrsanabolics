import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { WpSubsubsub } from '@/components/admin/wp-ui';
import { WpScreenMeta } from '@/components/admin/wp-notice';
import { OrdersTable, type OrderRow, type OrdersPager } from '@/components/admin/orders-table';
import { addressLines } from '@/lib/orders/address';
import { PAYMENT_METHOD_LABEL, paymentMethodFromNotes } from '@/lib/checkout/order-notes';

/*
  The order queue, with everything about each order on the first screen.

  Defaults to the work rather than the archive: "Open" first, meaning anything that still needs
  somebody to act. That is the same choice the enquiries screen makes, for the same reason.

  Each row carries the whole order — customer, delivery address, every line, the money, how it is
  being paid, whether a Cash App screenshot came in, and the notes — so a day's orders can be read
  and packed from this one screen (the owner's request, November 2026). The order screen is still
  one click away for the history, the screenshots themselves and the status picker.

  It stays one read: a page of orders with their lines, contact and screenshot count included,
  plus the counts. No query per row. Fifty to a page, because every row is now tall.
*/

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 50;

type Params = { q?: string; filter?: string; page?: string };

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

/* The stamp the order screen uses, so the two read the same. */
function stamp(date: Date): string {
  const iso = date.toISOString();
  return `${iso.slice(0, 10)} ${iso.slice(11, 16)}`;
}

export default async function AdminOrdersPage({ searchParams }: { searchParams: Params }) {
  await requireAdmin();

  const activeTab = searchParams.filter ?? 'open';
  const q = searchParams.q?.trim();
  const requestedPage = Math.max(1, Number.parseInt(searchParams.page ?? '1', 10) || 1);

  const where: Prisma.OrderWhereInput = { ...filterWhere(activeTab) };
  if (q) {
    where.OR = [
      { reference: { contains: q, mode: 'insensitive' } },
      { shipName: { contains: q, mode: 'insensitive' } },
      { shipPhone: { contains: q } },
      { shipLine1: { contains: q, mode: 'insensitive' } },
      { shipCity: { contains: q, mode: 'insensitive' } },
      { contact: { email: { contains: q, mode: 'insensitive' } } },
      { contact: { name: { contains: q, mode: 'insensitive' } } },
    ];
  }

  const [rows, matching, counts] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (requestedPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        contact: { select: { id: true, name: true, email: true, phone: true } },
        items: {
          orderBy: { createdAt: 'asc' },
          select: { id: true, name: true, quantity: true, unitPrice: true, lineTotal: true },
        },
        _count: { select: { paymentProofs: true } },
      },
    }),
    prisma.order.count({ where }),
    Promise.all(TABS.map((t) => prisma.order.count({ where: filterWhere(t.key) }))),
  ]);

  const data: OrderRow[] = rows.map((o) => {
    const method = paymentMethodFromNotes(o.notes);
    return {
      id: o.id,
      reference: o.reference,
      status: o.status,
      placedAt: stamp(o.createdAt),
      contactId: o.contact.id,
      contactName: o.contact.name?.trim() || o.shipName.trim() || o.contact.email,
      contactEmail: o.contact.email,
      /* The number given for this delivery first; the contact's own number otherwise. */
      phone: o.shipPhone?.trim() || o.contact.phone?.trim() || null,
      /* Name and street lines; the country is shown on its own below them. */
      addressLines: addressLines({ ...o, shipCountry: null }),
      country: o.shipCountry,
      items: o.items.map((item) => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice.toString(),
        lineTotal: item.lineTotal.toString(),
      })),
      subtotal: o.subtotal.toString(),
      discountCode: o.discountCode,
      discountTotal: o.discountTotal.toString(),
      shippingMethod: o.shippingMethod,
      shipping: o.shipping.toString(),
      total: o.total.toString(),
      paymentMethod: method ? (PAYMENT_METHOD_LABEL[method] ?? method) : null,
      isCashApp: method === 'cashapp',
      proofCount: o._count.paymentProofs,
      notes: o.notes,
    };
  });

  const href = (patch: Partial<Params>) => {
    const next = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...searchParams, ...patch })) {
      if (v) next.set(k, String(v));
    }
    const qs = next.toString();
    return qs ? `/admin/orders?${qs}` : '/admin/orders';
  };

  const pages = Math.max(1, Math.ceil(matching / PAGE_SIZE));
  /* Page 1 is the bare address, so the tabs and the search box never carry a stale page. */
  const pageHref = (n: number) => href({ page: n > 1 ? String(n) : undefined });
  /* A page past the end (orders deleted, an old link): go to the last real one, not "no orders". */
  if (requestedPage > pages) redirect(pageHref(pages));
  const page = requestedPage;
  const pager: OrdersPager = {
    page,
    pages,
    total: matching,
    first: page > 1 ? pageHref(1) : null,
    prev: page > 1 ? pageHref(page - 1) : null,
    next: page < pages ? pageHref(page + 1) : null,
    last: page < pages ? pageHref(pages) : null,
  };

  return (
    <>
      <WpScreenMeta
        help={
          <div>
            <p className="mt-0">
              <strong>Every order is shown in full here.</strong> Orders placed at the storefront
              checkout land in this list; Add New records one placed another way — by phone, by
              email, in person. Open an order for its history, the Cash App screenshots and the
              status picker.
            </p>
            <p>
              <strong>There is no paid/unpaid column.</strong> A crypto order moves to Confirmed
              when the payment processor reports it finished. Bank transfer and Cash App orders are
              confirmed by staff once the money has been seen; a Cash App screenshot is the
              customer&rsquo;s claim, not proof.
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
          href: href({ filter: t.key, page: undefined }),
          label: t.label,
          count: counts[i],
          current: activeTab === t.key,
        }))}
      />

      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <p className="wp-subtitle m-0">Newest first. Times are UTC.</p>

        <form method="get" action="/admin/orders" className="flex items-center gap-2">
          <input type="hidden" name="filter" value={activeTab} />
          <label className="wp-screen-reader-text" htmlFor="order-search">
            Search orders
          </label>
          <input
            id="order-search"
            name="q"
            type="search"
            defaultValue={searchParams.q ?? ''}
            placeholder="Reference, name, email, phone or address"
            className="wp-input wp-input-search"
          />
          <button type="submit" className="wp-button">
            Search
          </button>
          {q && (
            <Link href={href({ q: undefined, page: undefined })} className="wp-button">
              Clear
            </Link>
          )}
        </form>
      </div>

      <OrdersTable rows={data} pager={pager} />
    </>
  );
}
