'use client';

import * as React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Package, Heart, MapPin, Settings, LayoutGrid, X } from 'lucide-react';
import { useStore } from '@/components/providers/store-provider';
import { ProductGrid } from '@/components/product/product-grid';
import { DropMark } from '@/components/ebru/drop-mark';
import { useProducts } from '@/components/providers/catalogue-provider';
import { formatPrice } from '@/lib/format';
import { cn } from '@/lib/utils';

/*
  A signed-in person's own account.

  Everything here is now theirs. The order history used to be three authored fixtures with a
  notice admitting as much; the page is reached only with a session, and the orders come from
  the database keyed on that person's CRM contact. An account with no orders says so — which is
  the truthful state for almost everybody, because this build records orders from the back
  office rather than taking payment.

  Saved items remain browser storage, and the copy still says so: they survive a sign-out and
  do not follow the person to another device. Pretending otherwise would be the one dishonest
  line left on the page.
*/

const TABS = [
  { id: 'dashboard', label: 'Overview', icon: LayoutGrid },
  { id: 'orders', label: 'Orders', icon: Package },
  { id: 'wishlist', label: 'Saved', icon: Heart },
  { id: 'addresses', label: 'Addresses', icon: MapPin },
  { id: 'settings', label: 'Settings', icon: Settings },
] as const;

export type AccountOrder = {
  id: string;
  reference: string;
  status: string;
  total: string;
  currency: string;
  placedAt: string;
  destination: string;
  itemCount: number;
};

/* Keyed on the OrderStatus enum, so a status the database can hold always has a colour. */
const STATUS_TONE: Record<string, string> = {
  NEW: 'text-ink-soft',
  CONFIRMED: 'text-pigment-indigo',
  PACKED: 'text-pigment-indigo',
  SHIPPED: 'text-pigment-indigo',
  DELIVERED: 'text-success',
  CANCELLED: 'text-destructive',
};

const STATUS_DOT: Record<string, string> = {
  NEW: 'hsl(var(--ink-faint))',
  CONFIRMED: 'hsl(var(--pig-indigo))',
  PACKED: 'hsl(var(--pig-indigo))',
  SHIPPED: 'hsl(var(--pig-indigo))',
  DELIVERED: 'hsl(var(--pig-verdigris))',
  CANCELLED: 'hsl(var(--pig-madder))',
};

const label = (status: string) =>
  status.charAt(0) + status.slice(1).toLowerCase();

export function AccountView({
  customer,
  orders,
}: {
  customer: { email: string; name: string | null };
  orders: AccountOrder[];
}) {
  const params = useSearchParams();
  const tab = params.get('tab') ?? 'dashboard';
  const { wishlist, toggleWishlist, cartCount } = useStore();
  const products = useProducts();
  const [signingOut, setSigningOut] = React.useState(false);

  const saved = products.filter((p) => wishlist.includes(p.id));
  const lifetime = orders.reduce((sum, o) => sum + Number(o.total), 0);

  /* A real navigation, so every server component re-reads the cleared cookie. */
  async function signOut() {
    setSigningOut(true);
    try {
      await fetch('/api/account/logout', { method: 'POST' });
    } catch {
      /* Even if the request failed, send them onward — the cookie may still be gone. */
    }
    window.location.assign('/');
  }

  /* Where past parcels went. Captured on each order, so it is history rather than a profile. */
  const destinations = Array.from(
    new Set(orders.map((o) => o.destination).filter(Boolean))
  );

  return (
    <>
      <section className="border-b border-rule">
        <div className="mx-auto flex max-w-[86rem] flex-wrap items-center gap-5 px-4 py-10 sm:px-6 lg:px-10">
          <DropMark className="h-14 w-14 shrink-0" />
          <div className="min-w-0">
            <h1 className="font-display text-2xl font-semibold tracking-[-0.03em] sm:text-3xl">
              {customer.name ?? 'Your account'}
            </h1>
            <p className="mt-1.5 break-words text-sm text-ink-soft">{customer.email}</p>
          </div>
          <button
            type="button"
            onClick={signOut}
            disabled={signingOut}
            className="ml-auto rounded-full border border-rule-strong px-5 py-2.5 text-sm font-medium transition-colors hover:border-pigment-madder hover:text-pigment-madder disabled:opacity-50"
          >
            {signingOut ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
      </section>

      <div className="mx-auto max-w-[86rem] px-4 sm:px-6 lg:px-10">
        <div className="grid gap-10 py-10 lg:grid-cols-[14rem_minmax(0,1fr)]">
          <nav aria-label="Account sections">
            <ul className="flex gap-1 overflow-x-auto lg:sticky lg:top-28 lg:flex-col lg:gap-0.5 lg:overflow-visible">
              {TABS.map(({ id, label: tabLabel, icon: Icon }) => (
                <li key={id} className="shrink-0">
                  <Link
                    href={`/account?tab=${id}`}
                    aria-current={tab === id ? 'page' : undefined}
                    className={cn(
                      'flex items-center gap-2.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm transition-colors lg:border-b-0 lg:border-l-2 lg:py-2',
                      tab === id
                        ? 'border-pigment-indigo font-medium text-pigment-indigo'
                        : 'border-transparent text-ink-soft hover:text-ink'
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" strokeWidth={1.6} />
                    {tabLabel}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            {tab === 'dashboard' && (
              <div className="space-y-10">
                <dl className="grid gap-px border border-rule bg-rule sm:grid-cols-3">
                  {[
                    ['Orders placed', String(orders.length)],
                    ['Lifetime spend', formatPrice(lifetime)],
                    ['In your cart', String(cartCount)],
                  ].map(([term, value]) => (
                    <div key={term} className="bg-card p-6">
                      <dt className="font-mono text-2xs uppercase tracking-[0.16em] text-ink-faint">
                        {term}
                      </dt>
                      <dd className="mt-2.5 font-display text-2xl font-semibold tabular">
                        {value}
                      </dd>
                    </div>
                  ))}
                </dl>

                <div>
                  <h2 className="font-display text-xl font-semibold tracking-[-0.025em]">
                    Recent orders
                  </h2>
                  <OrderTable orders={orders.slice(0, 3)} />
                  {orders.length > 3 && (
                    <Link
                      href="/account?tab=orders"
                      className="mt-4 inline-block text-sm text-pigment-indigo underline underline-offset-4"
                    >
                      All orders
                    </Link>
                  )}
                </div>
              </div>
            )}

            {tab === 'orders' && (
              <div>
                <h2 className="font-display text-xl font-semibold tracking-[-0.025em]">
                  Orders
                </h2>
                <OrderTable orders={orders} />
              </div>
            )}

            {tab === 'wishlist' && (
              <div>
                <h2 className="font-display text-xl font-semibold tracking-[-0.025em]">
                  Saved compounds
                </h2>
                {saved.length === 0 ? (
                  <div className="mt-6 border border-rule bg-card px-6 py-16 text-center">
                    <Heart
                      className="mx-auto h-7 w-7 text-ink-faint"
                      strokeWidth={1.25}
                      aria-hidden="true"
                    />
                    <p className="mt-5 font-display text-lg font-semibold tracking-[-0.025em]">
                      Nothing saved yet
                    </p>
                    <p className="measure-tight mx-auto mt-2 text-sm leading-relaxed text-ink-soft">
                      Tap the heart on any product to keep it here while you compare
                      specifications.
                    </p>
                    <Link
                      href="/shop"
                      className="mt-6 inline-block rounded-full bg-pigment-indigo px-6 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-pigment-indigo-lift"
                    >
                      Browse the catalogue
                    </Link>
                  </div>
                ) : (
                  <>
                    <p className="mt-2 text-sm text-ink-soft tabular">{saved.length} saved</p>
                    <ProductGrid products={saved} columns={3} className="mt-6" />
                    <button
                      type="button"
                      onClick={() => saved.forEach((p) => toggleWishlist(p.id))}
                      className="mt-5 inline-flex items-center gap-1.5 text-sm text-ink-faint underline underline-offset-4 transition-colors hover:text-pigment-madder"
                    >
                      <X className="h-3.5 w-3.5" strokeWidth={1.75} />
                      Clear all saved
                    </button>
                  </>
                )}
                <p className="mt-6 text-xs leading-relaxed text-ink-faint">
                  Saved items live in this browser, not in your account — they will not follow
                  you to another device.
                </p>
              </div>
            )}

            {tab === 'addresses' && (
              <div>
                <h2 className="font-display text-xl font-semibold tracking-[-0.025em]">
                  Addresses
                </h2>
                {destinations.length === 0 ? (
                  <p className="measure mt-4 text-sm leading-relaxed text-ink-soft">
                    No delivery address is stored on your account. An address is captured on
                    each order as it is placed, so where a past parcel went stays a fact about
                    that parcel rather than a profile that changes under it.
                  </p>
                ) : (
                  <>
                    <p className="measure mt-4 text-sm leading-relaxed text-ink-soft">
                      Where your orders have been sent. Each one was captured on the order
                      itself, not stored as a reusable profile.
                    </p>
                    <ul className="mt-6 grid gap-px bg-rule sm:grid-cols-2">
                      {destinations.map((place) => (
                        <li key={place} className="bg-card p-6">
                          <address className="text-sm not-italic leading-relaxed text-ink-soft">
                            {place}
                          </address>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            )}

            {tab === 'settings' && (
              <div>
                <h2 className="font-display text-xl font-semibold tracking-[-0.025em]">
                  Settings
                </h2>
                <dl className="mt-6 border-t border-rule">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-rule py-4">
                    <dt className="text-sm font-medium">Email</dt>
                    <dd className="break-all text-sm text-ink-soft">{customer.email}</dd>
                  </div>
                  <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-rule py-4">
                    <dt className="text-sm font-medium">Name</dt>
                    <dd className="text-sm text-ink-soft">{customer.name ?? 'Not given'}</dd>
                  </div>
                  <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-rule py-4">
                    <dt className="text-sm font-medium">Password</dt>
                    <dd className="text-sm text-ink-soft">
                      Stored as a bcrypt hash. Nobody here can read it.
                    </dd>
                  </div>
                  <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-rule py-4">
                    <dt className="text-sm font-medium">Marketing email</dt>
                    <dd className="text-sm text-ink-soft">
                      Managed separately from this account — an account is not a subscription.
                    </dd>
                  </div>
                </dl>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function OrderTable({ orders }: { orders: AccountOrder[] }) {
  if (orders.length === 0) {
    return (
      <div className="mt-5 border border-rule bg-card px-6 py-14 text-center">
        <Package className="mx-auto h-7 w-7 text-ink-faint" strokeWidth={1.25} aria-hidden="true" />
        <p className="mt-5 font-display text-lg font-semibold tracking-[-0.025em]">
          No orders yet
        </p>
        <p className="measure-tight mx-auto mt-2 text-sm leading-relaxed text-ink-soft">
          Orders placed by phone or email are recorded against your address and will appear
          here.
        </p>
        <Link
          href="/shop"
          className="mt-6 inline-block rounded-full bg-pigment-indigo px-6 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-pigment-indigo-lift"
        >
          Browse the catalogue
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-5 overflow-x-auto">
      <table className="w-full min-w-[34rem] border-collapse text-sm">
        <thead>
          <tr className="border-y border-rule">
            {['Order', 'Placed', 'Status', 'Items', 'Total'].map((h) => (
              <th
                key={h}
                scope="col"
                className={cn(
                  'py-3 text-left font-mono text-2xs font-normal uppercase tracking-[0.14em] text-ink-faint',
                  h === 'Total' && 'text-right'
                )}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o.id} className="border-b border-rule">
              <td className="py-4 font-mono text-xs tabular">{o.reference}</td>
              <td className="py-4 text-ink-soft">
                <time dateTime={o.placedAt}>
                  {new Date(o.placedAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </time>
              </td>
              <td className={cn('py-4', STATUS_TONE[o.status] ?? 'text-ink-soft')}>
                <span className="flex items-center gap-2">
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: STATUS_DOT[o.status] ?? 'hsl(var(--ink-faint))' }}
                    aria-hidden="true"
                  />
                  {label(o.status)}
                </span>
              </td>
              <td className="py-4 text-ink-soft tabular">{o.itemCount}</td>
              <td className="py-4 text-right font-medium tabular">
                {formatPrice(Number(o.total))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
