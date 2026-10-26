'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowRight, Check } from 'lucide-react';
import { MarbleBath } from '@/components/ebru/marble-bath';
import { BullMark } from '@/components/brand/bull-mark';
import { useCategories, useBrands } from '@/components/providers/catalogue-provider';
import { useLocale } from '@/components/i18n/use-locale';
import { categoryPigment } from '@/lib/site';
import { categoryPath } from '@/lib/catalogue/paths';
import { categoryName, dictionary, type Dictionary } from '@/lib/i18n/dictionaries';
import { localizedHref } from '@/lib/i18n/routes';
import type { Locale } from '@/lib/i18n/locales';
import { DELIVERY_PAGES } from '@/lib/countries';

function linksFor(t: Dictionary, locale: Locale) {
  return {
    shop: [
      { label: t.footer.allCompounds, href: localizedHref(locale, '/shop') },
      { label: t.footer.categories, href: '/categories' },
      { label: t.footer.brands, href: '/brands' },
      { label: t.footer.weeklyDeals, href: localizedHref(locale, '/shop?filter=deals') },
    ],
    read: [
      { label: t.footer.journal, href: '/blog' },
      { label: t.footer.questions, href: '/faq' },
      { label: t.footer.about, href: '/about' },
      { label: t.footer.contact, href: '/contact' },
    ],
    account: [
      { label: t.footer.yourAccount, href: '/account' },
      { label: t.footer.orders, href: '/account?tab=orders' },
      { label: t.footer.wishlist, href: '/account?tab=wishlist' },
      { label: t.footer.signIn, href: '/auth' },
    ],
    /* The countries with a delivery page of their own, then every zone on one page. */
    delivery: [
      ...DELIVERY_PAGES.map((d) => ({ label: t.country.names[d.code], href: `/delivery/${d.slug}` })),
      { label: t.footer.allCountries, href: '/delivery' },
    ],
  };
}

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

function Newsletter({ t }: { t: Dictionary }) {
  const [email, setEmail] = React.useState('');
  const [sent, setSent] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError(t.footer.invalidEmail);
      return;
    }
    setError(null);
    setSent(true);
  };

  return (
    <div>
      <h3 className="font-mono text-2xs uppercase tracking-[0.18em] text-ink-faint">
        {t.footer.newBatches}
      </h3>
      <p className="measure-tight mt-4 text-sm leading-relaxed text-ink-soft">
        {t.footer.newsletterBody}
      </p>

      {sent ? (
        <p className="mt-4 flex items-center gap-2 text-sm text-pigment-verdigris">
          <Check className="h-4 w-4" strokeWidth={2} />
          {t.footer.added}
        </p>
      ) : (
        <form onSubmit={submit} className="mt-4" noValidate>
          <div className="flex items-stretch border-b border-rule-strong focus-within:border-pigment-indigo">
            <label htmlFor="footer-email" className="sr-only">
              {t.footer.emailLabel}
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
              aria-label={t.footer.subscribe}
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
  const locale = useLocale();
  const t = dictionary(locale);
  const links = linksFor(t, locale);

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
        <div className="grid gap-10 py-14 md:grid-cols-2 lg:grid-cols-6 lg:gap-8">
          <div className="lg:col-span-2">
            <Link href={localizedHref(locale, '/')} className="flex items-center gap-3">
              <BullMark className="w-20 shrink-0" />
              <span className="font-display text-lg font-semibold tracking-[-0.03em]">
                MrsAnabolics
              </span>
            </Link>
            <p className="measure-tight mt-5 text-sm leading-relaxed text-ink-soft">
              {t.footer.tagline}
            </p>
            <div className="mt-6 flex flex-wrap gap-1.5">
              {categories.slice(0, 8).map((c) => (
                <Link
                  key={c.slug}
                  href={localizedHref(locale, categoryPath(c.slug))}
                  className="group inline-flex items-center gap-1.5 rounded-full border border-rule px-2.5 py-1 text-xs text-ink-soft transition-colors hover:border-pigment-indigo-lift hover:text-ink"
                >
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: categoryPigment(c.slug) }}
                    aria-hidden="true"
                  />
                  {categoryName(locale, c.slug, c.name)}
                </Link>
              ))}
            </div>
          </div>

          <LinkColumn heading={t.footer.shop} links={links.shop} />
          <LinkColumn heading={t.footer.read} links={links.read} />
          <LinkColumn heading={t.footer.account} links={links.account} />
          <LinkColumn heading={t.footer.delivery} links={links.delivery} />
        </div>

        <div className="border-t border-rule py-10">
          <div className="grid gap-10 md:grid-cols-2">
            <Newsletter t={t} />
            <div>
              <h3 className="font-mono text-2xs uppercase tracking-[0.18em] text-ink-faint">
                {t.footer.manufacturers}
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

        <div className="flex flex-col gap-4 border-t border-rule py-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-mono text-2xs uppercase tracking-[0.14em] text-ink-faint">
            © {new Date().getFullYear()} MrsAnabolics
          </p>
          <nav aria-label="Legal" className="flex flex-wrap gap-x-6 gap-y-2">
            {[
              { label: t.footer.terms, href: '/legal/terms' },
              { label: t.footer.privacy, href: '/legal/privacy' },
              { label: t.footer.shipping, href: '/legal/shipping' },
              { label: t.footer.returns, href: '/legal/returns' },
            ].map((l) => (
              <Link
                key={l.label}
                href={l.href}
                className="font-mono text-2xs uppercase tracking-[0.14em] text-ink-faint transition-colors hover:text-ink-soft"
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}
