'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Menu,
  Home,
  Search,
  MessageSquare,
  Plus,
  Gauge,
  Package,
  Images,
  FileText,
  Mail,
  FolderTree,
  ChevronsLeft,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/*
  The admin bar and the admin menu.

  They are one component because they share exactly one piece of state — whether the menu is
  open — and that state is owned by a control in the bar. Splitting them would mean lifting a
  boolean through the server layout, which cannot hold it.

  The structure is WordPress's: a fixed dark bar across the top, a fixed dark menu down the
  left that goes off-canvas below 783px, and a content column that reserves room for both.
  783px is not a rounded guess; it is the breakpoint wp-admin itself switches at.

  Every item in the bar is wired to something real rather than reproduced as an ornament.
  WordPress puts comments in this position, so ours puts reviews there — the product review
  rows are the nearest true equivalent, and the bubble carries the actual count.
*/

type MenuItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
  submenu?: { href: string; label: string; exact?: boolean }[];
};

const MENU: MenuItem[] = [
  { href: '/admin', label: 'Dashboard', icon: Gauge, exact: true },
  {
    href: '/admin/products',
    label: 'Products',
    icon: Package,
    submenu: [
      { href: '/admin/products', label: 'All Products', exact: true },
      { href: '/admin/products/new', label: 'Add New' },
      { href: '/admin/categories', label: 'Categories' },
      { href: '/admin/brands', label: 'Manufacturers' },
    ],
  },
  { href: '/admin/media', label: 'Media', icon: Images },
  { href: '/admin/blog', label: 'Journal', icon: FileText },
  { href: '/admin/subscribers', label: 'Subscribers', icon: Mail },
];

/* Categories and Manufacturers are reachable from the Products submenu, but they are also
   destinations in their own right — a direct hit on either should light the parent. */
const PRODUCTS_FAMILY = ['/admin/products', '/admin/categories', '/admin/brands'];

export function WpChrome({
  email,
  reviewCount,
  categories,
}: {
  email: string;
  reviewCount: number;
  categories: { slug: string; name: string; listed: number }[];
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [accountOpen, setAccountOpen] = React.useState(false);

  /* A route change means the off-canvas menu has done its job. */
  React.useEffect(() => {
    setMenuOpen(false);
    setAccountOpen(false);
  }, [pathname]);

  const inFamily = (item: MenuItem) =>
    item.exact
      ? pathname === item.href
      : item.href === '/admin/products'
        ? PRODUCTS_FAMILY.some((p) => pathname.startsWith(p))
        : pathname.startsWith(item.href);

  return (
    <>
      {/* ------------------------------------------------------------- bar */}
      <div id="wpadminbar" className="wp-adminbar">
        <button
          type="button"
          className="wp-adminbar-item wp-hide-desktop"
          aria-expanded={menuOpen}
          aria-controls="adminmenu"
          onClick={() => setMenuOpen((v) => !v)}
        >
          {menuOpen ? (
            <X className="h-5 w-5" strokeWidth={2} />
          ) : (
            <Menu className="h-5 w-5" strokeWidth={2} />
          )}
          <span className="wp-screen-reader-text">
            {menuOpen ? 'Close menu' : 'Open menu'}
          </span>
        </button>

        <Link href="/" target="_blank" className="wp-adminbar-item" title="Visit site">
          <Home className="h-4 w-4" strokeWidth={1.9} />
          <span className="hidden sm:inline">MrAnabolics</span>
        </Link>

        <Link href="/admin/products" className="wp-adminbar-item" title="Search products">
          <Search className="h-4 w-4" strokeWidth={1.9} />
          <span className="wp-screen-reader-text">Search products</span>
        </Link>

        <Link
          href="/admin/products?sort=name"
          className="wp-adminbar-item"
          title={`${reviewCount} reviews`}
        >
          <MessageSquare className="h-4 w-4" strokeWidth={1.9} />
          <span className="wp-bubble">{reviewCount}</span>
          <span className="wp-screen-reader-text">reviews</span>
        </Link>

        <Link href="/admin/products/new" className="wp-adminbar-item" title="Add new product">
          <Plus className="h-4 w-4" strokeWidth={2.2} />
          <span className="hidden sm:inline">New</span>
        </Link>

        <div className="relative ml-auto">
          <button
            type="button"
            className="wp-adminbar-item"
            aria-expanded={accountOpen}
            onClick={() => setAccountOpen((v) => !v)}
          >
            <span className="hidden sm:inline">Howdy, {email.split('@')[0]}</span>
            <span
              aria-hidden="true"
              className="flex h-6 w-6 items-center justify-center rounded-full bg-[#2c3338] text-[11px] font-semibold uppercase text-[#c3c4c7]"
            >
              {email.slice(0, 1)}
            </span>
          </button>

          {accountOpen && (
            <div className="absolute right-0 top-full min-w-[180px] border border-black/20 bg-[#2c3338] py-1 text-[13px] shadow-lg">
              <p className="px-3 py-1.5 text-[#a7aaad]">{email}</p>
              <Link
                href="/"
                target="_blank"
                className="block px-3 py-1.5 text-[#c3c4c7] hover:text-[#72aee6]"
              >
                Visit site
              </Link>
              <form action="/api/admin/logout" method="post">
                <button
                  type="submit"
                  className="block w-full px-3 py-1.5 text-left text-[#c3c4c7] hover:text-[#72aee6]"
                >
                  Log Out
                </button>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* Tapping the field behind an open off-canvas menu should close it. */}
      {menuOpen && (
        <button
          type="button"
          aria-hidden="true"
          tabIndex={-1}
          onClick={() => setMenuOpen(false)}
          className="fixed inset-0 z-[9980] bg-black/40 wp-hide-desktop"
        />
      )}

      {/* ------------------------------------------------------------ menu */}
      <nav
        id="adminmenu"
        aria-label="Admin menu"
        className="wp-adminmenu"
        data-open={menuOpen ? 'true' : 'false'}
      >
        <ul className="list-none p-0">
          {MENU.map((item) => {
            const current = inFamily(item);
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn('wp-menu-item', current && 'is-current')}
                  aria-current={current && item.exact ? 'page' : undefined}
                >
                  <Icon strokeWidth={1.9} />
                  {item.label}
                </Link>

                {/* WordPress only opens the submenu of the section you are in. */}
                {item.submenu && current && (
                  <ul className="wp-submenu list-none">
                    {item.submenu.map((sub) => {
                      const active = sub.exact
                        ? pathname === sub.href
                        : pathname.startsWith(sub.href);
                      return (
                        <li key={sub.href}>
                          <Link href={sub.href} aria-current={active ? 'page' : undefined}>
                            {sub.label}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>

        <div className="wp-menu-separator" />

        {/* Category shortcuts: every one of these is a real filtered query on the list table. */}
        <p className="px-2.5 pb-1 pt-2 text-[11px] uppercase tracking-wide text-[#a7aaad]">
          Product Categories
        </p>
        <ul className="list-none p-0 pb-4">
          {categories.map((c) => (
            <li key={c.slug}>
              <Link
                href={`/admin/products?category=${c.slug}`}
                className="flex items-center gap-2 px-2.5 py-1.5 text-[13px] text-[#c3c4c7] no-underline hover:text-[#72aee6]"
              >
                <FolderTree className="h-3.5 w-3.5 shrink-0 text-[#a7aaad]" strokeWidth={1.8} />
                <span className="min-w-0 flex-1 truncate">{c.name}</span>
                <span className="wp-num text-[#a7aaad]">{c.listed}</span>
              </Link>
            </li>
          ))}
        </ul>

        <div className="wp-menu-separator" />

        <button
          type="button"
          className="wp-menu-item wp-hide-desktop"
          onClick={() => setMenuOpen(false)}
        >
          <ChevronsLeft strokeWidth={1.9} />
          Collapse menu
        </button>
      </nav>
    </>
  );
}
