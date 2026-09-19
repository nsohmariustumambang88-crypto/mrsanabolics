'use client';

import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { SectionHeading } from '@/components/product/section-heading';
import { useCategories } from '@/components/providers/catalogue-provider';
import { categoryPigment } from '@/lib/site';
import { categoryPath } from '@/lib/catalogue/paths';

/*
  The pigment index.

  This was a grid of eleven same-size cards, each icon-plus-heading-plus-text — the lazy
  container, and one of two identical card grids carrying the page. It is now what it actually
  is: an index. Ruled rows, a swatch of the category's own pigment, the count set in tabular
  figures, read straight down like a plate list rather than scanned as tiles.
*/

export function FeaturedCategories() {
  const categories = useCategories();

  return (
    <section className="border-b border-rule">
      <div className="mx-auto max-w-[86rem] px-4 py-12 sm:px-6 sm:py-16 lg:px-10 lg:py-20">
        <SectionHeading
          title="Browse by category"
          description="Each category is broken down by compound, so every manufacturer’s version can be compared on one page."
          href="/categories"
          hrefLabel="Open the index"
        />

        <ul className="mt-8 sm:mt-10 grid border-t border-rule md:grid-cols-2 md:gap-x-12">
          {categories.map((category) => (
            <li key={category.slug}>
              <Link
                href={categoryPath(category.slug)}
                className="group grid grid-cols-[auto_minmax(0,1fr)_auto] items-baseline gap-3.5 border-b border-rule py-3.5 transition-colors hover:bg-paper-sunk sm:gap-5 sm:py-4"
              >
                <span
                  className="h-2.5 w-2.5 shrink-0 translate-y-[-1px] rounded-full"
                  style={{ backgroundColor: categoryPigment(category.slug) }}
                  aria-hidden="true"
                />

                <span className="min-w-0">
                  <span className="block font-display text-base font-semibold tracking-[-0.02em] transition-colors group-hover:text-pigment-indigo">
                    {category.name}
                  </span>
                  <span className="mt-1 block text-sm leading-snug text-ink-faint">
                    {category.description}
                  </span>
                </span>

                <span className="flex items-center gap-3 font-mono text-2xs uppercase tracking-[0.14em] text-ink-faint">
                  <span className="tabular">{category.listed}</span>
                  <ArrowUpRight
                    className="h-3.5 w-3.5 opacity-0 transition-colors duration-300 group-hover:opacity-100"
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
