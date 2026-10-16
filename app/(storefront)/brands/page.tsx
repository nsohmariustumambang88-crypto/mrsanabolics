import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { getBrands } from '@/lib/db/catalogue';
import { SITE } from '@/lib/site';
import { andList, fitDescription } from '@/lib/catalogue/seo';

/*
  Computed from the brands table. The old description said every manufacturer "holds its own
  testing chain", which nothing in the catalogue shows.
*/
export async function generateMetadata(): Promise<Metadata> {
  const brands = (await getBrands()).filter((b) => b.productCount > 0).sort((a, b) => b.productCount - a.productCount);
  const title = `Steroid and Peptide Manufacturers: ${brands.length} Brands`;
  const description = fitDescription(
    [4, 3, 2].map(
      (n) =>
        `All ${brands.length} manufacturers in the catalogue, including ${andList(brands.slice(0, n).map((b) => b.name))}. Each has a page listing its products and prices.`
    )
  );
  return { title, description, alternates: { canonical: '/brands' }, openGraph: { type: 'website', url: `${SITE.url}/brands`, title, description } };
}

export const revalidate = 3600;

export default async function BrandsPage() {
  const brands = await getBrands();

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Manufacturers',
    url: `${SITE.url}/brands`,
    hasPart: brands.map((b) => ({
      '@type': 'Brand',
      name: b.name,
      description: b.description,
      url: `${SITE.url}/brands/${b.slug}`,
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
            Who makes it
          </h1>
          <p className="measure mt-4 text-sm leading-relaxed text-ink-soft sm:text-base">
            The name on the vial is the name accountable for the assay. Each manufacturer
            below holds its own specification, its own chain of custody, and its own testing
            arrangement.
          </p>
        </div>
      </section>

      <section>
        <div className="mx-auto max-w-[86rem] px-4 py-10 sm:px-6 lg:px-10">
          <ul className="border-t border-rule">
            {brands.map((brand) => {
              const listed = brand.listed;
              return (
                <li key={brand.slug}>
                  <Link
                    href={`/brands/${brand.slug}`}
                    className="group grid items-baseline gap-2 border-b border-rule py-6 transition-colors hover:bg-paper-sunk sm:grid-cols-[minmax(0,16rem)_1fr_auto] sm:gap-8 sm:px-2"
                  >
                    <h2 className="font-display text-xl font-semibold tracking-[-0.025em] transition-colors group-hover:text-pigment-indigo">
                      {brand.name}
                    </h2>
                    <p className="text-sm leading-relaxed text-ink-soft">
                      {brand.description}
                    </p>
                    <p className="flex items-center gap-3 font-mono text-2xs uppercase tracking-[0.14em] text-ink-faint">
                      <span className="tabular">
                        {listed > 0 ? `${listed} listed` : `${brand.productCount} items`}
                      </span>
                      <ArrowUpRight
                        className="h-3.5 w-3.5"
                        strokeWidth={1.75}
                      />
                    </p>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </section>
    </>
  );
}
