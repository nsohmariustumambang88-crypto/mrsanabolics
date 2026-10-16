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
import { factsFor } from '@/lib/db/collections';
import { andList, fitDescription, getUsDelivery, shortRange, usShippingLine } from '@/lib/catalogue/seo';
import { formatPriceShort } from '@/lib/format';
import type { Product } from '@/lib/types';

/** The compound groups a manufacturer's listings fall under, most listings first. */
function groupsOf(list: Product[]): string[] {
  const counts = new Map<string, number>();
  for (const p of list) if (p.subcategoryName) counts.set(p.subcategoryName, (counts.get(p.subcategoryName) ?? 0) + 1);
  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([g]) => g);
}

/*
  "Hemi Pharma: 20 listings across 14 compounds, including Winstrol (Stanozolol), Anavar
  (Oxandrolone) and Clomid (Clomiphene), priced $40 to $85." Computed from the listings, so it
  changes when the catalogue does.
*/
function brandFacts(name: string, list: Product[]) {
  const f = factsFor(list);
  const groups = groupsOf(list);
  const range = shortRange(f);
  const sentence =
    list.length === 0
      ? ''
      : `${list.length} ${list.length === 1 ? 'listing' : 'listings'}` +
        (groups.length > 1 ? ` across ${groups.length} compounds, including ${andList(groups.slice(0, 3))}` : groups.length === 1 ? ` under ${groups[0]}` : '') +
        (range ? `, priced ${range.replace('–', ' to ')}` : '') +
        `. ${f.inStock} in stock.`;
  return { f, groups, range, sentence, name };
}

type Params = { params: { slug: string } };

export async function generateStaticParams() {
  const slugs = await getBrandSlugs();
  return slugs.map((slug) => ({ slug }));
}

export const revalidate = 3600;

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const brand = await getBrandBySlug(params.slug);
  if (!brand) return { title: 'Manufacturer not found' };
  const [list, usDelivery] = await Promise.all([getProductsByBrand(brand.slug), getUsDelivery()]);
  const { f, groups, range } = brandFacts(brand.name, list);

  const title =
    list.length > 0
      ? `${brand.name} Products for Sale: ${list.length} ${list.length === 1 ? 'Listing' : 'Listings'}${f.priceFrom !== null ? ` from ${formatPriceShort(f.priceFrom)}` : ''}`
      : brand.name;
  const lead = `${brand.name} products for sale: ${list.length} ${list.length === 1 ? 'listing' : 'listings'}`;
  const shipping = usShippingLine(usDelivery);
  const description =
    list.length > 0
      ? fitDescription([
          `${lead}${groups.length > 0 ? `, including ${andList(groups.slice(0, 3))}` : ''}${range ? `, priced ${range}` : ''}.${shipping}`,
          `${lead}${groups.length > 0 ? `, including ${andList(groups.slice(0, 2))}` : ''}${range ? `, priced ${range}` : ''}.${shipping}`,
          `${lead}${range ? `, priced ${range}` : ''}.${shipping}`,
        ])
      : brand.description;

  return {
    title,
    description,
    alternates: { canonical: `/brands/${brand.slug}` },
    openGraph: {
      type: 'website',
      url: `${SITE.url}/brands/${brand.slug}`,
      title,
      description,
    },
  };
}

export default async function BrandPage({ params }: Params) {
  const brand = await getBrandBySlug(params.slug);
  if (!brand) notFound();

  const list = await getProductsByBrand(brand.slug);
  const { sentence } = brandFacts(brand.name, list);
  const url = `${SITE.url}/brands/${brand.slug}`;

  const schema = [
    {
      '@context': 'https://schema.org',
      '@type': 'Brand',
      name: brand.name,
      description: brand.description,
      url: `${SITE.url}/brands/${brand.slug}`,
    },
    ...(list.length > 0
      ? [
          {
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            '@id': `${url}#page`,
            name: `${brand.name} products`,
            description: sentence,
            url,
            isPartOf: { '@id': `${SITE.url}/#website` },
            mainEntity: {
              '@type': 'ItemList',
              numberOfItems: list.length,
              itemListElement: list.map((p, i) => ({
                '@type': 'ListItem',
                position: i + 1,
                name: p.name,
                url: `${SITE.url}/product/${p.slug}`,
              })),
            },
          },
        ]
      : []),
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
            {list.length > 0 ? `${brand.name} products` : brand.name}
          </h1>
          <p className="measure mt-4 text-sm leading-relaxed text-ink-soft sm:text-base">
            {brand.description}
          </p>
          {sentence && (
            <p className="measure mt-4 text-sm leading-relaxed text-ink-soft sm:text-base">{sentence}</p>
          )}
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
                Nothing from {brand.name} is listed right now
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
