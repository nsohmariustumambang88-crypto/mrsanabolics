import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Hero } from '@/components/home/hero';
import { FeaturedCategories } from '@/components/home/categories';
import { ProductsSection } from '@/components/home/products-section';
import { PopularBrands } from '@/components/home/brands';
import { FeaturedCollections } from '@/components/home/featured-collections';
import { WhyChoose } from '@/components/home/why-choose';
import { BlogTeaser } from '@/components/home/blog-teaser';
import { DeliveryStrip } from '@/components/i18n/delivery-strip';
import { doors, spread, PER_DOOR } from '@/components/home/home-samples';
import { toJournalCard } from '@/lib/journal/fields';
import { getBlogPosts, getBrands, getProducts, toSummary } from '@/lib/db/catalogue';
import { dictionary } from '@/lib/i18n/dictionaries';
import { INTL_SEO } from '@/lib/i18n/collections';
import { isIntlLocale, type IntlLocale } from '@/lib/i18n/locales';
import { homeDelivery, intlMetadata } from '@/lib/i18n/page';
import { localizedHref } from '@/lib/i18n/routes';
import { SITE } from '@/lib/site';

/*
  The home page in Spanish, French, German and Italian: /es, /fr, /de, /it.

  A translation of the English home page's catalogue sections, not of all of it. Left out, on
  purpose:
    - the offer card and weekly deals: their wording is long, and with reference prices switched
      off (lib/pricing.ts) they show little that the best-seller grid does not;
    - testimonials: they are quotations, and a translated quotation is words the customer did not
      write;
    - the trust badges and the assurance band: they state third-party testing, a certificate with
      every order and years of experience, none of which the catalogue can show (CLAUDE.md, "The
      hero's right-hand column"), and repeating them in four more languages would repeat the claim;
    - the newsletter box: its consent sentence is a legal record (lib/marketing/consent.ts) and a
      translation needs its own wording entry, which is the owner's decision.
  In their place is one ruled line saying what delivery to the language's own country costs.
*/

type Params = { params: { lang: string } };

export const revalidate = 3600;

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  if (!isIntlLocale(params.lang)) return {};
  const locale = params.lang;
  const brands = await getBrands();
  const seo = INTL_SEO[locale];
  return intlMetadata(locale, '/', seo.homeTitle, seo.homeDescription(brands.length), { absoluteTitle: true });
}

export default async function TranslatedHome({ params }: Params) {
  if (!isIntlLocale(params.lang)) notFound();
  const locale: IntlLocale = params.lang;
  const t = dictionary(locale).home;

  const [products, posts, delivery] = await Promise.all([getProducts(), getBlogPosts(), homeDelivery(locale)]);

  const photographed = products.filter((p) => Boolean(p.images[0]));
  const doorSamples = Object.fromEntries(
    doors.map((door) => [
      door.slug,
      spread(photographed.filter((p) => door.categories.includes(p.categorySlug)), PER_DOOR).map(toSummary),
    ])
  );
  const bestSellers = products.filter((p) => p.isBestSeller);

  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: t.bestSellers,
    itemListElement: bestSellers.slice(0, 8).map((p, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `${SITE.url}/product/${p.slug}`,
      name: p.name,
    })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemList) }} />
      <Hero />
      <DeliveryStrip locale={locale} delivery={delivery} />
      <FeaturedCollections samples={doorSamples} />
      <ProductsSection
        title={t.bestSellers}
        description={t.bestSellersBody}
        href={localizedHref(locale, '/shop?filter=best-sellers')}
        products={bestSellers.slice(0, 8).map(toSummary)}
      />
      <FeaturedCategories />
      <WhyChoose />
      <PopularBrands />
      <BlogTeaser posts={posts.slice(0, 4).map(toJournalCard)} />
    </>
  );
}
