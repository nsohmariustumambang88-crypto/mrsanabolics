'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Heart, Home, ShoppingBag, Store, User } from 'lucide-react';
import { useStore } from '@/components/providers/store-provider';
import { useDictionary } from '@/components/i18n/use-locale';
import { ACCOUNT_OPEN_EVENT } from '@/components/account/account-tabs';
import { cn } from '@/lib/utils';

/*
  The phone tab bar: the app-like bottom navigation of the reference store the owner chose
  (19 November 2026). Five tabs on an ink bar (Home, Shop, Wishlist, Account, Cart), a 3px rule
  that slides in over the active one on the site's curve, and room for the iPhone home indicator
  (env(safe-area-inset-bottom), live because the viewport is viewport-fit=cover). Below md only;
  from md the header carries all of this.

  While it shows, it sets data-tabbar on <html>, and globals.css pads the page and lifts the
  WhatsApp/Telegram buttons and the product page's buy bar above it. It is left out of checkout,
  where a way out of the payment step is a distraction rather than a help.

  Wishlist opens /wishlist, which needs no account. Account, pressed while the account page is
  already open on one of its sections, takes it back to the overview without a server round
  trip (ACCOUNT_OPEN_EVENT, components/account/account-tabs.ts).
*/

const LANG_PREFIX = /^\/(es|fr|de|it)(?=\/|$)/;

export function TabBar() {
  const pathname = usePathname() ?? '/';
  const { cartCount, wishlist, setCartOpen } = useStore();
  const t = useDictionary();

  const path = pathname.replace(LANG_PREFIX, '') || '/';
  const lang = pathname.match(LANG_PREFIX)?.[0] ?? '';
  const hidden = path.startsWith('/checkout');

  React.useEffect(() => {
    const root = document.documentElement;
    if (hidden) delete root.dataset.tabbar;
    else root.dataset.tabbar = '';
    return () => {
      delete root.dataset.tabbar;
    };
  }, [hidden]);

  if (hidden) return null;

  const onAccount = path.startsWith('/account') || path.startsWith('/auth');

  /* On the account page, let the page switch to its overview itself, if it is listening. */
  const openAccountOverview = (event: React.MouseEvent) => {
    if (!path.startsWith('/account')) return;
    const handled = !window.dispatchEvent(
      new CustomEvent(ACCOUNT_OPEN_EVENT, { detail: 'dashboard', cancelable: true })
    );
    if (handled) event.preventDefault();
  };

  const tabs = [
    { key: 'home', label: t.collection.home, href: lang || '/', icon: Home, active: path === '/' },
    {
      key: 'shop',
      label: t.nav.shop,
      href: `${lang}/shop`,
      icon: Store,
      active: ['/shop', '/product', '/categories', '/brands'].some((p) => path.startsWith(p)),
    },
    {
      key: 'wishlist',
      label: t.footer.wishlist,
      href: '/wishlist',
      icon: Heart,
      active: path.startsWith('/wishlist'),
      count: wishlist.length,
    },
    {
      key: 'account',
      label: t.nav.account,
      href: '/account',
      icon: User,
      active: onAccount,
    },
  ];
  const cartLabel = t.nav.cart(cartCount).split(',')[0];

  const item = (active: boolean) =>
    cn(
      'relative flex h-full flex-col items-center justify-center gap-1 text-[0.6875rem] font-semibold transition-colors duration-200 active:scale-95',
      active ? 'text-paper' : 'text-[hsl(var(--paper)/0.62)] hover:text-paper'
    );
  const rule = (active: boolean) =>
    cn(
      'absolute top-0 h-[3px] w-8 bg-paper transition-transform duration-300 ease-lift',
      active ? 'scale-x-100' : 'scale-x-0'
    );
  const badge = (n: number) =>
    n > 0 ? (
      <span className="absolute -right-2 -top-1.5 min-w-[1.05rem] rounded-full bg-pigment-madder px-1 text-center text-[0.625rem] font-bold leading-[1.05rem] text-primary-foreground tabular">
        {n > 99 ? '99+' : n}
      </span>
    ) : null;

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 bg-ink pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <div className="mx-auto grid h-[var(--tabbar-h)] max-w-md grid-cols-5">
        {tabs.map(({ key, label, href, icon: Icon, active, count }) => (
          <Link
            key={key}
            href={href}
            aria-current={active ? 'page' : undefined}
            onClick={key === 'account' ? openAccountOverview : undefined}
            className={item(active)}
          >
            <span className={rule(active)} aria-hidden="true" />
            <span className="relative">
              <Icon className="size-5" strokeWidth={1.75} fill={key === 'wishlist' && active ? 'currentColor' : 'none'} />
              {count !== undefined && badge(count)}
            </span>
            {label}
          </Link>
        ))}
        <button type="button" onClick={() => setCartOpen(true)} className={item(false)} aria-label={t.nav.cart(cartCount)}>
          <span className={rule(false)} aria-hidden="true" />
          <span className="relative">
            <ShoppingBag className="size-5" strokeWidth={1.75} />
            {badge(cartCount)}
          </span>
          {cartLabel}
        </button>
      </div>
    </nav>
  );
}
