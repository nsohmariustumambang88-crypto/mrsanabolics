'use client';

import * as React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  ChevronRight,
  Heart,
  LayoutGrid,
  LifeBuoy,
  LogOut,
  MapPin,
  Package,
  Settings,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useStore } from '@/components/providers/store-provider';
import { formatPrice } from '@/lib/format';
import { cn } from '@/lib/utils';
import { clearCheckoutDraft } from '@/lib/checkout/draft';
import {
  ACCOUNT_OPEN_EVENT,
  accountTabHref,
  asAccountTab,
  type AccountTab,
} from '@/components/account/account-tabs';

/*
  A signed-in person's own account, laid out like the reference store's profile screen
  (21 November 2026): an inked panel with the person's initial, name and Sign out, then the
  sections as rows with a count and a chevron.

  The sections switch in the browser. Everything they show (the orders, the addresses on them,
  the settings) arrived with the page, so a tap needs no trip to the server: the view changes at
  once and the address bar follows with history.pushState, carrying Next's own history state so
  back and forward still restore this page. Back from a section returns to the rows, as in an
  app. (They used to be links to `?tab=`, and this page is rendered per request, so every tap
  waited on the server and the database before anything moved.)

  Saved products are not a section any more: they live in the browser and have their own page,
  /wishlist, open to everybody. The row here links to it.
*/

type Section = { id: AccountTab; label: string; icon: LucideIcon };

const SECTIONS: Section[] = [
  { id: 'dashboard', label: 'Overview', icon: LayoutGrid },
  { id: 'orders', label: 'My orders', icon: Package },
  { id: 'addresses', label: 'Addresses', icon: MapPin },
  { id: 'settings', label: 'Settings', icon: Settings },
];

const TITLES: Record<AccountTab, string> = {
  dashboard: 'Your account',
  orders: 'My orders',
  addresses: 'Addresses',
  settings: 'Settings',
};

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

const label = (status: string) => status.charAt(0) + status.slice(1).toLowerCase();

const placed = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

/** A row in the phone list: icon, label, an optional count, a chevron. */
const ROW =
  'flex w-full items-center gap-3 rounded-lg px-1 py-3.5 text-sm font-semibold transition-colors hover:bg-paper-sunk active:bg-paper-sunk';

export function AccountView({
  customer,
  orders,
}: {
  customer: { email: string; name: string | null };
  orders: AccountOrder[];
}) {
  const params = useSearchParams();
  const urlTab = asAccountTab(params.get('tab'));
  const [tab, setTab] = React.useState<AccountTab>(urlTab);
  const tabRef = React.useRef(tab);
  tabRef.current = tab;
  const content = React.useRef<HTMLDivElement>(null);
  const { wishlist, cartCount } = useStore();
  const [signingOut, setSigningOut] = React.useState(false);

  /* A navigation by Next that changes ?tab= (a link to /account?tab=orders) wins. */
  React.useEffect(() => setTab(urlTab), [urlTab]);

  const show = React.useCallback((next: AccountTab) => {
    if (next === tabRef.current) {
      window.scrollTo({ top: 0 });
      return;
    }
    setTab(next);
    window.history.pushState(window.history.state, '', accountTabHref(next));
    /* Start the section at its top when the tap came from further down the page. */
    const box = content.current;
    if (box && box.getBoundingClientRect().top < 0) box.scrollIntoView({ block: 'start' });
  }, []);

  React.useEffect(() => {
    /* Back and forward between sections: the address is already the one to show. */
    const onPop = () => setTab(asAccountTab(new URLSearchParams(window.location.search).get('tab')));
    /* The tab bar's Account button, pressed while this page is open. */
    const onOpen = (event: Event) => {
      event.preventDefault();
      show(asAccountTab((event as CustomEvent<string>).detail));
    };
    window.addEventListener('popstate', onPop);
    window.addEventListener(ACCOUNT_OPEN_EVENT, onOpen);
    return () => {
      window.removeEventListener('popstate', onPop);
      window.removeEventListener(ACCOUNT_OPEN_EVENT, onOpen);
    };
  }, [show]);

  /* A plain link that switches in place, but still opens a new tab on Ctrl/Cmd-click. */
  const go = (next: AccountTab) => (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    show(next);
  };

  const lifetime = orders.reduce((sum, o) => sum + Number(o.total), 0);
  const initial = (customer.name || customer.email).trim().charAt(0).toUpperCase();

  /* A real navigation, so every server component re-reads the cleared cookie. */
  async function signOut() {
    setSigningOut(true);
    /* The checkout's saved name and address go too: signing out says "not only my device". */
    clearCheckoutDraft();
    try {
      await fetch('/api/account/logout', { method: 'POST' });
    } catch {
      /* Even if the request failed, send them onward — the cookie may still be gone. */
    }
    window.location.assign('/');
  }

  /* Where past parcels went. Captured on each order, so it is history rather than a profile. */
  const destinations = Array.from(new Set(orders.map((o) => o.destination).filter(Boolean)));

  const counts: Partial<Record<AccountTab, number>> = { orders: orders.length };

  return (
    <>
      <section className="bg-ink text-paper">
        <div className="mx-auto flex max-w-[86rem] flex-col items-center gap-3 px-4 pb-8 pt-9 text-center sm:px-6 md:flex-row md:items-end md:gap-7 md:pb-12 md:pt-16 md:text-left lg:px-10">
          <span
            aria-hidden="true"
            className="grid size-20 shrink-0 place-items-center rounded-lg bg-paper font-display text-4xl font-semibold text-ink md:size-24 md:text-5xl"
          >
            {initial}
          </span>
          <div className="min-w-0 max-w-full md:flex-1">
            <h1 className="truncate font-display text-2xl font-semibold tracking-[-0.03em] md:text-4xl">
              {customer.name ?? 'Your account'}
            </h1>
            <p className="mt-1 break-all text-sm text-[hsl(var(--paper)/0.72)]">{customer.email}</p>
          </div>
          <button
            type="button"
            onClick={signOut}
            disabled={signingOut}
            className="mt-1 inline-flex h-11 items-center gap-2 rounded-lg border border-[hsl(var(--paper)/0.4)] px-5 text-sm font-bold transition-colors hover:bg-paper hover:text-ink disabled:opacity-50 md:mt-0"
          >
            <LogOut className="size-4" strokeWidth={2} />
            {signingOut ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
      </section>

      <div ref={content} className="mx-auto max-w-[86rem] scroll-mt-24 px-4 sm:px-6 lg:px-10">
        <div className="grid gap-10 pb-14 pt-5 lg:grid-cols-[14rem_minmax(0,1fr)] lg:pt-10">
          {/* From lg, the sections run down the side. On a phone they are rows on the overview. */}
          <nav aria-label="Account sections" className="hidden lg:block">
            <ul className="sticky top-28 flex flex-col gap-0.5">
              {SECTIONS.map(({ id, label: name, icon: Icon }) => (
                <li key={id}>
                  <a
                    href={accountTabHref(id)}
                    onClick={go(id)}
                    aria-current={tab === id ? 'page' : undefined}
                    className={cn(
                      'flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm transition-colors',
                      tab === id ? 'bg-paper-sunk font-bold text-ink' : 'text-ink-soft hover:bg-paper-sunk hover:text-ink'
                    )}
                  >
                    <Icon className="size-4 shrink-0" strokeWidth={1.75} />
                    {name}
                  </a>
                </li>
              ))}
              <li>
                <Link
                  href="/wishlist"
                  className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-ink-soft transition-colors hover:bg-paper-sunk hover:text-ink"
                >
                  <Heart className="size-4 shrink-0" strokeWidth={1.75} />
                  Saved
                </Link>
              </li>
            </ul>
          </nav>

          <div className="min-w-0">
            {tab !== 'dashboard' && (
              <div className="-ml-2 mb-3 flex items-center gap-1 lg:hidden">
                <a
                  href="/account"
                  onClick={go('dashboard')}
                  aria-label="Back to your account"
                  className="inline-flex size-10 items-center justify-center rounded-lg transition-colors hover:bg-paper-sunk active:bg-paper-sunk"
                >
                  <ArrowLeft className="size-[1.375rem]" strokeWidth={1.9} />
                </a>
                <h2 className="text-lg font-bold">{TITLES[tab]}</h2>
              </div>
            )}

            {tab === 'dashboard' && (
              <div className="space-y-8 lg:space-y-10">
                <dl className="grid grid-cols-3 gap-px overflow-hidden rounded-lg border border-rule bg-rule">
                  {[
                    ['Orders', String(orders.length)],
                    ['Spent', formatPrice(lifetime)],
                    ['In cart', String(cartCount)],
                  ].map(([term, value]) => (
                    <div key={term} className="min-w-0 bg-card px-3 py-3.5 sm:p-6">
                      <dt className="truncate text-xs font-bold text-ink-soft">{term}</dt>
                      <dd className="mt-1 truncate font-display text-lg font-semibold tabular sm:mt-2 sm:text-2xl">
                        {value}
                      </dd>
                    </div>
                  ))}
                </dl>

                {/* The phone's section list, after the reference store's profile rows. */}
                <nav aria-label="Account sections" className="lg:hidden">
                  <ul className="divide-y divide-rule border-y border-rule">
                    {SECTIONS.filter((s) => s.id !== 'dashboard').map(({ id, label: name, icon: Icon }) => (
                      <li key={id}>
                        <a href={accountTabHref(id)} onClick={go(id)} className={ROW}>
                          <Icon className="size-5 shrink-0" strokeWidth={1.75} />
                          <span className="flex-1">{name}</span>
                          {counts[id] ? <span className="text-sm font-normal text-ink-soft tabular">{counts[id]}</span> : null}
                          <ChevronRight className="size-4 shrink-0 text-ink-faint" strokeWidth={2} />
                        </a>
                      </li>
                    ))}
                    <li>
                      <Link href="/wishlist" className={ROW}>
                        <Heart className="size-5 shrink-0" strokeWidth={1.75} />
                        <span className="flex-1">Saved</span>
                        {wishlist.length > 0 && (
                          <span className="text-sm font-normal text-ink-soft tabular">{wishlist.length}</span>
                        )}
                        <ChevronRight className="size-4 shrink-0 text-ink-faint" strokeWidth={2} />
                      </Link>
                    </li>
                    <li>
                      <Link href="/contact" className={ROW}>
                        <LifeBuoy className="size-5 shrink-0" strokeWidth={1.75} />
                        <span className="flex-1">Help and support</span>
                        <ChevronRight className="size-4 shrink-0 text-ink-faint" strokeWidth={2} />
                      </Link>
                    </li>
                  </ul>
                </nav>

                <div>
                  <h2 className="font-display text-xl font-semibold tracking-[-0.025em]">Recent orders</h2>
                  <OrderList orders={orders.slice(0, 3)} />
                  {orders.length > 3 && (
                    <a
                      href={accountTabHref('orders')}
                      onClick={go('orders')}
                      className="mt-4 inline-block text-sm font-semibold underline underline-offset-4"
                    >
                      All orders
                    </a>
                  )}
                </div>
              </div>
            )}

            {tab === 'orders' && (
              <div>
                <h2 className="hidden font-display text-xl font-semibold tracking-[-0.025em] lg:block">My orders</h2>
                <OrderList orders={orders} />
              </div>
            )}

            {tab === 'addresses' && (
              <div>
                <h2 className="hidden font-display text-xl font-semibold tracking-[-0.025em] lg:block">Addresses</h2>
                {destinations.length === 0 ? (
                  <p className="measure text-sm leading-relaxed text-ink-soft lg:mt-4">
                    No delivery address is stored on your account. An address is captured on each
                    order as it is placed, so where a past parcel went stays a fact about that
                    parcel rather than a profile that changes under it.
                  </p>
                ) : (
                  <>
                    <p className="measure text-sm leading-relaxed text-ink-soft lg:mt-4">
                      Where your orders have been sent. Each one was captured on the order itself,
                      not stored as a reusable profile.
                    </p>
                    <ul className="mt-5 grid gap-2 sm:grid-cols-2">
                      {destinations.map((place) => (
                        <li key={place} className="flex items-start gap-3 rounded-lg bg-paper-sunk p-4">
                          <MapPin className="mt-0.5 size-4 shrink-0 text-ink-faint" strokeWidth={1.75} />
                          <address className="text-sm not-italic leading-relaxed">{place}</address>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            )}

            {tab === 'settings' && (
              <div>
                <h2 className="hidden font-display text-xl font-semibold tracking-[-0.025em] lg:block">Settings</h2>
                <dl className="border-t border-rule lg:mt-6">
                  {[
                    ['Email', customer.email],
                    ['Name', customer.name ?? 'Not given'],
                    ['Password', 'Stored as a bcrypt hash. Nobody here can read it.'],
                    ['Marketing email', 'Managed separately from this account — an account is not a subscription.'],
                  ].map(([term, value]) => (
                    <div
                      key={term}
                      className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-rule py-4"
                    >
                      <dt className="text-sm font-semibold">{term}</dt>
                      <dd className="break-words text-sm text-ink-soft">{value}</dd>
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

function OrderList({ orders }: { orders: AccountOrder[] }) {
  if (orders.length === 0) {
    return (
      <div className="mt-4 rounded-lg bg-paper-sunk px-6 py-12 text-center">
        <Package className="mx-auto size-7 text-ink-faint" strokeWidth={1.5} aria-hidden="true" />
        <p className="mt-4 font-display text-lg font-semibold tracking-[-0.025em]">No orders yet</p>
        <p className="measure-tight mx-auto mt-2 text-sm leading-relaxed text-ink-soft">
          Orders placed with this email address, here or by phone, appear here.
        </p>
        <Link
          href="/shop"
          className="mt-6 inline-flex h-11 items-center rounded-lg bg-ink px-6 text-sm font-bold text-paper transition-colors hover:bg-ink-soft"
        >
          Browse the shop
        </Link>
      </div>
    );
  }

  const status = (o: AccountOrder) => (
    <span className={cn('inline-flex items-center gap-1.5', STATUS_TONE[o.status] ?? 'text-ink-soft')}>
      <span
        className="size-1.5 rounded-full"
        style={{ backgroundColor: STATUS_DOT[o.status] ?? 'hsl(var(--ink-faint))' }}
        aria-hidden="true"
      />
      {label(o.status)}
    </span>
  );

  return (
    <>
      {/* Phones: one row per order, the way an app lists them, instead of a table to scroll sideways. */}
      <ul className="mt-4 divide-y divide-rule border-y border-rule md:hidden">
        {orders.map((o) => (
          <li key={o.id} className="flex items-start justify-between gap-4 py-3.5">
            <div className="min-w-0">
              <p className="font-mono text-xs font-semibold tabular">{o.reference}</p>
              <p className="mt-1 truncate text-xs text-ink-soft">
                <time dateTime={o.placedAt}>{placed(o.placedAt)}</time>
                {' · '}
                {o.itemCount} {o.itemCount === 1 ? 'item' : 'items'}
                {o.destination ? ` · ${o.destination}` : ''}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-sm font-extrabold tabular">{formatPrice(Number(o.total))}</p>
              <p className="mt-1 text-xs font-semibold">{status(o)}</p>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-5 hidden md:block">
        <table className="w-full border-collapse text-sm">
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
                  <time dateTime={o.placedAt}>{placed(o.placedAt)}</time>
                </td>
                <td className="py-4">{status(o)}</td>
                <td className="py-4 text-ink-soft tabular">{o.itemCount}</td>
                <td className="py-4 text-right font-medium tabular">{formatPrice(Number(o.total))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
