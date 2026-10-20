import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getBlogPosts, toSummary } from '@/lib/db/catalogue';
import { getCategoryCollections, getGroupCollection, pricesByStrength } from '@/lib/db/collections';
import { CATEGORY_COPY } from '@/lib/catalogue/collection-copy';
import { commonStrengths, fitDescription, shortRange } from '@/lib/catalogue/seo';
import { formatPriceShort } from '@/lib/format';
import { SITE } from '@/lib/site';
import { categoryName, dictionary } from '@/lib/i18n/dictionaries';
import {
  INTL_CATEGORY,
  INTL_GROUP,
  INTL_SEO,
  intlGroupName,
  runningName,
  type TranslatedCategory,
  type TranslatedGroup,
} from '@/lib/i18n/collections';
import { intlGroupFaq } from '@/lib/i18n/collection-faq';
import { isIntlLocale, withLocale } from '@/lib/i18n/locales';
import { TRANSLATED_GROUPS, localizedHref } from '@/lib/i18n/routes';
import { homeDelivery, intlMetadata } from '@/lib/i18n/page';
import { ProductGrid } from '@/components/product/product-grid';
import {
  CollectionBreadcrumb,
  CollectionFaq,
  CollectionHeader,
  ComparisonTable,
  ManufacturerList,
  RelatedReading,
  SectionTitle,
  StrengthPriceTable,
  priceRange,
} from '@/components/shop/collection-sections';

/*
  A translated compound page: /de/shop/injectables/testosterone-enanthate.

  The English page's structure and every one of its computed figures — listings, makers,
  strengths, prices, stock — with the compound's name and description from
  lib/i18n/collections.ts. Product names, manufacturer names and prices are as they are on the
  English page. The URL keeps the English segments, so the five languages of one compound are
  the same path under five prefixes and hreflang can pair them without a lookup table.
*/

type Params = { params: { lang: string; category: string; group: string } };

export const revalidate = 3600;

export function generateStaticParams() {
  return TRANSLATED_GROUPS.map((key) => {
    const [category, group] = key.split('/');
    return { category, group };
  });
}

function isTranslated(key: string): key is TranslatedGroup {
  return (TRANSLATED_GROUPS as readonly string[]).includes(key);
}

async function load(params: Params['params']) {
  const key = `${params.category}/${params.group}`;
  if (!isIntlLocale(params.lang) || !isTranslated(key)) return null;
  const found = await getGroupCollection(params.category, params.group);
  if (!found) return null;
  const locale = params.lang;
  return {
    locale,
    key,
    ...found,
    copy: INTL_GROUP[locale][key],
    categoryCopy: INTL_CATEGORY[locale][params.category as TranslatedCategory],
  };
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const found = await load(params);
  if (!found) return {};
  const { locale, group, copy } = found;
  const seo = INTL_SEO[locale];
  const f = group.facts;
  const delivery = await homeDelivery(locale);

  const title = seo.groupTitle(copy.title, f.priceFrom !== null ? formatPriceShort(f.priceFrom) : null);
  const strengths = commonStrengths(f);
  const range = shortRange(f);
  const lead =
    f.listings === 1
      ? seo.groupLeadOne(copy.title, f.manufacturers[0].name)
      : seo.groupLead(copy.title, f.listings, f.manufacturers.length);
  const detail = [strengths ? seo.inStrengths(strengths.replace(/ and /g, ` ${seo.and} `)) : '', range ? seo.priced(range).replace(/^, /, '') : '']
    .filter(Boolean)
    .join(', ');
  const priced = range ? seo.priced(range) : '';
  const shipping = delivery ? seo.shipping(delivery.country, formatPriceShort(delivery.rates[0].price)) : '';
  const description = fitDescription([
    `${lead}${detail ? `, ${detail}` : ''}.${shipping}`,
    `${lead}${priced}.${shipping}`,
    `${lead}${priced}.`,
  ]);
  return intlMetadata(locale, group.path, title, description);
}

export default async function TranslatedGroupPage({ params }: Params) {
  const found = await load(params);
  if (!found) notFound();
  const { locale, category, group, copy, categoryCopy } = found;
  const t = dictionary(locale).collection;
  const words = { heading: categoryCopy.heading, label: categoryCopy.label };

  const [posts, allCategories, delivery] = await Promise.all([getBlogPosts(), getCategoryCollections(), homeDelivery(locale)]);
  const articles = (CATEGORY_COPY[category.slug]?.articles ?? [])
    .map((slug) => posts.find((p) => p.slug === slug))
    .filter((p): p is NonNullable<typeof p> => !!p)
    .map((p) => ({ slug: p.slug, title: p.title, excerpt: p.excerpt }));

  /* The same compound in the other category (oral and injectable Winstrol), in this language when translated. */
  const alternate =
    allCategories
      .filter((c) => c.slug !== category.slug)
      .flatMap((c) => c.groups.filter((g) => g.slug === group.slug).map((g) => ({ c, g })))
      .map(({ c, g }) => {
        const key = `${c.slug}/${g.slug}`;
        const translated = isTranslated(key) ? INTL_GROUP[locale][key] : null;
        return {
          title: translated?.title ?? g.name,
          path: localizedHref(locale, g.path),
          listings: g.facts.listings,
        };
      })[0] ?? null;

  const byStrength = pricesByStrength(group.products);
  const label = runningName(locale, copy.name);
  const faq = intlGroupFaq(locale, group, {
    title: runningName(locale, copy.title),
    label,
    byStrength,
    alternate,
    delivery,
  });
  const siblings = category.groups.filter((g) => g.slug !== group.slug);
  const path = withLocale(locale, group.path);
  const url = `${SITE.url}${path}`;
  const range = priceRange(group.facts);
  const shopPath = withLocale(locale, '/shop');
  const categoryPathLocal = localizedHref(locale, category.path);

  const intro = [
    copy.identity,
    group.facts.listings === 1
      ? t.oneListing(group.facts.manufacturers[0].name, range)
      : t.allListingsIntro(group.facts.listings, copy.name, group.facts.manufacturers.length, range, group.facts.inStock),
  ];

  const schema = [
    {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      '@id': `${url}#page`,
      name: copy.title,
      description: intro.join(' '),
      url,
      inLanguage: locale,
      isPartOf: { '@id': `${SITE.url}/#website` },
      mainEntity: {
        '@type': 'ItemList',
        numberOfItems: group.products.length,
        itemListElement: group.products.map((p, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: p.name,
          url: `${SITE.url}/product/${p.slug}`,
        })),
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: t.home, item: `${SITE.url}${withLocale(locale, '/')}` },
        { '@type': 'ListItem', position: 2, name: t.shop, item: `${SITE.url}${shopPath}` },
        {
          '@type': 'ListItem',
          position: 3,
          name: categoryName(locale, category.slug, category.name),
          item: `${SITE.url}${categoryPathLocal}`,
        },
        { '@type': 'ListItem', position: 4, name: copy.name, item: url },
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

      <CollectionBreadcrumb
        trail={[
          { name: t.shop, href: shopPath },
          { name: categoryName(locale, category.slug, category.name), href: categoryPathLocal },
          { name: copy.name },
        ]}
      />

      <CollectionHeader heading={t.forSale(copy.title)} intro={intro} facts={group.facts} locale={locale} />

      <div className="mx-auto max-w-[86rem] space-y-16 px-4 py-12 sm:px-6 lg:px-10 lg:py-16">
        {(byStrength.length > 1 || alternate) && (
          <section aria-labelledby="prices">
            <SectionTitle id="prices">{t.priceByStrength(label)}</SectionTitle>
            <p className="measure mt-2 text-sm leading-relaxed text-ink-soft">
              {t.priceByStrengthBody}
              {alternate && (
                <>
                  {' '}
                  {t.otherFormAsk}{' '}
                  <Link
                    href={alternate.path}
                    className="text-pigment-indigo underline decoration-rule-strong underline-offset-[3px] transition-colors hover:decoration-pigment-indigo"
                  >
                    {alternate.title}
                  </Link>{' '}
                  {t.otherFormHas(alternate.listings)}
                </>
              )}
            </p>
            {byStrength.length > 1 && (
              <div className="mt-6 max-w-xl">
                <StrengthPriceTable rows={byStrength} caption={t.strengthCaption(copy.title)} locale={locale} />
              </div>
            )}
          </section>
        )}

        <section aria-labelledby="listings">
          <SectionTitle id="listings">{group.facts.listings === 1 ? copy.name : t.allListings(label)}</SectionTitle>
          <div className="mt-6">
            <ProductGrid products={group.products.map(toSummary)} columns={4} />
          </div>
        </section>

        {group.facts.listings > 1 && (
          <section aria-labelledby="compare">
            <SectionTitle id="compare">{t.compare(copy.name)}</SectionTitle>
            <p className="measure mt-2 text-sm leading-relaxed text-ink-soft">{t.compareBody}</p>
            <div className="mt-6">
              <ComparisonTable products={group.products} caption={t.compareCaption(copy.name)} locale={locale} />
            </div>
          </section>
        )}

        <section aria-labelledby="makers">
          <SectionTitle id="makers">{t.whoMakes(label)}</SectionTitle>
          <p className="measure mt-2 text-sm leading-relaxed text-ink-soft">{t.whoMakesBody}</p>
          <div className="mt-6">
            <ManufacturerList facts={group.facts} />
          </div>
        </section>

        <section aria-labelledby="questions">
          <SectionTitle id="questions">{t.questionsAbout(label)}</SectionTitle>
          <div className="mt-6">
            <CollectionFaq items={faq} />
          </div>
        </section>

        {siblings.length > 0 && (
          <section aria-labelledby="related">
            <SectionTitle id="related">{t.other(words)}</SectionTitle>
            <ul className="mt-6 flex flex-wrap gap-2">
              {siblings.map((g) => {
                const href = localizedHref(locale, g.path);
                const english = !href.startsWith(`/${locale}`);
                return (
                  <li key={g.slug}>
                    <Link
                      href={href}
                      className="inline-flex items-baseline gap-2 border border-rule px-3 py-1.5 text-sm text-ink-soft transition-colors hover:border-pigment-indigo-lift hover:text-ink"
                    >
                      {intlGroupName(locale, `${category.slug}/${g.slug}`, g.name)}
                      {english && (
                        <abbr title={t.inEnglishTitle} className="font-mono text-2xs uppercase text-ink-faint no-underline">
                          {t.inEnglish}
                        </abbr>
                      )}
                      <span className="font-mono text-2xs text-ink-faint tabular">{g.facts.listings}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

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
