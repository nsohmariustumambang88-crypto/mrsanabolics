import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getBlogPosts, toSummary } from '@/lib/db/catalogue';
import { getCategoryCollection, type CategoryCollection, type GroupCollection } from '@/lib/db/collections';
import { CATEGORY_COPY } from '@/lib/catalogue/collection-copy';
import { fitDescription, shortRange } from '@/lib/catalogue/seo';
import { formatPriceShort } from '@/lib/format';
import { SITE } from '@/lib/site';
import { categoryName, dictionary } from '@/lib/i18n/dictionaries';
import { INTL_CATEGORY, INTL_SEO, andListIn, intlGroupName, type TranslatedCategory } from '@/lib/i18n/collections';
import { intlCategoryFaq } from '@/lib/i18n/collection-faq';
import { isIntlLocale, withLocale, type IntlLocale } from '@/lib/i18n/locales';
import { TRANSLATED_CATEGORIES, localizedHref } from '@/lib/i18n/routes';
import { homeDelivery, intlMetadata } from '@/lib/i18n/page';
import { ProductGrid } from '@/components/product/product-grid';
import {
  CollectionBreadcrumb,
  CollectionFaq,
  CollectionHeader,
  GroupDirectory,
  ManufacturerList,
  RelatedReading,
  SectionTitle,
} from '@/components/shop/collection-sections';

/*
  A translated category page: /es/shop/injectables. The English page's structure, with the
  category's copy from lib/i18n/collections.ts and every figure computed from the same
  collection. Only the steroid categories are translated (lib/i18n/routes.ts).
*/

type Params = { params: { lang: string; category: string } };

export const revalidate = 3600;

export function generateStaticParams() {
  return TRANSLATED_CATEGORIES.map((category) => ({ category }));
}

function isTranslated(slug: string): slug is TranslatedCategory {
  return (TRANSLATED_CATEGORIES as readonly string[]).includes(slug);
}

async function load(params: Params['params']) {
  if (!isIntlLocale(params.lang) || !isTranslated(params.category)) return null;
  const category = await getCategoryCollection(params.category);
  if (!category) return null;
  return { locale: params.lang, category, copy: INTL_CATEGORY[params.lang][params.category] };
}

const groupNamer = (locale: IntlLocale, category: CategoryCollection) => (g: GroupCollection) =>
  intlGroupName(locale, `${category.slug}/${g.slug}`, g.name);

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const found = await load(params);
  if (!found) return {};
  const { locale, category, copy } = found;
  const seo = INTL_SEO[locale];
  const f = category.facts;
  const delivery = await homeDelivery(locale);
  const nameOf = groupNamer(locale, category);

  const from = f.priceFrom !== null ? formatPriceShort(f.priceFrom) : null;
  const title = seo.categoryTitle(copy.heading, seo.categoryScope(category.groups.length, f.listings), from);
  const range = shortRange(f);
  const lead = seo.categoryLead(copy.heading, f.listings, f.manufacturers.length);
  const priced = range ? seo.priced(range) : '';
  const shipping = delivery ? seo.shipping(delivery.country, formatPriceShort(delivery.rates[0].price)) : '';
  const including = category.groups.length > 0 ? seo.including(andListIn(locale, category.groups.slice(0, 3).map(nameOf))) : '';
  const description = fitDescription([
    `${lead}${including}${priced}.${shipping}`,
    `${lead}${priced}.${shipping}`,
    `${lead}${priced}.`,
  ]);
  return intlMetadata(locale, category.path, title, description);
}

export default async function TranslatedCategoryPage({ params }: Params) {
  const found = await load(params);
  if (!found) notFound();
  const { locale, category, copy } = found;
  const t = dictionary(locale).collection;
  const nameOf = groupNamer(locale, category);
  const words = { heading: copy.heading, label: copy.label };

  const [posts, delivery] = await Promise.all([getBlogPosts(), homeDelivery(locale)]);
  const articles = (CATEGORY_COPY[category.slug]?.articles ?? [])
    .map((slug) => posts.find((p) => p.slug === slug))
    .filter((p): p is NonNullable<typeof p> => !!p)
    .map((p) => ({ slug: p.slug, title: p.title, excerpt: p.excerpt }));

  const featured = [...category.products]
    .sort(
      (a, b) =>
        Number(!!b.isBestSeller) - Number(!!a.isBestSeller) ||
        Number(b.inStock) - Number(a.inStock) ||
        a.name.localeCompare(b.name)
    )
    .slice(0, 12);

  const faq = intlCategoryFaq(locale, category, { label: copy.label, groupName: (key, fb) => intlGroupName(locale, key, fb) }, delivery);
  const path = withLocale(locale, category.path);
  const url = `${SITE.url}${path}`;
  const shopPath = withLocale(locale, '/shop');

  const schema = [
    {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      '@id': `${url}#page`,
      name: copy.heading,
      description: copy.intro.join(' '),
      url,
      inLanguage: locale,
      isPartOf: { '@id': `${SITE.url}/#website` },
      mainEntity: {
        '@type': 'ItemList',
        numberOfItems: category.groups.length || category.products.length,
        itemListElement: category.groups
          .map((g) => ({ name: nameOf(g), url: `${SITE.url}${localizedHref(locale, g.path)}` }))
          .map((item, i) => ({ '@type': 'ListItem', position: i + 1, ...item })),
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: t.home, item: `${SITE.url}${withLocale(locale, '/')}` },
        { '@type': 'ListItem', position: 2, name: t.shop, item: `${SITE.url}${shopPath}` },
        { '@type': 'ListItem', position: 3, name: categoryName(locale, category.slug, category.name), item: url },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      inLanguage: locale,
      mainEntity: faq.map((f) => ({
        '@type': 'Question',
        name: f.question,
        acceptedAnswer: { '@type': 'Answer', text: f.link ? `${f.answer} ${f.link.label}` : f.answer },
      })),
    },
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />

      <CollectionBreadcrumb trail={[{ name: t.shop, href: shopPath }, { name: categoryName(locale, category.slug, category.name) }]} />

      <CollectionHeader
        heading={t.forSale(copy.heading)}
        intro={copy.intro}
        facts={category.facts}
        compounds={category.groups.length || undefined}
        locale={locale}
      />

      <div className="mx-auto max-w-[86rem] space-y-16 px-4 py-12 sm:px-6 lg:px-10 lg:py-16">
        {category.groups.length > 0 && (
          <section aria-labelledby="by-compound">
            <SectionTitle id="by-compound">{t.browseByCompound(words)}</SectionTitle>
            <p className="measure mt-2 text-sm leading-relaxed text-ink-soft">{t.browseByCompoundBody}</p>
            <div className="mt-6">
              <GroupDirectory groups={category.groups} locale={locale} nameOf={nameOf} />
            </div>
          </section>
        )}

        <section aria-labelledby="listings">
          <SectionTitle id="listings">{t.featured(words)}</SectionTitle>
          <div className="mt-6">
            <ProductGrid products={featured.map(toSummary)} columns={4} />
          </div>
        </section>

        <section aria-labelledby="makers">
          <SectionTitle id="makers">{t.manufacturersTitle}</SectionTitle>
          <p className="measure mt-2 text-sm leading-relaxed text-ink-soft">
            {t.manufacturersBody(category.facts.manufacturers.length)}
          </p>
          <div className="mt-6">
            <ManufacturerList facts={category.facts} />
          </div>
        </section>

        <section aria-labelledby="questions">
          <SectionTitle id="questions">{t.questions}</SectionTitle>
          <div className="mt-6">
            <CollectionFaq items={faq} />
          </div>
        </section>

        {articles.length > 0 && (
          <section aria-labelledby="reading">
            <SectionTitle id="reading">{t.beforeYouBuy}</SectionTitle>
            <p className="measure mt-2 text-sm leading-relaxed text-ink-soft">{t.guidesInEnglish}</p>
            <div className="mt-6" lang="en">
              <RelatedReading articles={articles} />
            </div>
          </section>
        )}
      </div>
    </>
  );
}
