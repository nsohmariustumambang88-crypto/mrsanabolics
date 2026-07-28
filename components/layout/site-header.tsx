'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Heart,
  User,
  ShoppingBag,
  Menu,
  ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { categories } from '@/lib/data/categories';
import { brands } from '@/lib/data/brands';
import { cn } from '@/lib/utils';

const navLinks = [
  { label: 'Home', href: '/' },
  { label: 'Shop', href: '/shop' },
  { label: 'Categories', href: '/categories', hasMenu: true, menuType: 'categories' },
  { label: 'Brands', href: '/brands', hasMenu: true, menuType: 'brands' },
  { label: 'Blog', href: '/blog' },
  { label: 'FAQ', href: '/faq' },
  { label: 'About', href: '/about' },
  { label: 'Contact', href: '/contact' },
];

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5 group">
      <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-emerald-600 transition-transform group-hover:scale-105">
        <span className="font-display text-lg font-extrabold text-black">M</span>
        <div className="absolute inset-0 rounded-xl bg-accent/40 blur-md -z-10" />
      </div>
      <div className="flex flex-col leading-none">
        <span className="font-display text-lg font-bold tracking-tight">
          MrAnabolics
        </span>
        <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Premium Performance
        </span>
      </div>
    </Link>
  );
}

export function SiteHeader() {
  const pathname = usePathname();
  const { cartCount, wishlist, setCartOpen, setSearchOpen } = useStore();
  const [scrolled, setScrolled] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [openMenu, setOpenMenu] = React.useState<string | null>(null);

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  return (
    <header
      className={cn(
        'sticky top-0 z-40 w-full transition-all duration-500',
        scrolled
          ? 'glass-strong border-b border-border/40 shadow-lg shadow-black/40'
          : 'bg-transparent'
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 lg:px-6">
        <div className="flex items-center gap-3">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[320px] p-0">
              <SheetHeader className="border-b border-border p-4">
                <SheetTitle>
                  <Logo />
                </SheetTitle>
              </SheetHeader>
              <div className="px-4 py-4">
                <Accordion type="multiple">
                  <AccordionItem value="categories" className="border-b">
                    <AccordionTrigger className="text-sm font-semibold">
                      Categories
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="flex flex-col gap-1 pb-2">
                        {categories.map((c) => (
                          <Link
                            key={c.slug}
                            href={`/shop?category=${c.slug}`}
                            onClick={() => setMobileOpen(false)}
                            className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                          >
                            {c.name}
                          </Link>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="brands" className="border-b">
                    <AccordionTrigger className="text-sm font-semibold">
                      Brands
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="flex flex-col gap-1 pb-2">
                        {brands.map((b) => (
                          <Link
                            key={b.slug}
                            href={`/brands/${b.slug}`}
                            onClick={() => setMobileOpen(false)}
                            className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                          >
                            {b.name}
                          </Link>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
                <nav className="mt-4 flex flex-col gap-1">
                  {navLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        'rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
                        isActive(link.href)
                          ? 'bg-secondary text-foreground'
                          : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                      )}
                    >
                      {link.label}
                    </Link>
                  ))}
                  <Link
                    href="/account"
                    onClick={() => setMobileOpen(false)}
                    className="rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                  >
                    Account
                  </Link>
                </nav>
              </div>
            </SheetContent>
          </Sheet>
          <Logo />
        </div>

        <nav className="hidden items-center gap-0.5 lg:flex">
          {navLinks.map((link) => (
            <div
              key={link.href}
              className="relative"
              onMouseEnter={() => link.hasMenu && setOpenMenu(link.menuType!)}
              onMouseLeave={() => setOpenMenu(null)}
            >
              <Link
                href={link.href}
                className={cn(
                  'flex items-center gap-1 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors',
                  isActive(link.href)
                    ? 'text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {link.label}
                {link.hasMenu && (
                  <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', openMenu === link.menuType && 'rotate-180')} />
                )}
              </Link>
              <AnimatePresence>
                {link.hasMenu && openMenu === link.menuType && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                    className="absolute left-0 top-full z-50 w-72 pt-2"
                  >
                    <div className="glass-strong overflow-hidden rounded-2xl border border-white/10 p-2 shadow-2xl shadow-black/60">
                      {link.menuType === 'categories' &&
                        categories.slice(0, 8).map((c) => (
                          <Link
                            key={c.slug}
                            href={`/shop?category=${c.slug}`}
                            className="group flex items-center justify-between rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                          >
                            {c.name}
                            <span className="text-xs text-muted-foreground/60">{c.productCount}</span>
                          </Link>
                        ))}
                      {link.menuType === 'brands' &&
                        brands.slice(0, 8).map((b) => (
                          <Link
                            key={b.slug}
                            href={`/brands/${b.slug}`}
                            className="group flex items-center justify-between rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                          >
                            {b.name}
                            <span className="text-xs text-muted-foreground/60">{b.productCount}</span>
                          </Link>
                        ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </nav>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Search"
            onClick={() => setSearchOpen(true)}
            className="relative"
          >
            <Search className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Wishlist"
            asChild
            className="relative"
          >
            <Link href="/account?tab=wishlist">
              <Heart className="h-5 w-5" />
              {wishlist.length > 0 && (
                <Badge className="absolute -right-0.5 -top-0.5 h-4 min-w-4 justify-center bg-accent px-1 text-[10px] font-bold text-black">
                  {wishlist.length}
                </Badge>
              )}
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Account"
            asChild
            className="hidden sm:flex"
          >
            <Link href="/account">
              <User className="h-5 w-5" />
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Cart"
            onClick={() => setCartOpen(true)}
            className="relative"
          >
            <ShoppingBag className="h-5 w-5" />
            {cartCount > 0 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 500, damping: 25 }}
              >
                <Badge className="absolute -right-0.5 -top-0.5 h-4 min-w-4 justify-center bg-accent px-1 text-[10px] font-bold text-black">
                  {cartCount}
                </Badge>
              </motion.div>
            )}
          </Button>
        </div>
      </div>
    </header>
  );
}
