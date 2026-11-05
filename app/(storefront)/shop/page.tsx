import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ShopBrowser, ShopBrowserStatic } from '@/components/shop/shop-browser';
import { SHOP_PAGE_SIZE, priceCeiling } from '@/lib/catalogue/browse';
import { CatalogueDirectory, SectionTitle } from '@/components/shop/collection-sections';
import { getProducts, toSummary } from '@/lib/db/catalogue';
import { getCategoryCollections } from '@/lib/db/collections';
import { SITE } from '@/lib/site';
import { factsFor } from '@/lib/db/collections';
import { fitDescription, getUsDelivery, shortRange, usShippingLine } from '@/lib/catalogue/seo';
import { formatPriceShort } from '@/lib/format';
import { alternatesFor } from '@/lib/i18n/routes';

/* Counts and prices computed from the catalogue, so the snippet stays true as stock changes. */
export async function generateMetadata(): Promise<Metadata> {
  const [products, usDelivery] = await Promise.all([getProducts(), getUsDelivery()]);
  const f = factsFor(products);
  const range = shortRange(f);
  const title = `Buy Steroids, Peptides and SARMs: ${f.listings} Listings${f.priceFrom !== null ? ` from ${formatPriceShort(f.priceFrom)}` : ''}`;
  const description = fitDescription([
    `Injectable and oral steroids, post-cycle, peptides, SARMs and more for sale: ${f.listings} listings from ${f.manufacturers.length} manufacturers${range ? `, priced ${range}` : ''}.${usShippingLine(usDelivery)}`,
    `Steroids, peptides and SARMs for sale: ${f.listings} listings from ${f.manufacturers.length} manufacturers${range ? `, priced ${range}` : ''}.`,
  ]);
  return { title, description, alternates: alternatesFor('en', '/shop'), openGraph: { type: 'website', url: `${SITE.url}/shop`, title, description } };
}

export const revalidate = 3600;

/*
  The shop has two layers, and only one of them is visible to a crawler.

  ShopBrowser is interactive — filters, sorting, search — and reads the query string, so it is
  rendered in the browser inside a Suspense boundary. The HTML a crawler receives holds only
  that boundary's fallback: it used to be an empty box, which left /shop with no heading and not
  one product link. The fallback now carries the page's heading, and the directory below the
  browser is server-rendered, linking every category and compound page — which in turn link every
  product.
*/
export default async function ShopPage() {
  const [products, categories] = await Promise.all([getProducts(), getCategoryCollections()]);

  /* The unfiltered first page, exactly as /api/catalogue would answer it. */
  const firstPage = {
    items: products.slice(0, SHOP_PAGE_SIZE).map(toSummary),
    total: products.length,
    ceiling: priceCeiling(products),
  };

  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `${SITE.name} catalogue`,
    numberOfItems: products.length,
    itemListElement: products.map((p, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `${SITE.url}/product/${p.slug}`,
      name: p.name,
    })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemList) }} />
      {/* The fallback is what the HTML carries: the same view, unfiltered, with its first page
          of products. See ShopBrowserStatic. */}
      <Suspense fallback={<ShopBrowserStatic initial={firstPage} heading="Shop all products" />}>
        <ShopBrowser initial={firstPage} heading="Shop all products" />
      </Suspense>

      <section aria-labelledby="directory" className="border-t border-rule">
        <div className="mx-auto max-w-[86rem] px-4 py-12 sm:px-6 lg:px-10 lg:py-16">
          <SectionTitle id="directory">Browse by category and compound</SectionTitle>
          <p className="measure mt-2 text-sm leading-relaxed text-ink-soft">
            Every compound has its own page comparing each manufacturer’s version by strength,
            form and price.
          </p>
          <div className="mt-6">
            <CatalogueDirectory categories={categories} />
          </div>
        </div>
      </section>
    </>
  );
}
