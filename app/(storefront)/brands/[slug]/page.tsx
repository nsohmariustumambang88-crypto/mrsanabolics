import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import {
  getBrandBySlug,
  getBrandSlugs,
  getProductsByBrand,
} from '@/lib/db/catalogue';
import { ProductGrid } from '@/components/product/product-grid';
import { SITE, UNDER_HEADER_INSET } from '@/lib/site';

type Params = { params: { slug: string } };

export async function generateStaticParams() {
  const slugs = await getBrandSlugs();
  return slugs.map((slug) => ({ slug }));
}

export const revalidate = 60;

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const brand = await getBrandBySlug(params.slug);
  if (!brand) return { title: 'Manufacturer not found' };

  return {
    title: brand.name,
    description: brand.description,
    alternates: { canonical: `/brands/${brand.slug}` },
    openGraph: {
      type: 'website',
      url: `${SITE.url}/brands/${brand.slug}`,
      title: `${brand.name} — ${SITE.name}`,
      description: brand.description,
    },
  };
}

export default async function BrandPage({ params }: Params) {
  const brand = await getBrandBySlug(params.slug);
  if (!brand) notFound();

  const list = await getProductsByBrand(brand.slug);

  const schema = [
    {
      '@context': 'https://schema.org',
      '@type': 'Brand',
      name: brand.name,
      description: brand.description,
      url: `${SITE.url}/brands/${brand.slug}`,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Manufacturers',
          item: `${SITE.url}/brands`,
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: brand.name,
          item: `${SITE.url}/brands/${brand.slug}`,
        },
      ],
    },
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />

      <nav aria-label="Breadcrumb" className="border-b border-rule bg-paper-sunk">
        <ol className={`mx-auto flex max-w-[86rem] items-center gap-1.5 font-mono text-2xs uppercase tracking-[0.14em] text-ink-faint ${UNDER_HEADER_INSET}`}>
          <li>
            <Link href="/brands" className="transition-colors hover:text-ink">
              Manufacturers
            </Link>
          </li>
          <ChevronRight className="h-3 w-3" strokeWidth={1.75} aria-hidden="true" />
          <li className="text-ink-soft" aria-current="page">
            {brand.name}
          </li>
        </ol>
      </nav>

      <section className="border-b border-rule">
        <div className="mx-auto max-w-[86rem] px-4 py-12 sm:px-6 lg:px-10 lg:py-16">
          <h1 className="font-display text-[clamp(2rem,4vw,3.25rem)] font-semibold leading-[1.02] tracking-[-0.04em]">
            {brand.name}
          </h1>
          <p className="measure mt-4 text-sm leading-relaxed text-ink-soft sm:text-base">
            {brand.description}
          </p>
          <p className="mt-6 font-mono text-2xs uppercase tracking-[0.14em] text-ink-faint tabular">
            {list.length} listed in this catalogue
          </p>
        </div>
      </section>

      <section>
        <div className="mx-auto max-w-[86rem] px-4 py-10 sm:px-6 lg:px-10">
          {list.length === 0 ? (
            <div className="border border-rule bg-card px-6 py-20 text-center">
              <h2 className="font-display text-xl font-semibold tracking-[-0.025em]">
                Nothing from {brand.name} in the bath right now
              </h2>
              <p className="measure-tight mx-auto mt-3 text-sm leading-relaxed text-ink-soft">
                This manufacturer has no products listed in the current catalogue.
              </p>
              <Link
                href="/shop"
                className="mt-6 inline-block rounded-full bg-pigment-indigo px-6 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-pigment-indigo-lift"
              >
                Browse everything
              </Link>
            </div>
          ) : (
            <ProductGrid products={list} columns={4} />
          )}
        </div>
      </section>
    </>
  );
}
