import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import {
  getProductBySlug,
  getRelatedProducts,
  getProductSlugs,
} from '@/lib/db/catalogue';
import { ProductDetail } from '@/components/product/product-detail';
import { getSettingsSafe, asBoolean } from '@/lib/settings';
import { SITE } from '@/lib/site';

/*
  Server component.

  The previous build made this route `'use client'` and read the slug with useParams(), which
  meant no title, no description, and no structured data could ever reach a crawler. Every
  interactive part now lives in <ProductDetail>; this file exists to emit metadata and schema
  in the first response.
*/

type Params = { params: { slug: string } };

/*
  Params come from the database at build time, so adding a product in Neon adds a page on the
  next build — nothing here enumerates the catalogue by hand any more.
*/
export async function generateStaticParams() {
  const slugs = await getProductSlugs();
  return slugs.map((slug) => ({ slug }));
}

/* Re-read at most once a minute; see the note in app/layout.tsx. */
export const revalidate = 60;

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const product = await getProductBySlug(params.slug);
  if (!product) return { title: 'Product not found' };

  const title = `${product.name} — ${product.brand}`;
  const url = `${SITE.url}/product/${product.slug}`;

  return {
    title,
    description: product.description,
    alternates: { canonical: `/product/${product.slug}` },
    openGraph: {
      type: 'website',
      url,
      title,
      description: product.description,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: product.description,
    },
  };
}

export default async function ProductPage({ params }: Params) {
  const product = await getProductBySlug(params.slug);
  if (!product) notFound();

  const related = await getRelatedProducts(product);
  /* Whether the review form is offered at all is an administrator's decision, not a build-time
     one. Submitted reviews still wait for approval either way. */
  const settings = await getSettingsSafe();
  const reviewsOpen = asBoolean(settings.reviews_open);
  const url = `${SITE.url}/product/${product.slug}`;

  const schema = [
    {
      '@context': 'https://schema.org',
      '@type': 'Product',
      '@id': `${url}#product`,
      name: product.name,
      description: product.description,
      sku: product.id,
      category: product.category,
      brand: { '@type': 'Brand', name: product.brand },
      additionalProperty: product.specifications.map((s) => ({
        '@type': 'PropertyValue',
        name: s.label,
        value: s.value,
      })),
      offers: {
        '@type': 'Offer',
        url,
        priceCurrency: 'USD',
        price: product.price.toFixed(2),
        availability: product.inStock
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
        itemCondition: 'https://schema.org/NewCondition',
        seller: { '@id': `${SITE.url}/#organization` },
      },
      /* A rating of 0 from 0 reviews is not a rating; search engines flag it as invalid. */
      ...(product.reviewCount > 0
        ? {
            aggregateRating: {
              '@type': 'AggregateRating',
              ratingValue: product.rating,
              reviewCount: product.reviewCount,
            },
            review: product.reviews.map((r) => ({
              '@type': 'Review',
              author: { '@type': 'Person', name: r.author },
              datePublished: r.date,
              name: r.title,
              reviewBody: r.body,
              reviewRating: {
                '@type': 'Rating',
                ratingValue: r.rating,
                bestRating: 5,
              },
            })),
          }
        : {}),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Shop', item: `${SITE.url}/shop` },
        {
          '@type': 'ListItem',
          position: 2,
          name: product.category,
          item: `${SITE.url}/shop?category=${product.categorySlug}`,
        },
        /* The compound group, where the category has one — the folder's second level. */
        ...(product.subcategory && product.subcategoryName
          ? [
              {
                '@type': 'ListItem',
                position: 3,
                name: product.subcategoryName,
                item: `${SITE.url}/shop?category=${product.categorySlug}&group=${product.subcategory}`,
              },
            ]
          : []),
        {
          '@type': 'ListItem',
          position: product.subcategory ? 4 : 3,
          name: product.name,
          item: url,
        },
      ],
    },
    ...(product.faqs.length > 0
      ? [
          {
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: product.faqs.map((f) => ({
              '@type': 'Question',
              name: f.question,
              acceptedAnswer: { '@type': 'Answer', text: f.answer },
            })),
          },
        ]
      : []),
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <ProductDetail product={product} related={related} reviewsOpen={reviewsOpen} />
    </>
  );
}
