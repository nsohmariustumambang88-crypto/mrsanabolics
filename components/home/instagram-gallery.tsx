'use client';

import Link from 'next/link';
import { MarbleBath } from '@/components/ebru/marble-bath';
import { SectionHeading } from '@/components/product/section-heading';
import { useCategories } from '@/components/providers/catalogue-provider';
import { categoryPigment, slugSeed } from '@/lib/site';

/*
  Was a fake Instagram strip — borrowed social proof this build cannot honestly claim.

  Now it shows the real thing the site is made of: a sheet floated for each category from its
  own pigment and its own seed, drawn live by the same engine as the hero. Nothing here is
  stock, and nothing claims an audience we do not have.
*/

export function InstagramGallery() {
  const categories = useCategories();
  const shown = categories.slice(0, 6);

  return (
    <section className="border-b border-rule bg-paper-sunk">
      <div className="mx-auto max-w-[86rem] px-4 py-12 sm:px-6 sm:py-16 lg:px-10 lg:py-20">
        <SectionHeading
          title="One sheet per pigment"
          description="Each category carries its own colour through the whole site. These sheets are floated live in your browser from that pigment — same maths as the bath at the top of the page."
          href="/categories"
          hrefLabel="Open the index"
        />

        <div className="mt-8 sm:mt-10 grid grid-cols-2 gap-px bg-rule md:grid-cols-3">
          {shown.map((category) => (
            <Link
              key={category.slug}
              href={`/shop?category=${category.slug}`}
              className="group relative aspect-[4/3] overflow-hidden bg-card"
            >
              <MarbleBath
                className="absolute inset-0 h-full w-full"
                seed={slugSeed(category.slug)}
                density={0.45}
                animate={false}
                pigments={[
                  '--size-coat',
                  `--cat-${category.slug}`,
                  '--paper-raised',
                  '--pig-indigo',
                ]}
              />

              <div className="absolute inset-x-0 bottom-0 flex items-center gap-2.5 bg-gradient-to-t from-card via-card/85 to-transparent p-4 pt-10">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: categoryPigment(category.slug) }}
                  aria-hidden="true"
                />
                <span className="text-sm font-medium transition-colors group-hover:text-pigment-indigo">
                  {category.name}
                </span>
                <span className="ml-auto font-mono text-2xs text-ink-faint tabular">
                  {category.productCount}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
