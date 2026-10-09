import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import {
  getProductBySlug,
  getRelatedProducts,
} from '@/lib/db/catalogue';
import { ProductDetail } from '@/components/product/product-detail';
import { getSettingsSafe, asBoolean } from '@/lib/settings';
import { SITE } from '@/lib/site';
import { categoryPath, groupPath, groupSlug } from '@/lib/catalogue/paths';
import { GROUP_COPY } from '@/lib/catalogue/collection-copy';
import { getGroupCollection } from '@/lib/db/collections';
import { cloudinaryUrl } from '@/lib/cloudinary';
import type { Product } from '@/lib/types';

/*
  Server component.

  The previous build made this route `'use client'` and read the slug with useParams(), which
  meant no title, no description, and no structured data could ever reach a crawler. Every
  interactive part now lives in <ProductDetail>; this file exists to emit metadata and schema
  in the first response.
*/

type Params = { params: { slug: string } };

/*
  PRODUCT PAGES ARE RENDERED ON DEMAND, NOT ENUMERATED AT BUILD TIME.

  This used to return all 792 slugs, which made the build prerender 792 pages, each one reading
  the catalogue from Neon. That is a deploy that cannot survive its database twitching: Neon
  suspends when idle and refuses the connection that wakes it, and a single sustained wobble
  during a build times out a page, kills the static worker, and fails the whole deployment.
  It did exactly that — 737 connection failures in one run, no output.

  Returning an empty list means the build ships no product pages and needs no product reads.
  `dynamicParams` (true by default) lets any slug render on first request; `revalidate` then
  caches it at the edge for a minute, so the second visitor and the crawler after it get a
  static hit. Nothing about SEO changes — the first response is still fully server-rendered
  with its metadata and JSON-LD, which is what a crawler reads.

  What it costs: the first visitor to a given product waits for one render. What it buys: a
  build that takes about a minute instead of eighteen, and a deploy that no longer has 792
  chances to fail on someone else's infrastructure.

  If you ever want the popular pages warm at deploy time, return a SHORT list here — the best
  sellers, say — and accept that those reads must succeed for the build to pass.
*/
export async function generateStaticParams() {
  return [];
}

/* Re-read at most once a minute; see the note in app/layout.tsx. */
export const revalidate = 60;

function spec(product: Product, label: string): string | undefined {
  return product.specifications.find((s) => s.label === label)?.value?.trim() || undefined;
}

/** The product's photograph at a fixed size, as an absolute URL for search engines and previews. */
function productImage(product: Product, width = 1200): string | undefined {
  const source = product.images[0];
  if (!source) return undefined;
  const url = cloudinaryUrl(source, { width, crop: 'limit' });
  return url.startsWith('http') ? url : `${SITE.url}${url}`;
}

/**
 * The compound page a product belongs to, with its one-line description. Computed here, on the
 * server, and passed down — so the product page links into its compound page and says what the
 * compound is, instead of the template sentence every product used to share.
 */
async function compoundFor(product: Product) {
  if (!product.subcategoryName) return null;
  const found = await getGroupCollection(product.categorySlug, groupSlug(product.subcategoryName));
  if (!found) return null;
  return {
    name: found.group.name,
    path: found.group.path,
    listings: found.group.facts.listings,
    identity: GROUP_COPY[`${product.categorySlug}/${found.group.slug}`] ?? null,
  };
}

/*
  Title and description are built from the facts on the label, because the stored description
  is a template ("X by Y. Injectable, vial, listed under Blends, in Injectables.") shared in
  shape by all 792 products, and search engines treat near-identical descriptions as noise.
*/
function describe(product: Product, compound: Awaited<ReturnType<typeof compoundFor>>) {
  const strength = spec(product, 'Strength');
  const form = spec(product, 'Form');
  const title = `${product.name} by ${product.brand}${strength ? `, ${strength}` : ''}`;
  /* The compound's first sentence: what it is, without the regulatory detail that follows. */
  const identity = compound?.identity ? `${compound.identity.split('. ')[0].replace(/\.$/, '')}.` : null;
  const facts = [strength, form?.toLowerCase()].filter(Boolean).join(', ');
  const parts = [
    `${product.name} by ${product.brand}${facts ? `: ${facts}` : ''}.`,
    identity,
    compound && compound.listings > 1
      ? `Compare it with ${compound.listings - 1} other ${compound.name} listings.`
      : null,
  ].filter((p): p is string => !!p);
  let description = '';
  for (const part of parts) {
    if ((description + ' ' + part).trim().length > 160) break;
    description = (description + ' ' + part).trim();
  }
  return { title, description: description || product.description };
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const product = await getProductBySlug(params.slug);
  if (!product) return { title: 'Product not found' };

  const { title, description } = describe(product, await compoundFor(product));
  const url = `${SITE.url}/product/${product.slug}`;
  const image = productImage(product);

  return {
    title,
    description,
    alternates: { canonical: `/product/${product.slug}` },
    openGraph: {
      type: 'website',
      url,
      title,
      description,
      ...(image && { images: [{ url: image, alt: `${product.name} by ${product.brand}` }] }),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      ...(image && { images: [image] }),
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
  const compound = await compoundFor(product);
  const { description } = describe(product, compound);
  const image = productImage(product);

  const schema = [
    {
      '@context': 'https://schema.org',
      '@type': 'Product',
      '@id': `${url}#product`,
      name: product.name,
      description,
      url,
      /*
        The photograph. Google asks for an image on every product, and without one a product is
        not eligible for product results in search at all — this markup shipped without it.
      */
      ...(image && { image: [image] }),
      /* The slug, not the database id: a readable, stable code rather than a random string. */
      sku: product.slug,
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
        hasMerchantReturnPolicy: {
          '@type': 'MerchantReturnPolicy',
          applicableCountry: 'US',
          returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
          merchantReturnDays: 30,
          returnMethod: 'ReturnByMail',
          returnFees: 'https://schema.org/ReturnShippingFees',
        },
        shippingDetails: {
          '@type': 'OfferShippingDetails',
          shippingRate: {
            '@type': 'PriceSpecification',
            priceCurrency: 'USD',
            price: '9.00',
          },
          shippingDestination: {
            '@type': 'DefinedRegion',
            addressCountry: 'US',
          },
          deliveryTime: {
            '@type': 'ShippingDeliveryTime',
            handlingTime: {
              '@type': 'QuantitativeValue',
              minValue: 0,
              maxValue: 1,
              unitCode: 'DAY',
            },
            transitTime: {
              '@type': 'QuantitativeValue',
              minValue: 3,
              maxValue: 6,
              unitCode: 'DAY',
            },
          },
        },
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
          item: `${SITE.url}${categoryPath(product.categorySlug)}`,
        },
        /* The compound group, where the category has one — the folder's second level. */
        ...(product.subcategory && product.subcategoryName
          ? [
              {
                '@type': 'ListItem',
                position: 3,
                name: product.subcategoryName,
                item: `${SITE.url}${groupPath(product.categorySlug, product.subcategoryName ?? product.subcategory ?? '')}`,
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
      <ProductDetail
        product={product}
        related={related}
        reviewsOpen={reviewsOpen}
        compound={compound}
      />
    </>
  );
}
