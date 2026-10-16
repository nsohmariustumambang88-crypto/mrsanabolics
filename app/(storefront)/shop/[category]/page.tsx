import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getBlogPosts, toSummary } from '@/lib/db/catalogue';
import { getCategoryCollection, getCategoryCollections } from '@/lib/db/collections';
import { CATEGORY_COPY, type CategoryCopy } from '@/lib/catalogue/collection-copy';
import { categoryFaq } from '@/lib/catalogue/collection-faq';
import { andList, fitDescription, getUsDelivery, shortRange, usShippingLine } from '@/lib/catalogue/seo';
import { formatPriceShort } from '@/lib/format';
import { SITE } from '@/lib/site';
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
  A category of the catalogue, as a page search engines can rank: /shop/injectables.

  It replaced /shop?category=injectables, which declared /shop as its canonical, carried the
  shop's title and no heading, and listed no products in its HTML. See lib/catalogue/paths.ts.

  A category with compound groups is a directory of them — each group page then lists and
  compares every product in it — plus the most prominent products. A category without groups
  lists every product itself. Either way, every product is one link away in the first response.
*/

type Params = { params: { category: string } };

export const revalidate = 3600;

export async function generateStaticParams() {
  const categories = await getCategoryCollections();
  return categories.map((c) => ({ category: c.slug }));
}

function copyFor(slug: string, name: string, description: string): CategoryCopy {
  return CATEGORY_COPY[slug] ?? { heading: name, intro: [description], articles: [] };
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const category = await getCategoryCollection(params.category);
  if (!category) return { title: 'Category not found' };
  const copy = copyFor(category.slug, category.name, category.description);
  const f = category.facts;
  const usDelivery = await getUsDelivery();

  /* "Oral Steroids for Sale: 8 Compounds from $40". Every figure is computed. */
  const scope = category.groups.length > 1 ? `${category.groups.length} compounds` : `${f.listings} listings`;
  const title = `${copy.heading} for sale: ${scope}${f.priceFrom !== null ? ` from ${formatPriceShort(f.priceFrom)}` : ''}`;
  const range = shortRange(f);
  const lead = `${copy.heading} for sale: ${f.listings} listings from ${f.manufacturers.length} manufacturers`;
  const shipping = usShippingLine(usDelivery);
  const description = fitDescription([
    category.groups.length > 0
      ? `${lead}, including ${andList(category.groups.slice(0, 3).map((g) => g.name))}${range ? `, priced ${range}` : ''}.${shipping}`
      : `${lead}${range ? `, priced ${range}` : ''}.${shipping}`,
    `${lead}${range ? `, priced ${range}` : ''}.${shipping}`,
    `${lead}${range ? `, priced ${range}` : ''}.`,
  ]);

  return {
    title,
    description,
    alternates: { canonical: category.path },
    openGraph: { type: 'website', url: `${SITE.url}${category.path}`, title, description },
  };
}

export default async function CategoryPage({ params }: Params) {
  const category = await getCategoryCollection(params.category);
  if (!category) notFound();
  const copy = copyFor(category.slug, category.name, category.description);

  const [posts, usDelivery] = await Promise.all([getBlogPosts(), getUsDelivery()]);
  const articles = copy.articles
    .map((slug) => posts.find((p) => p.slug === slug))
    .filter((p): p is NonNullable<typeof p> => !!p)
    .map((p) => ({ slug: p.slug, title: p.title, excerpt: p.excerpt }));

  /* With groups, show the prominent listings here and leave the full lists to the group pages. */
  const featured =
    category.groups.length > 0
      ? [...category.products]
          .sort(
            (a, b) =>
              Number(!!b.isBestSeller) - Number(!!a.isBestSeller) ||
              Number(b.inStock) - Number(a.inStock) ||
              a.name.localeCompare(b.name)
          )
          .slice(0, 12)
      : category.products;

  const faq = categoryFaq(category, copy, { usDelivery });
  const url = `${SITE.url}${category.path}`;

  const schema = [
    {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      '@id': `${url}#page`,
      name: copy.heading,
      description: copy.intro.join(' '),
      url,
      isPartOf: { '@id': `${SITE.url}/#website` },
      mainEntity: {
        '@type': 'ItemList',
        numberOfItems: category.groups.length || category.products.length,
        itemListElement: (category.groups.length > 0
          ? category.groups.map((g) => ({ name: g.name, url: `${SITE.url}${g.path}` }))
          : category.products.map((p) => ({ name: p.name, url: `${SITE.url}/product/${p.slug}` }))
        ).map((item, i) => ({ '@type': 'ListItem', position: i + 1, ...item })),
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: SITE.url },
        { '@type': 'ListItem', position: 2, name: 'Shop', item: `${SITE.url}/shop` },
        { '@type': 'ListItem', position: 3, name: category.name, item: url },
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

      <CollectionBreadcrumb trail={[{ name: 'Shop', href: '/shop' }, { name: category.name }]} />

      <CollectionHeader
        heading={`${copy.heading} for sale`}
        intro={copy.intro}
        facts={category.facts}
        compounds={category.groups.length || undefined}
      />

      <div className="mx-auto max-w-[86rem] space-y-16 px-4 py-12 sm:px-6 lg:px-10 lg:py-16">
        {category.groups.length > 0 && (
          <section aria-labelledby="by-compound">
            <SectionTitle id="by-compound">Browse {copy.heading.toLowerCase()} by compound</SectionTitle>
            <p className="measure mt-2 text-sm leading-relaxed text-ink-soft">
              Each compound has its own page comparing every manufacturer’s version by strength,
              form and price.
            </p>
            <div className="mt-6">
              <GroupDirectory groups={category.groups} />
            </div>
          </section>
        )}

        <section aria-labelledby="listings">
          <SectionTitle id="listings">
            {category.groups.length > 0 ? `Featured ${copy.heading.toLowerCase()}` : `Every ${copy.heading.toLowerCase()} listing`}
          </SectionTitle>
          <div className="mt-6">
            <ProductGrid products={featured.map(toSummary)} columns={4} />
          </div>
        </section>

        <section aria-labelledby="makers">
          <SectionTitle id="makers">Manufacturers</SectionTitle>
          <p className="measure mt-2 text-sm leading-relaxed text-ink-soft">
            {category.facts.manufacturers.length} manufacturers, with the number of their
            listings in this category.
          </p>
          <div className="mt-6">
            <ManufacturerList facts={category.facts} />
          </div>
        </section>

        <section aria-labelledby="questions">
          <SectionTitle id="questions">Questions</SectionTitle>
          <div className="mt-6">
            <CollectionFaq items={faq} />
          </div>
        </section>

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
