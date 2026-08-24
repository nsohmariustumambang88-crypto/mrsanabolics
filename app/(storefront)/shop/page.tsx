import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ShopBrowser } from '@/components/shop/shop-browser';
import { getProducts } from '@/lib/db/catalogue';
import { SITE } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Shop all compounds',
  description:
    'Browse the full catalogue by category, manufacturer, and price. Every product carries its specification, batch testing, and directions.',
  alternates: { canonical: '/shop' },
};

export const revalidate = 60;

export default async function ShopPage() {
  const products = await getProducts();

  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'MrAnabolics catalogue',
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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemList) }}
      />
      <Suspense fallback={<div className="min-h-screen" />}>
        <ShopBrowser />
      </Suspense>
    </>
  );
}
