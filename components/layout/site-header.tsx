'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Search, Heart, User, ShoppingBag, Menu, X } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion';
import { useStore } from '@/components/providers/store-provider';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { BullMark } from '@/components/brand/bull-mark';
import { useCategories, useBrands } from '@/components/providers/catalogue-provider';
import { categoryPigment } from '@/lib/site';
import { categoryPath } from '@/lib/catalogue/paths';
import { cn } from '@/lib/utils';

const navLinks = [
  { label: 'Shop', href: '/shop' },
  { label: 'Categories', href: '/categories', menu: 'categories' as const },
  { label: 'Brands', href: '/brands', menu: 'brands' as const },
  { label: 'Journal', href: '/blog' },
  { label: 'About', href: '/about' },
  { label: 'Contact', href: '/contact' },
];

function Wordmark({ compact }: { compact?: boolean }) {
  return (
    <Link
      href="/"
      className="group flex items-center gap-2 rounded-sm sm:gap-3"
      aria-label="MrAnabolics — home"
    >
      {/*
        The bull hangs out of the header. The owner's reference had the mark running past the
        header's bottom edge, so the head and shoulders sit in the bar and the folded arms hang
        over the page below it. The span holds the bull's place in the row at the row's height.
        The bull is positioned inside it and is taller than it, so it runs past the header's
        bottom edge without making the header taller.

        The bull ignores the pointer. The part hanging over the page would otherwise swallow
        clicks meant for whatever is underneath it. The span inside the link still catches
        clicks in the bar, so the logo still goes home.

        Phones get one size whether or not the page has scrolled. At 360px the row has exactly
        room for an 80px bull, the name and the three buttons, and the bar is kept low enough
        (py-2 in SiteHeader) that the arms still hang below it.
      */}
      <span
        className={cn(
          'relative h-11 w-20 shrink-0',
          compact ? 'sm:w-[5.75rem]' : 'sm:h-14 sm:w-[8.25rem]'
        )}
      >
        <BullMark
          priority
          className={cn(
            'pointer-events-none absolute -top-1 left-0 w-full max-w-none',
            compact ? 'sm:-top-2' : 'sm:-top-3'
          )}
        />
      </span>
      <span className="flex flex-col leading-none">
        <span
          className={cn(
            'font-display font-semibold tracking-[-0.03em] transition-colors duration-300',
            compact ? 'text-base' : 'text-base sm:text-lg'
          )}
        >
          MrAnabolics
        </span>
        {!compact && (
          <span className="mt-1 hidden font-mono text-2xs uppercase tracking-[0.18em] text-ink-faint sm:block">
            Floated &amp; documented
          </span>
        )}
      </span>
    </Link>
  );
}

function CategoryMenu({ onNavigate }: { onNavigate?: () => void }) {
  const categories = useCategories();
  return (
    <div className="grid gap-x-8 gap-y-1 md:grid-cols-2 lg:grid-cols-3">
      {categories.map((c) => (
        <Link
          key={c.slug}
          href={categoryPath(c.slug)}
          onClick={onNavigate}
          className="group flex items-baseline gap-3 border-b border-rule/60 py-2.5 last:border-0 hover:border-pigment-indigo-lift"
        >
          <span
            className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: categoryPigment(c.slug) }}
            aria-hidden="true"
          />
          <span className="flex-1">
            <span className="block text-sm font-medium group-hover:text-pigment-indigo">
              {c.name}
            </span>
            <span className="mt-0.5 block text-xs leading-snug text-ink-faint">
              {c.description.split('.')[0]}.
            </span>
          </span>
          <span className="font-mono text-2xs text-ink-faint tabular">
            {c.listed}
          </span>
        </Link>
      ))}
    </div>
  );
}

function BrandMenu({ onNavigate }: { onNavigate?: () => void }) {
  const brands = useBrands();
  return (
    <div className="grid gap-x-8 gap-y-1 md:grid-cols-2">
      {brands.map((b) => (
        <Link
          key={b.slug}
          href={`/brands/${b.slug}`}
          onClick={onNavigate}
          className="group border-b border-rule/60 py-2.5 last:border-0 hover:border-pigment-indigo-lift"
        >
          <span className="flex items-baseline justify-between gap-4">
            <span className="text-sm font-medium group-hover:text-pigment-indigo">
              {b.name}
            </span>
            <span className="font-mono text-2xs text-ink-faint tabular">
              {b.productCount}
            </span>
          </span>
          <span className="mt-0.5 block text-xs leading-snug text-ink-faint">
            {b.description.split('.')[0]}.
          </span>
        </Link>
      ))}
    </div>
  );
}

export function SiteHeader() {
  const pathname = usePathname();
  const { cartCount, setCartOpen, setSearchOpen, wishlist } = useStore();
  const [openMenu, setOpenMenu] = React.useState<string | null>(null);
  const [condensed, setCondensed] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const closeTimer = React.useRef<ReturnType<typeof setTimeout>>();

  React.useEffect(() => {
    const onScroll = () => setCondensed(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  React.useEffect(() => {
    setOpenMenu(null);
    setMobileOpen(false);
  }, [pathname]);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenMenu(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const enter = (menu: string) => {
    clearTimeout(closeTimer.current);
    setOpenMenu(menu);
  };
  const leave = () => {
    closeTimer.current = setTimeout(() => setOpenMenu(null), 140);
  };

  return (
    <header
      className={cn(
        'sticky top-0 z-50 border-b bg-paper transition-[border-color,box-shadow] duration-300',
        condensed ? 'border-rule-strong shadow-lift' : 'border-rule'
      )}
      onMouseLeave={leave}
    >
      <div className="mx-auto flex max-w-[86rem] items-center gap-3 px-4 sm:gap-6 sm:px-6 lg:px-10">
        <div
          className={cn(
            'flex items-center py-2 transition-colors duration-300',
            condensed ? 'sm:py-3' : 'sm:py-5'
          )}
        >
          <Wordmark compact={condensed} />
        </div>

        <nav
          className="hidden flex-1 items-center gap-1 lg:flex"
          aria-label="Primary"
        >
          {navLinks.map((link) => {
            const active =
              pathname === link.href ||
              (link.href !== '/' && pathname.startsWith(link.href));
            return (
              <div
                key={link.href}
                className="relative"
                onMouseEnter={() => (link.menu ? enter(link.menu) : setOpenMenu(null))}
              >
                <Link
                  href={link.href}
                  className={cn(
                    'relative block px-3 py-2 font-display text-sm font-medium tracking-[-0.01em] transition-colors',
                    active ? 'text-pigment-indigo' : 'text-ink-soft hover:text-ink'
                  )}
                  aria-expanded={link.menu ? openMenu === link.menu : undefined}
                >
                  {link.label}
                  <span
                    className={cn(
                      'absolute -bottom-px left-3 right-3 h-px origin-left bg-pigment-indigo',
                      active || openMenu === link.menu ? 'scale-x-100' : 'scale-x-0'
                    )}
                    aria-hidden="true"
                  />
                </Link>
              </div>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-1 lg:gap-2">
          <ThemeToggle className="mr-1 hidden sm:inline-flex" />

          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-sm text-ink-soft transition-colors hover:bg-paper-sunk hover:text-ink"
            aria-label="Search the catalogue"
          >
            <Search className="h-[1.15rem] w-[1.15rem]" strokeWidth={1.6} />
          </button>

          <Link
            href="/account?tab=wishlist"
            className="relative hidden h-9 w-9 items-center justify-center rounded-sm text-ink-soft transition-colors hover:bg-paper-sunk hover:text-ink sm:flex"
            aria-label={`Wishlist, ${wishlist.length} items`}
          >
            <Heart className="h-[1.15rem] w-[1.15rem]" strokeWidth={1.6} />
            {wishlist.length > 0 && (
              <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-pigment-madder" />
            )}
          </Link>

          <Link
            href="/account"
            className="hidden h-9 w-9 items-center justify-center rounded-sm text-ink-soft transition-colors hover:bg-paper-sunk hover:text-ink sm:flex"
            aria-label="Account"
          >
            <User className="h-[1.15rem] w-[1.15rem]" strokeWidth={1.6} />
          </Link>

          <button
            type="button"
            onClick={() => setCartOpen(true)}
            className="relative ml-1 flex items-center gap-2 rounded-sm border border-rule-strong px-3 py-2 text-sm font-medium transition-colors hover:border-pigment-indigo hover:bg-paper-sunk"
            aria-label={`Cart, ${cartCount} items`}
          >
            <ShoppingBag className="h-[1.15rem] w-[1.15rem]" strokeWidth={1.6} />
            <span className="font-mono text-xs tabular">{cartCount}</span>
          </button>

          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                className="flex h-9 w-9 items-center justify-center rounded-sm text-ink-soft transition-colors hover:bg-paper-sunk hover:text-ink lg:hidden"
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" strokeWidth={1.6} />
              </button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="w-full border-rule bg-paper p-0 sm:max-w-md"
            >
              <SheetHeader className="border-b border-rule px-5 py-4 text-left">
                <SheetTitle className="font-display text-base">Menu</SheetTitle>
              </SheetHeader>
              <div className="h-[calc(100vh-4rem)] overflow-y-auto px-5 py-4">
                <div className="mb-4 flex items-center justify-between border-b border-rule pb-4">
                  <span className="text-sm text-ink-soft">Substrate</span>
                  <ThemeToggle />
                </div>
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="categories" className="border-rule">
                    <AccordionTrigger className="font-display text-sm hover:no-underline">
                      Categories
                    </AccordionTrigger>
                    <AccordionContent>
                      <CategoryMenu onNavigate={() => setMobileOpen(false)} />
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="brands" className="border-rule">
                    <AccordionTrigger className="font-display text-sm hover:no-underline">
                      Brands
                    </AccordionTrigger>
                    <AccordionContent>
                      <BrandMenu onNavigate={() => setMobileOpen(false)} />
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
                <nav className="mt-2 flex flex-col" aria-label="Mobile">
                  {navLinks
                    .filter((l) => !l.menu)
                    .concat([
                      { label: 'FAQ', href: '/faq' },
                      { label: 'Account', href: '/account' },
                    ])
                    .map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        onClick={() => setMobileOpen(false)}
                        className="border-b border-rule py-3.5 font-display text-sm font-medium last:border-0"
                      >
                        {link.label}
                      </Link>
                    ))}
                </nav>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* The menu drops out of the header like pigment spreading from a contact point. */}
      <div
        className={cn(
          'absolute inset-x-0 top-full hidden origin-top border-b bg-paper transition-colors duration-300 lg:block',
          openMenu
            ? 'visible border-rule-strong opacity-100 shadow-lift'
            : 'invisible -translate-y-1 border-transparent opacity-0'
        )}
        onMouseEnter={() => clearTimeout(closeTimer.current)}
        onMouseLeave={leave}
      >
        <div className="mx-auto max-w-[86rem] px-4 py-8 sm:px-6 lg:px-10">
          {openMenu === 'categories' && <CategoryMenu />}
          {openMenu === 'brands' && <BrandMenu />}
        </div>
      </div>
    </header>
  );
}
