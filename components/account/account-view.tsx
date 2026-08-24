'use client';

import * as React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Package, Heart, MapPin, Settings, LayoutGrid, Info, X } from 'lucide-react';
import { useStore } from '@/components/providers/store-provider';
import { ProductGrid } from '@/components/product/product-grid';
import { DropMark } from '@/components/ebru/drop-mark';
import { useProducts } from '@/components/providers/catalogue-provider';
import { formatPrice } from '@/lib/format';
import { cn } from '@/lib/utils';

const TABS = [
  { id: 'dashboard', label: 'Overview', icon: LayoutGrid },
  { id: 'orders', label: 'Orders', icon: Package },
  { id: 'wishlist', label: 'Saved', icon: Heart },
  { id: 'addresses', label: 'Addresses', icon: MapPin },
  { id: 'settings', label: 'Settings', icon: Settings },
] as const;

/* Demonstration fixtures — labelled, per PRODUCT.md. No real order history exists. */
const ORDERS = [
  { id: 'MA-4821', date: '2026-07-28', status: 'Delivered', total: 268.0, items: 3 },
  { id: 'MA-4677', date: '2026-06-14', status: 'Delivered', total: 89.0, items: 1 },
  { id: 'MA-4390', date: '2026-04-02', status: 'Refunded', total: 154.5, items: 2 },
];

const STATUS_TONE: Record<string, string> = {
  Delivered: 'text-success',
  Shipped: 'text-pigment-indigo',
  Refunded: 'text-warning',
  Cancelled: 'text-destructive',
};

const STATUS_DOT: Record<string, string> = {
  Delivered: 'hsl(var(--pig-verdigris))',
  Shipped: 'hsl(var(--pig-indigo))',
  Refunded: 'hsl(var(--pig-saffron))',
  Cancelled: 'hsl(var(--pig-madder))',
};

export function AccountView() {
  const params = useSearchParams();
  const tab = params.get('tab') ?? 'dashboard';
  const { wishlist, toggleWishlist, cartCount } = useStore();
  const products = useProducts();

  const saved = products.filter((p) => wishlist.includes(p.id));
  const lifetime = ORDERS.reduce((sum, o) => sum + o.total, 0);

  return (
    <>
      <section className="border-b border-rule">
        <div className="mx-auto flex max-w-[86rem] flex-wrap items-center gap-5 px-4 py-10 sm:px-6 lg:px-10">
          <DropMark className="h-14 w-14 shrink-0" />
          <div className="min-w-0">
            <h1 className="font-display text-2xl font-semibold tracking-[-0.03em] sm:text-3xl">
              Your account
            </h1>
            <p className="mt-1.5 text-sm text-ink-soft">
              Not signed in — this build shows the account shell with demonstration data.
            </p>
          </div>
          <Link
            href="/auth"
            className="ml-auto rounded-full bg-pigment-indigo px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-pigment-indigo-lift"
          >
            Sign in
          </Link>
        </div>
      </section>

      <div className="mx-auto max-w-[86rem] px-4 sm:px-6 lg:px-10">
        <div className="grid gap-10 py-10 lg:grid-cols-[14rem_minmax(0,1fr)]">
          <nav aria-label="Account sections">
            <ul className="flex gap-1 overflow-x-auto lg:sticky lg:top-28 lg:flex-col lg:gap-0.5 lg:overflow-visible">
              {TABS.map(({ id, label, icon: Icon }) => (
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
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <p className="mb-8 flex gap-2.5 border border-rule bg-paper-sunk p-3.5 text-xs leading-relaxed text-ink-soft">
              <Info
                className="mt-0.5 h-3.5 w-3.5 shrink-0 text-pigment-saffron"
                strokeWidth={1.75}
              />
              <span>
                Orders and addresses below are authored fixtures for this demonstration build.
                Saved items are real — they come from your own browser storage.
              </span>
            </p>

            {tab === 'dashboard' && (
              <div className="space-y-10">
                <dl className="grid gap-px border border-rule bg-rule sm:grid-cols-3">
                  {[
                    ['Orders placed', String(ORDERS.length)],
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
                  <OrderTable orders={ORDERS.slice(0, 2)} />
                  <Link
                    href="/account?tab=orders"
                    className="mt-4 inline-block text-sm text-pigment-indigo underline underline-offset-4"
                  >
                    All orders
                  </Link>
                </div>
              </div>
            )}

            {tab === 'orders' && (
              <div>
                <h2 className="font-display text-xl font-semibold tracking-[-0.025em]">
                  Orders
                </h2>
                <OrderTable orders={ORDERS} />
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
                    <p className="mt-2 text-sm text-ink-soft tabular">
                      {saved.length} saved
                    </p>
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
              </div>
            )}

            {tab === 'addresses' && (
              <div>
                <h2 className="font-display text-xl font-semibold tracking-[-0.025em]">
                  Addresses
                </h2>
                <div className="mt-6 grid gap-px bg-rule sm:grid-cols-2">
                  {[
                    { label: 'Default shipping', lines: ['Alex Rivera', '14 Rue de la Paix', '75002 Paris', 'France'] },
                    { label: 'Billing', lines: ['Alex Rivera', '14 Rue de la Paix', '75002 Paris', 'France'] },
                  ].map((addr) => (
                    <div key={addr.label} className="bg-card p-6">
                      <p className="font-mono text-2xs uppercase tracking-[0.16em] text-ink-faint">
                        {addr.label}
                      </p>
                      <address className="mt-3 text-sm not-italic leading-relaxed text-ink-soft">
                        {addr.lines.map((l) => (
                          <span key={l} className="block">
                            {l}
                          </span>
                        ))}
                      </address>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tab === 'settings' && (
              <div>
                <h2 className="font-display text-xl font-semibold tracking-[-0.025em]">
                  Settings
                </h2>
                <dl className="mt-6 border-t border-rule">
                  {[
                    ['Email', 'alex@example.com'],
                    ['Password', 'Last changed 4 months ago'],
                    ['Release notes', 'Subscribed'],
                    ['Marketing', 'Not subscribed'],
                  ].map(([term, value]) => (
                    <div
                      key={term}
                      className="flex items-baseline justify-between gap-6 border-b border-rule py-4"
                    >
                      <dt className="text-sm font-medium">{term}</dt>
                      <dd className="text-sm text-ink-soft">{value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function OrderTable({ orders }: { orders: typeof ORDERS }) {
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
              <td className="py-4 font-mono text-xs tabular">{o.id}</td>
              <td className="py-4 text-ink-soft">
                <time dateTime={o.date}>
                  {new Date(o.date).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </time>
              </td>
              <td className={cn('py-4', STATUS_TONE[o.status])}>
                <span className="flex items-center gap-2">
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: STATUS_DOT[o.status] }}
                    aria-hidden="true"
                  />
                  {o.status}
                </span>
              </td>
              <td className="py-4 text-ink-soft tabular">{o.items}</td>
              <td className="py-4 text-right font-medium tabular">
                {formatPrice(o.total)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
