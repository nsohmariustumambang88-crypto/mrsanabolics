'use client';

import * as React from 'react';
import Link from 'next/link';
import { SectionHeading } from '@/components/product/section-heading';
import { ProductPlate } from '@/components/product/product-plate';
import { useCategories } from '@/components/providers/catalogue-provider';
import { TILES, PER_TILE } from '@/components/home/home-samples';
import { categoryPigment } from '@/lib/site';
import { categoryPath } from '@/lib/catalogue/paths';
import type { ProductSummary } from '@/lib/types';

/*
  What each category actually holds.

  Three versions of this block have existed. It was a fake Instagram strip — borrowed social
  proof this build cannot honestly claim. Then it was a marbled sheet per category, drawn live
  from that category's pigment: honest, and pretty, and it told a visitor nothing. Six abstract
  swirls labelled "Injectables" and "Orals" answer no question a shopper has.

  Now each tile is a sample of the real goods: four photographs taken from that category, under
  the category's own pigment rule and its real count. The colour system survives — the pigment
  is still what identifies a category everywhere on the site — but it is now a frame around
  evidence rather than a substitute for it.

  The sample is SPREAD across the category rather than taken from the front. Products are
  ordered by group, so the first four in "Injectables" are four vials of the same compound from
  four manufacturers, which photographs as one product repeated. Even spacing shows the range.
*/

export function InstagramGallery({ samples }: { samples: Record<string, ProductSummary[]> }) {
  const categories = useCategories();
  /* The samples are chosen on the server; see app/(storefront)/page.tsx. */
  const tiles = React.useMemo(
    () => categories.slice(0, TILES).map((category) => ({ category, sample: samples[category.slug] ?? [] })),
    [categories, samples]
  );

  return (
    <section className="border-b border-rule bg-paper-sunk">
      <div className="mx-auto max-w-[86rem] px-4 py-12 sm:px-6 sm:py-16 lg:px-10 lg:py-20">
        <SectionHeading
          title="What each pigment holds"
          description="Every category carries its own colour through the whole site. What is under each one is the stock itself — four taken from across the shelf, not the first four on it."
          href="/categories"
          hrefLabel="Open the index"
        />

        {/*
          Two columns on a phone, not one.

          A single column gives each tile the full width, and with a 2x2 montage inside it that
          made this the tallest section on the page — 2,755px, taller than the hero and the best
          sellers together. Two columns halve it and the montage is still legible at ~95px a
          photograph, which is what the previous design used before the tiles held anything.
        */}
        <div className="mt-8 grid grid-cols-2 gap-px bg-rule sm:mt-10 lg:grid-cols-3">
          {tiles.map(({ category, sample }) => (
            <Link
              key={category.slug}
              href={categoryPath(category.slug)}
              className="group flex flex-col bg-card transition-colors hover:bg-paper-sunk"
            >
              {/* The pigment reads as a plate rule above the goods, as it does on a product card. */}
              <span
                className="block h-px w-full"
                style={{ backgroundColor: categoryPigment(category.slug) }}
                aria-hidden="true"
              />

              <div className="grid grid-cols-2 gap-px bg-rule">
                {sample.map((product: ProductSummary) => (
                  <span
                    key={product.id}
                    className="relative aspect-square overflow-hidden bg-paper-sunk"
                  >
                    <ProductPlate
                      product={product}
                      showMarking={false}
                      sizes="(min-width: 1024px) 15vw, (min-width: 640px) 22vw, 45vw"
                    />
                  </span>
                ))}

                {/* A category with fewer than four photographed products still closes its grid. */}
                {Array.from({ length: Math.max(0, PER_TILE - sample.length) }).map((_, i) => (
                  <span key={`filler-${i}`} className="aspect-square bg-paper-sunk" />
                ))}
              </div>

              <div className="flex items-center gap-2.5 p-4">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: categoryPigment(category.slug) }}
                  aria-hidden="true"
                />
                <span className="text-sm font-medium transition-colors group-hover:text-pigment-indigo">
                  {category.name}
                </span>
                <span className="ml-auto font-mono text-2xs text-ink-faint tabular">
                  {category.listed}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
