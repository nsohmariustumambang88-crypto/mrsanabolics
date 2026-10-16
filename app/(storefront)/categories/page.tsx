import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { getCategories } from '@/lib/db/catalogue';
import { GridFillers } from '@/components/layout/grid-fillers';
import { categoryPigment, SITE } from '@/lib/site';
import { categoryPath } from '@/lib/catalogue/paths';
import { CATEGORY_COPY } from '@/lib/catalogue/collection-copy';

/* Server component: a pure index needs no client JS, and now it can carry its own metadata. */

export const metadata: Metadata = {
  title: 'Shop by Category: Steroids, Peptides, SARMs and PCT',
  description:
    'Injectable and oral steroids, post-cycle and estrogen control, peptides, SARMs and growth hormone, fat burners and more, each broken down by compound.',
  alternates: { canonical: '/categories' },
};

export const revalidate = 3600;

export default async function CategoriesPage() {
  const categories = await getCategories();

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Categories',
    url: `${SITE.url}/categories`,
    hasPart: categories.map((c) => ({
      '@type': 'CollectionPage',
      name: c.name,
      description: c.description,
      url: `${SITE.url}${categoryPath(c.slug)}`,
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />

      <section className="border-b border-rule">
        <div className="mx-auto max-w-[86rem] px-4 py-12 sm:px-6 lg:px-10 lg:py-16">
          <h1 className="font-display text-[clamp(2rem,4vw,3.25rem)] font-semibold leading-[1.02] tracking-[-0.04em]">
            Shop by category
          </h1>
          <p className="measure mt-4 text-sm leading-relaxed text-ink-soft sm:text-base">
            {categories.length} categories, each broken down by compound, so every
            manufacturer’s version of the same substance can be compared on one page.
          </p>
        </div>
      </section>

      <section>
        <div className="mx-auto max-w-[86rem] px-4 py-10 sm:px-6 lg:px-10">
          <div className="grid gap-px bg-rule sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((category) => {
              const listed = category.listed;

              return (
                <Link
                  key={category.slug}
                  href={categoryPath(category.slug)}
                  className="group relative flex flex-col bg-card p-6 transition-colors duration-300 hover:bg-paper-raised lg:p-7"
                >
                  <span
                    className="h-px w-12"
                    style={{ backgroundColor: categoryPigment(category.slug) }}
                    aria-hidden="true"
                  />

                  <h2 className="mt-5 font-display text-xl font-semibold tracking-[-0.025em] transition-colors group-hover:text-pigment-indigo">
                    {CATEGORY_COPY[category.slug]?.heading ?? category.name}
                  </h2>

                  <p className="mt-3 flex-1 text-sm leading-relaxed text-ink-soft">
                    {category.description}
                  </p>

                  <p className="mt-6 flex items-center justify-between border-t border-rule pt-4 font-mono text-2xs uppercase tracking-[0.14em] text-ink-faint">
                    <span className="tabular">{listed} listed</span>
                    <ArrowUpRight
                      className="h-3.5 w-3.5"
                      strokeWidth={1.75}
                    />
                  </p>
                </Link>
              );
            })}
            <GridFillers len={categories.length} wide={3} ground="bg-background" />
          </div>
        </div>
      </section>
    </>
  );
}
