import type { Metadata } from 'next';
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { ShopBrowser } from '@/components/shop/shop-browser';
import { CatalogueDirectory, SectionTitle } from '@/components/shop/collection-sections';
import { getProducts } from '@/lib/db/catalogue';
import { factsFor, getCategoryCollections, type GroupCollection } from '@/lib/db/collections';
import { fitDescription, shortRange } from '@/lib/catalogue/seo';
import { formatPriceShort } from '@/lib/format';
import { categoryName, dictionary } from '@/lib/i18n/dictionaries';
import { INTL_SEO, intlGroupName } from '@/lib/i18n/collections';
import { isIntlLocale, type IntlLocale } from '@/lib/i18n/locales';
import { homeDelivery, intlMetadata } from '@/lib/i18n/page';
import { SITE } from '@/lib/site';

/*
  /shop in Spanish, French, German and Italian. The same two layers as the English page: the
  interactive browser (client-rendered, its labels in the page's language) and, beneath it, the
  server-rendered directory that gives a crawler a link to every category and compound. Compounds
  with a translated page link to it; the rest link to English and are marked EN.
*/

type Params = { params: { lang: string } };

export const revalidate = 3600;

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  if (!isIntlLocale(params.lang)) return {};
  const locale = params.lang;
  const [products, delivery] = await Promise.all([getProducts(), homeDelivery(locale)]);
  const f = factsFor(products);
  const seo = INTL_SEO[locale];
  const range = shortRange(f);
  const shipping = delivery ? seo.shipping(delivery.country, formatPriceShort(delivery.rates[0].price)) : '';
  const title = seo.shopTitle(f.listings, f.priceFrom !== null ? formatPriceShort(f.priceFrom) : null);
  const description = fitDescription([
    `${seo.shopDescription(f.listings, f.manufacturers.length, range)}${shipping}`,
    seo.shopDescription(f.listings, f.manufacturers.length, range),
  ]);
  return intlMetadata(locale, '/shop', title, description);
}

export default async function TranslatedShop({ params }: Params) {
  if (!isIntlLocale(params.lang)) notFound();
  const locale: IntlLocale = params.lang;
  const t = dictionary(locale).shop;
  const [products, categories] = await Promise.all([getProducts(), getCategoryCollections()]);

  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `${SITE.name} — ${t.catalogue}`,
    numberOfItems: products.length,
    itemListElement: products.map((p, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `${SITE.url}/product/${p.slug}`,
      name: p.name,
    })),
  };

  const nameOf = (g: GroupCollection) => intlGroupName(locale, `${g.categorySlug}/${g.slug}`, g.name);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemList) }} />
      <Suspense
        fallback={
          <section className="min-h-screen border-b border-rule">
            <div className="mx-auto max-w-[86rem] px-4 py-12 sm:px-6 lg:px-10 lg:py-16">
              <h1 className="font-display text-[clamp(2rem,4vw,3.25rem)] font-semibold leading-[1.02] tracking-[-0.04em]">
                {t.heading}
              </h1>
              <p className="measure mt-4 text-sm leading-relaxed text-ink-soft sm:text-base">
                {t.count(products.length, categories.length)}
              </p>
            </div>
          </section>
        }
      >
        <ShopBrowser />
      </Suspense>

      <section aria-labelledby="directory" className="border-t border-rule">
        <div className="mx-auto max-w-[86rem] px-4 py-12 sm:px-6 lg:px-10 lg:py-16">
          <SectionTitle id="directory">{t.directory}</SectionTitle>
          <p className="measure mt-2 text-sm leading-relaxed text-ink-soft">{t.directoryBody}</p>
          <div className="mt-6">
            <CatalogueDirectory
              categories={categories}
              locale={locale}
              categoryNameOf={(c) => categoryName(locale, c.slug, c.name)}
              nameOf={nameOf}
            />
          </div>
        </div>
      </section>
    </>
  );
}
