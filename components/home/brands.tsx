'use client';

import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { SectionHeading } from '@/components/product/section-heading';
import { useBrands } from '@/components/providers/catalogue-provider';

export function PopularBrands() {
  const brands = useBrands();

  return (
    <section className="border-b border-rule">
      <div className="mx-auto max-w-[86rem] px-4 py-12 sm:px-6 sm:py-16 lg:px-10 lg:py-20">
        <SectionHeading
          title="Who makes it"
          description="Each manufacturer holds its own specification and its own testing chain. The name on the vial is the name accountable for the assay."
          href="/brands"
          hrefLabel="All manufacturers"
        />

        <ul className="mt-8 sm:mt-10 border-t border-rule">
          {brands.map((brand) => (
            <li key={brand.slug}>
              <Link
                href={`/brands/${brand.slug}`}
                className="group grid items-baseline gap-1.5 border-b border-rule py-4 transition-colors sm:gap-2 sm:py-5 hover:bg-paper-sunk sm:grid-cols-[minmax(0,14rem)_1fr_auto] sm:gap-8 sm:px-2"
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
      </div>
    </section>
  );
}
