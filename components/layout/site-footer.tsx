'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowRight, Check } from 'lucide-react';
import { MarbleBath } from '@/components/ebru/marble-bath';
import { BullMark } from '@/components/brand/bull-mark';
import { useCategories, useBrands } from '@/components/providers/catalogue-provider';
import { categoryPigment } from '@/lib/site';
import { categoryPath } from '@/lib/catalogue/paths';

const shopLinks = [
  { label: 'All compounds', href: '/shop' },
  { label: 'Categories', href: '/categories' },
  { label: 'Brands', href: '/brands' },
  { label: 'Weekly deals', href: '/shop?filter=deals' },
];

const readLinks = [
  { label: 'Journal', href: '/blog' },
  { label: 'Questions', href: '/faq' },
  { label: 'About', href: '/about' },
  { label: 'Contact', href: '/contact' },
];

const accountLinks = [
  { label: 'Your account', href: '/account' },
  { label: 'Orders', href: '/account?tab=orders' },
  { label: 'Wishlist', href: '/account?tab=wishlist' },
  { label: 'Sign in', href: '/auth' },
];

function LinkColumn({
  heading,
  links,
}: {
  heading: string;
  links: { label: string; href: string }[];
}) {
  return (
    <div>
      <h3 className="font-mono text-2xs uppercase tracking-[0.18em] text-ink-faint">
        {heading}
      </h3>
      <ul className="mt-4 space-y-2.5">
        {links.map((l) => (
          <li key={l.href + l.label}>
            <Link
              href={l.href}
              className="text-sm text-ink-soft transition-colors hover:text-pigment-indigo"
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Newsletter() {
  const [email, setEmail] = React.useState('');
  const [sent, setSent] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('That address is missing an @ or a domain.');
      return;
    }
    setError(null);
    setSent(true);
  };

  return (
    <div>
      <h3 className="font-mono text-2xs uppercase tracking-[0.18em] text-ink-faint">
        New batches
      </h3>
      <p className="measure-tight mt-4 text-sm leading-relaxed text-ink-soft">
        One note when a batch is released, with its certificate attached. Nothing else.
      </p>

      {sent ? (
        <p className="mt-4 flex items-center gap-2 text-sm text-pigment-verdigris">
          <Check className="h-4 w-4" strokeWidth={2} />
          Added. Watch for the next release note.
        </p>
      ) : (
        <form onSubmit={submit} className="mt-4" noValidate>
          <div className="flex items-stretch border-b border-rule-strong focus-within:border-pigment-indigo">
            <label htmlFor="footer-email" className="sr-only">
              Email address
            </label>
            <input
              id="footer-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@domain.com"
              className="w-full bg-transparent py-2 text-sm text-ink outline-none placeholder:text-ink-faint"
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? 'footer-email-error' : undefined}
            />
            <button
              type="submit"
              className="flex items-center px-2 text-ink-soft transition-colors hover:text-pigment-indigo"
              aria-label="Subscribe"
            >
              <ArrowRight className="h-4 w-4" strokeWidth={1.75} />
            </button>
          </div>
          {error && (
            <p id="footer-email-error" className="mt-2 text-xs text-destructive">
              {error}
            </p>
          )}
        </form>
      )}
    </div>
  );
}

export function SiteFooter() {
  const categories = useCategories();
  const brands = useBrands();

  return (
    <footer className="relative mt-24 border-t border-rule bg-paper-sunk">
      {/* The edge of the bath: the sheet ends, the size continues. */}
      <div className="relative h-24 overflow-hidden border-b border-rule sm:h-32">
        <MarbleBath
          className="absolute inset-0 h-full w-full"
          seed={412}
          density={0.45}
          animate={false}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-paper-sunk via-paper-sunk/40 to-transparent" />
      </div>

      <div className="mx-auto max-w-[86rem] px-4 sm:px-6 lg:px-10">
        <div className="grid gap-10 py-14 md:grid-cols-2 lg:grid-cols-5 lg:gap-8">
          <div className="lg:col-span-2">
            <Link href="/" className="flex items-center gap-3">
              <BullMark className="w-20 shrink-0" />
              <span className="font-display text-lg font-semibold tracking-[-0.03em]">
                MrAnabolics
              </span>
            </Link>
            <p className="measure-tight mt-5 text-sm leading-relaxed text-ink-soft">
              Every compound is a suspension held at a concentration. We publish the
              specification, the batch, and the protocol for each one, then let you read it
              before you decide.
            </p>
            <div className="mt-6 flex flex-wrap gap-1.5">
              {categories.slice(0, 8).map((c) => (
                <Link
                  key={c.slug}
                  href={categoryPath(c.slug)}
                  className="group inline-flex items-center gap-1.5 rounded-full border border-rule px-2.5 py-1 text-xs text-ink-soft transition-colors hover:border-pigment-indigo-lift hover:text-ink"
                >
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: categoryPigment(c.slug) }}
                    aria-hidden="true"
                  />
                  {c.name}
                </Link>
              ))}
            </div>
          </div>

          <LinkColumn heading="Shop" links={shopLinks} />
          <LinkColumn heading="Read" links={readLinks} />
          <LinkColumn heading="Account" links={accountLinks} />
        </div>

        <div className="border-t border-rule py-10">
          <div className="grid gap-10 md:grid-cols-2">
            <Newsletter />
            <div>
              <h3 className="font-mono text-2xs uppercase tracking-[0.18em] text-ink-faint">
                Manufacturers
              </h3>
              <ul className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2.5">
                {brands.map((b) => (
                  <li key={b.slug}>
                    <Link
                      href={`/brands/${b.slug}`}
                      className="text-sm text-ink-soft transition-colors hover:text-pigment-indigo"
                    >
                      {b.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/*
          The site-wide "Demonstration build" paragraph that stood here was removed at the owner's
          request. Demo content is still labelled where it appears: the testimonials section, the
          About timeline, and the checkout and payment panels each carry their own notice.
        */}

        <div className="flex flex-col gap-4 border-t border-rule py-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-mono text-2xs uppercase tracking-[0.14em] text-ink-faint">
            © {new Date().getFullYear()} MrAnabolics
          </p>
          <nav aria-label="Legal" className="flex flex-wrap gap-x-6 gap-y-2">
            {['Terms', 'Privacy', 'Shipping', 'Returns'].map((l) => (
              <Link
                key={l}
                href="/faq"
                className="font-mono text-2xs uppercase tracking-[0.14em] text-ink-faint transition-colors hover:text-ink-soft"
              >
                {l}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}
