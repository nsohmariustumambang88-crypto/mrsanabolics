import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getBlogPosts, toSummary } from '@/lib/db/catalogue';
import { getCategoryCollections, getGroupCollection } from '@/lib/db/collections';
import { CATEGORY_COPY, GROUP_COPY, type CategoryCopy } from '@/lib/catalogue/collection-copy';
import { groupFaq } from '@/lib/catalogue/collection-faq';
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
  listOf,
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

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const found = await getGroupCollection(params.category, params.group);
  if (!found) return { title: 'Not found' };
  const { group } = found;
  const f = group.facts;
  const makers = f.manufacturers.map((m) => m.name);

  const title =
    f.listings === 1
      ? `${group.name} by ${makers[0]}`
      : `${group.name}: ${f.listings} listings from ${f.manufacturers.length} manufacturers`;
  const description = (
    f.listings === 1
      ? `${group.name} by ${makers[0]}: strength, form, price and availability, with how to check the product is genuine.`
      : `Compare ${f.listings} ${group.name} listings from ${listOf(makers, 3)}, with strength, form and price side by side.`
  ).slice(0, 160);

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

  const posts = await getBlogPosts();
  const articles = copy.articles
    .map((slug) => posts.find((p) => p.slug === slug))
    .filter((p): p is NonNullable<typeof p> => !!p)
    .map((p) => ({ slug: p.slug, title: p.title, excerpt: p.excerpt }));

  const faq = groupFaq(group, copy);
  const siblings = category.groups.filter((g) => g.slug !== group.slug);
  const url = `${SITE.url}${group.path}`;

  /*
    "Filed under", not "every X is below". Groups come from the folders the photographs were
    filed in, and a few of them hold neighbours: the Enanthate folder carries some blends and a
    trestolone ester. Until those are refiled in the admin, the page must not claim more than the
    catalogue knows.
  */
  const intro = [
    identity,
    group.facts.listings === 1
      ? `One listing, from ${group.facts.manufacturers[0].name}.`
      : `All ${group.facts.listings} listings filed under ${group.name}, from ${group.facts.manufacturers.length} manufacturers, compared by strength, form and price.`,
  ].filter((p): p is string => !!p);

  const schema = [
    {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      '@id': `${url}#page`,
      name: group.name,
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

      <CollectionHeader heading={group.name} intro={intro} facts={group.facts} />

      <div className="mx-auto max-w-[86rem] space-y-16 px-4 py-12 sm:px-6 lg:px-10 lg:py-16">
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
