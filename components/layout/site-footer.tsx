import Link from 'next/link';
import {
  Mail,
  Phone,
  MapPin,
  ShieldCheck,
  Truck,
  RotateCcw,
  Lock,
  Instagram,
  Twitter,
  Facebook,
  Youtube,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { categories } from '@/lib/data/categories';

const trustItems = [
  { icon: ShieldCheck, title: 'Lab Verified', desc: 'Third-party tested' },
  { icon: Truck, title: 'Fast Shipping', desc: '24h dispatch' },
  { icon: RotateCcw, title: 'Easy Returns', desc: '14-day policy' },
  { icon: Lock, title: 'Secure Checkout', desc: '256-bit encryption' },
];

const linkGroups = [
  {
    title: 'Shop',
    links: [
      { label: 'All Products', href: '/shop' },
      { label: 'Best Sellers', href: '/shop?filter=best-sellers' },
      { label: 'New Arrivals', href: '/shop?filter=new' },
      { label: 'Weekly Deals', href: '/shop?filter=deals' },
      { label: 'Bundles', href: '/shop?category=bundles' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About Us', href: '/about' },
      { label: 'Contact', href: '/contact' },
      { label: 'Blog', href: '/blog' },
      { label: 'FAQ', href: '/faq' },
      { label: 'My Account', href: '/account' },
    ],
  },
  {
    title: 'Support',
    links: [
      { label: 'Shipping Info', href: '/faq' },
      { label: 'Returns & Refunds', href: '/faq' },
      { label: 'Privacy Policy', href: '/faq' },
      { label: 'Terms of Service', href: '/faq' },
      { label: 'Track Order', href: '/account?tab=orders' },
    ],
  },
];

const socials = [
  { icon: Instagram, href: '#', label: 'Instagram' },
  { icon: Twitter, href: '#', label: 'Twitter' },
  { icon: Facebook, href: '#', label: 'Facebook' },
  { icon: Youtube, href: '#', label: 'YouTube' },
];

export function SiteFooter() {
  return (
    <footer className="relative mt-24 border-t border-border/60 bg-black">
      <div className="mx-auto max-w-7xl px-4 py-16 lg:px-6">
        <div className="grid gap-8 lg:grid-cols-4">
          {trustItems.map((item, i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-2xl border border-border/40 bg-secondary/30 p-4"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent/10">
                <item.icon className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="text-sm font-semibold">{item.title}</p>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-16 grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-emerald-600">
                <span className="font-display text-lg font-extrabold text-black">
                  M
                </span>
              </div>
              <span className="font-display text-lg font-bold tracking-tight">
                MrAnabolics
              </span>
            </Link>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
              Premium, lab-tested performance supplements for serious athletes
              and researchers. Discreet shipping to over 40 countries, backed by
              independent third-party testing on every batch.
            </p>
            <div className="mt-6 space-y-2 text-sm text-muted-foreground">
              <a
                href="mailto:support@mranabolics.example.com"
                className="flex items-center gap-2 transition-colors hover:text-foreground"
              >
                <Mail className="h-4 w-4 text-accent" />
                support@mranabolics.example.com
              </a>
              <a
                href="tel:+18005550100"
                className="flex items-center gap-2 transition-colors hover:text-foreground"
              >
                <Phone className="h-4 w-4 text-accent" />
                +1 (800) 555-0100
              </a>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-accent" />
                Zurich, Switzerland
              </div>
            </div>
            <div className="mt-6 flex gap-2">
              {socials.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  aria-label={s.label}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-border/60 text-muted-foreground transition-colors hover:border-accent hover:text-accent"
                >
                  <s.icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {linkGroups.map((group) => (
            <div key={group.title} className="lg:col-span-2">
              <h4 className="text-sm font-semibold uppercase tracking-wider">
                {group.title}
              </h4>
              <ul className="mt-4 space-y-2.5">
                {group.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div className="lg:col-span-2">
            <h4 className="text-sm font-semibold uppercase tracking-wider">
              Categories
            </h4>
            <ul className="mt-4 space-y-2.5">
              {categories.slice(0, 6).map((c) => (
                <li key={c.slug}>
                  <Link
                    href={`/shop?category=${c.slug}`}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 rounded-2xl border border-border/40 bg-gradient-to-br from-secondary/40 to-transparent p-6">
          <div className="flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="font-display text-xl font-bold">
                Join the inner circle
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Exclusive offers, new product alerts, and research guides —
                straight to your inbox.
              </p>
            </div>
            <form className="flex w-full max-w-md gap-2">
              <Input
                type="email"
                placeholder="your@email.com"
                className="bg-background"
              />
              <Button type="submit" className="bg-accent text-black hover:bg-accent/90">
                Subscribe
              </Button>
            </form>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border/40 pt-8 text-sm text-muted-foreground md:flex-row">
          <p>© {new Date().getFullYear()} MrAnabolics. All rights reserved.</p>
          <div className="flex gap-6">
            <Link href="/faq" className="transition-colors hover:text-foreground">
              Privacy
            </Link>
            <Link href="/faq" className="transition-colors hover:text-foreground">
              Terms
            </Link>
            <Link href="/faq" className="transition-colors hover:text-foreground">
              Refund Policy
            </Link>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <Lock className="h-3.5 w-3.5 text-accent" />
            <span>Secure 256-bit SSL encryption</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
