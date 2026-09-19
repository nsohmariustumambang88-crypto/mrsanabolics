'use client';

import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { SectionHeading } from '@/components/product/section-heading';
import { useBrands } from '@/components/providers/catalogue-provider';

/*
  How many manufacturers the home page names.

  All 41 used to be listed here, which ran to 5,600px on a phone — nineteen per cent of the
  page, spent on a directory that /brands already is. The provider sorts brands by how many
  products carry them, so the first eight are the ones a visitor is most likely to have come
  for, and "All manufacturers" carries the rest.
*/
const SHOWN = 8;

export function PopularBrands() {
  const brands = useBrands();
  const shown = brands.slice(0, SHOWN);
  const remaining = brands.length - shown.length;

  return (
    <section className="border-b border-rule">
      <div className="mx-auto max-w-[86rem] px-4 py-12 sm:px-6 sm:py-16 lg:px-10 lg:py-20">
        <SectionHeading
          title="Who makes it"
          description="The manufacturers in this catalogue. Each one’s page lists everything it makes here."
          href="/brands"
          hrefLabel="All manufacturers"
        />

        <ul className="mt-8 sm:mt-10 border-t border-rule">
          {shown.map((brand) => (
            <li key={brand.slug}>
              <Link
                href={`/brands/${brand.slug}`}
                /* One gap per breakpoint: this carried both sm:gap-2 and sm:gap-8, which are the
                   same property at the same width and resolve by stylesheet order rather than
                   intent. The row is a three-column grid from sm up and wants the wider one. */
                className="group grid items-baseline gap-1.5 border-b border-rule py-4 transition-colors hover:bg-paper-sunk sm:grid-cols-[minmax(0,14rem)_1fr_auto] sm:gap-8 sm:px-2 sm:py-5"
              >
                <span className="font-display text-base font-semibold tracking-[-0.025em] sm:text-lg transition-colors group-hover:text-pigment-indigo">
                  {brand.name}
                </span>
                <span className="text-sm leading-relaxed text-ink-soft">
                  {brand.description}
                </span>
                <span className="flex items-center gap-3 font-mono text-2xs uppercase tracking-[0.14em] text-ink-faint">
                  <span className="tabular">{brand.productCount} items</span>
                  <ArrowUpRight
                    className="h-3.5 w-3.5"
                    strokeWidth={1.75}
                  />
                </span>
              </Link>
            </li>
          ))}
        </ul>

        {remaining > 0 && (
          <p className="mt-5 text-sm text-ink-soft">
            <Link
              href="/brands"
              className="underline decoration-rule-strong underline-offset-4 transition-colors hover:text-pigment-indigo hover:decoration-pigment-indigo"
            >
              {remaining} more {remaining === 1 ? 'manufacturer' : 'manufacturers'}
            </Link>{' '}
            in the index.
          </p>
        )}
      </div>
    </section>
  );
}
