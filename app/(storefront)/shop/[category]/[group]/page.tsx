import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { getBlogPosts, toSummary } from '@/lib/db/catalogue';
import {
  getCategoryCollections,
  getGroupCollection,
  pricesByStrength,
  shortStrength,
  type CollectionFacts,
} from '@/lib/db/collections';
import { formatEstimate, zoneForCountry } from '@/lib/delivery';
import { CATEGORY_COPY, GROUP_COPY, type CategoryCopy } from '@/lib/catalogue/collection-copy';
import { groupFaq, type UsDeliveryOption } from '@/lib/catalogue/collection-faq';
import { formatPriceShort } from '@/lib/format';
import { SITE } from '@/lib/site';
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
  One compound, every manufacturer's version of it: /shop/injectables/testosterone-enanthate.

  This is the page type the sites that rank for a compound's name are built around — one
  address per compound, listing all of its versions. The comparison table is what this one adds
  that they mostly do not: strength, form, price and availability for every listing in one view,
  computed from the catalogue, so it is always what is actually on sale.
*/

type Params = { params: { category: string; group: string } };

export const revalidate = 60;

export async function generateStaticParams() {
  const categories = await getCategoryCollections();
  return categories.flatMap((c) => c.groups.map((g) => ({ category: c.slug, group: g.slug })));
}

function copyFor(slug: string, name: string): CategoryCopy {
  return CATEGORY_COPY[slug] ?? { heading: name, intro: [], articles: [] };
}

/** "Oral Winstrol (Stanozolol)": the compound with its route, where the category has one. */
function titleFor(groupName: string, categorySlug: string): string {
  const qualifier = CATEGORY_COPY[categorySlug]?.qualifier;
  return qualifier ? `${qualifier} ${groupName}` : groupName;
}

function shortRange(facts: CollectionFacts): string | null {
  if (facts.priceFrom === null || facts.priceTo === null) return null;
  return facts.priceFrom === facts.priceTo
    ? formatPriceShort(facts.priceFrom)
    : `${formatPriceShort(facts.priceFrom)}–${formatPriceShort(facts.priceTo)}`;
}

/** "10 mg, 50 mg and 25 mg": the commonest strengths, without the "per tablet" the title already implies. */
function commonStrengths(facts: CollectionFacts, max = 3): string {
  const short = Array.from(new Set(facts.strengths.map(shortStrength))).slice(0, max);
  if (short.length <= 1) return short.join('');
  return `${short.slice(0, -1).join(', ')} and ${short[short.length - 1]}`;
}

/*
  Delivery options to the United States, read from the delivery zones the admin edits — so the
  page says "we ship to the USA" only while a zone actually covers it. Wrapped in React's cache so
  the metadata and the page share one read, and failing soft: an unreachable database drops the
  shipping line from the page, it does not take the page down.
*/
const getUsDelivery = cache(async (): Promise<UsDeliveryOption[] | null> => {
  try {
    const zone = await zoneForCountry('US');
    if (!zone) return null;
    const options = zone.rates
      .filter((r) => r.active)
      .map((r) => ({ name: r.name, price: r.price, freeOver: r.freeOverSubtotal, estimate: formatEstimate(r) }))
      .sort((a, b) => a.price - b.price);
    return options.length > 0 ? options : null;
  } catch {
    return null;
  }
});

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const found = await getGroupCollection(params.category, params.group);
  if (!found) return { title: 'Not found' };
  const { category, group } = found;
  const f = group.facts;
  const heading = titleFor(group.name, category.slug);
  const usDelivery = await getUsDelivery();

  /*
    Written for the searches this page gets: "winstrol for sale", "price of winstrol",
    "winstrol oral price", "winstrol 50 mg price". Every number in it is computed.
  */
  const title = f.priceFrom !== null ? `${heading} for Sale: Price from ${formatPriceShort(f.priceFrom)}` : `${heading} for Sale`;

  const strengths = commonStrengths(f);
  const range = shortRange(f);
  const lead =
    f.listings === 1
      ? `${heading} by ${f.manufacturers[0].name} for sale`
      : `${heading} for sale: ${f.listings} listings from ${f.manufacturers.length} manufacturers`;
  const detail = [strengths ? `in ${strengths}` : '', range ? `priced ${range}` : ''].filter(Boolean).join(', ');
  const shipping = usDelivery ? ` Tracked US shipping from ${formatPriceShort(usDelivery[0].price)}.` : '';
  const candidates = [
    `${lead}${detail ? ` ${detail}` : ''}.${shipping}`,
    `${lead}${range ? `, priced ${range}` : ''}.${shipping}`,
    `${lead}${range ? `, priced ${range}` : ''}.`,
  ];
  const description = (candidates.find((c) => c.length <= 160) ?? candidates[candidates.length - 1]).slice(0, 160);

  return {
    title,
    description,
    alternates: { canonical: group.path },
    openGraph: { type: 'website', url: `${SITE.url}${group.path}`, title, description },
  };
}

export default async function GroupPage({ params }: Params) {
  const found = await getGroupCollection(params.category, params.group);
  if (!found) notFound();
  const { category, group } = found;
  const copy = copyFor(category.slug, category.name);
  const identity = GROUP_COPY[`${category.slug}/${group.slug}`];
  const heading = titleFor(group.name, category.slug);

  const [posts, allCategories, usDelivery] = await Promise.all([
    getBlogPosts(),
    getCategoryCollections(),
    getUsDelivery(),
  ]);
  const articles = copy.articles
    .map((slug) => posts.find((p) => p.slug === slug))
    .filter((p): p is NonNullable<typeof p> => !!p)
    .map((p) => ({ slug: p.slug, title: p.title, excerpt: p.excerpt }));

  /* The same compound in another category — oral Winstrol and injectable Winstrol Depot. */
  const alternate =
    allCategories
      .filter((c) => c.slug !== category.slug)
      .flatMap((c) => c.groups.filter((g) => g.slug === group.slug).map((g) => ({ c, g })))
      .map(({ c, g }) => ({ title: titleFor(g.name, c.slug), path: g.path, listings: g.facts.listings }))[0] ?? null;

  const byStrength = pricesByStrength(group.products);
  const faq = groupFaq(group, copy, { title: heading, byStrength, alternate, usDelivery });
  const siblings = category.groups.filter((g) => g.slug !== group.slug);
  const url = `${SITE.url}${group.path}`;
  const range = priceRange(group.facts);

  /*
    "Filed under", not "every X is below". Groups come from the folders the photographs were
    filed in, and a few of them hold neighbours: the Enanthate folder carries some blends and a
    trestolone ester. Until those are refiled in the admin, the page must not claim more than the
    catalogue knows.
  */
  const intro = [
    identity,
    group.facts.listings === 1
      ? `One listing, from ${group.facts.manufacturers[0].name}${range ? `, priced at ${range}` : ''}.`
      : `All ${group.facts.listings} listings filed under ${group.name} come from ${group.facts.manufacturers.length} manufacturers${range ? ` and are priced ${range.replace(' – ', ' to ')}` : ''}. ${group.facts.inStock} are in stock. Compare them by strength, form and price below.`,
  ].filter((p): p is string => !!p);

  const schema = [
    {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      '@id': `${url}#page`,
      name: heading,
      description: intro.join(' '),
      url,
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
        { '@type': 'ListItem', position: 1, name: 'Home', item: SITE.url },
        { '@type': 'ListItem', position: 2, name: 'Shop', item: `${SITE.url}/shop` },
        { '@type': 'ListItem', position: 3, name: category.name, item: `${SITE.url}${category.path}` },
        { '@type': 'ListItem', position: 4, name: group.name, item: url },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
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
          { name: 'Shop', href: '/shop' },
          { name: category.name, href: category.path },
          { name: group.name },
        ]}
      />

      <CollectionHeader heading={`${heading} for sale`} intro={intro} facts={group.facts} />

      <div className="mx-auto max-w-[86rem] space-y-16 px-4 py-12 sm:px-6 lg:px-10 lg:py-16">
        {(byStrength.length > 1 || alternate) && (
          <section aria-labelledby="prices">
            <SectionTitle id="prices">{group.name} price by strength</SectionTitle>
            <p className="measure mt-2 text-sm leading-relaxed text-ink-soft">
              The lowest and highest listed price for each strength, across every listing on this page.
              {alternate && (
                <>
                  {' '}Looking for the other form?{' '}
                  <Link
                    href={alternate.path}
                    className="text-pigment-indigo underline decoration-rule-strong underline-offset-[3px] transition-colors hover:decoration-pigment-indigo"
                  >
                    {alternate.title}
                  </Link>{' '}
                  has {alternate.listings} {alternate.listings === 1 ? 'listing' : 'listings'}.
                </>
              )}
            </p>
            {byStrength.length > 1 && (
              <div className="mt-6 max-w-xl">
                <StrengthPriceTable rows={byStrength} caption={`${heading}: listings and price range for each strength`} />
              </div>
            )}
          </section>
        )}

        <section aria-labelledby="listings">
          <SectionTitle id="listings">
            {group.facts.listings === 1 ? group.name : `All ${group.name} listings`}
          </SectionTitle>
          <div className="mt-6">
            <ProductGrid products={group.products.map(toSummary)} columns={4} />
          </div>
        </section>

        {group.facts.listings > 1 && (
          <section aria-labelledby="compare">
            <SectionTitle id="compare">Compare {group.name} side by side</SectionTitle>
            <p className="measure mt-2 text-sm leading-relaxed text-ink-soft">
              Strength and form are as printed on each product. In-stock listings come first.
            </p>
            <div className="mt-6">
              <ComparisonTable
                products={group.products}
                caption={`${group.name}: every listing with its manufacturer, strength, form, price and availability`}
              />
            </div>
          </section>
        )}

        <section aria-labelledby="makers">
          <SectionTitle id="makers">Who makes {group.name}</SectionTitle>
          <p className="measure mt-2 text-sm leading-relaxed text-ink-soft">
            Each manufacturer’s page lists everything else it makes in this catalogue.
          </p>
          <div className="mt-6">
            <ManufacturerList facts={group.facts} />
          </div>
        </section>

        <section aria-labelledby="questions">
          <SectionTitle id="questions">Questions about {group.name}</SectionTitle>
          <div className="mt-6">
            <CollectionFaq items={faq} />
          </div>
        </section>

        {siblings.length > 0 && (
          <section aria-labelledby="related">
            <SectionTitle id="related">Other {copy.heading.toLowerCase()}</SectionTitle>
            <ul className="mt-6 flex flex-wrap gap-2">
              {siblings.map((g) => (
                <li key={g.slug}>
                  <Link
                    href={g.path}
                    className="inline-flex items-baseline gap-2 border border-rule px-3 py-1.5 text-sm text-ink-soft transition-colors hover:border-pigment-indigo-lift hover:text-ink"
                  >
                    {g.name}
                    <span className="font-mono text-2xs text-ink-faint tabular">{g.facts.listings}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {articles.length > 0 && (
          <section aria-labelledby="reading">
            <SectionTitle id="reading">Before you buy</SectionTitle>
            <div className="mt-6">
              <RelatedReading articles={articles} />
            </div>
          </section>
        )}
      </div>
    </>
  );
}
