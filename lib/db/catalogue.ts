import 'server-only';

import { prisma } from '@/lib/prisma';
import type {
  Product,
  Category,
  Brand,
  BlogPost,
  Testimonial,
  FaqItem,
} from '@/lib/types';

/*
  The catalogue, read from Neon.

  `import 'server-only'` is load-bearing: it turns any accidental import of this module from a
  client component into a build error rather than a runtime attempt to open a database
  connection in the browser. The connection string must never reach a bundle.

  Every function returns the flat shapes declared in lib/types.ts — the same shapes the
  hand-written arrays used — so the whole UI keeps working against one vocabulary and the
  storage change stops at this file.

  READ ONCE, NOT ONCE PER PAGE. The root layout needs the catalogue on every route and a
  static build renders 43 of them; querying per page made the build take minutes and then fail
  with connection resets, because each render opened its own round trip to a database roughly
  two seconds away.

  unstable_cache did not dedupe across prerenders here, so the reads go through a small
  in-process TTL memo instead. It is deliberately boring: one in-flight promise per key, held
  for TTL_MS, shared by every render in the process. A build therefore issues one query per
  entity total, and a running server refreshes at most once a minute per instance. Failures
  are not cached — a rejected promise is dropped so the next caller retries.

  Everything derived — by slug, by category, by brand, related, sitemap params — filters those
  memoised lists in memory instead of issuing its own query.
*/

export const CATALOGUE_TAG = 'catalogue';

/** How long a memoised read stays warm. Matches the route-level `revalidate`. */
const TTL_MS = 60_000;

/*
  One memo per reader, not a keyed map: each call site closes over its own slot, so there are
  no key strings to keep unique and no way for two readers to collide. Resetters are collected
  so the whole catalogue can be dropped at once after a write.
*/
const resetters: Array<() => void> = [];

function cached<T>(read: () => Promise<T>): () => Promise<T> {
  let at = 0;
  let inFlight: Promise<T> | null = null;

  resetters.push(() => {
    inFlight = null;
    at = 0;
  });

  return () => {
    if (inFlight && Date.now() - at < TTL_MS) return inFlight;

    at = Date.now();
    inFlight = read().catch((error) => {
      /* Never cache a failure: drop it so the next caller gets a fresh attempt. */
      inFlight = null;
      at = 0;
      throw error;
    });

    return inFlight;
  };
}

/** Drop every memoised read. Call after writing to the catalogue. */
export function invalidateCatalogue(): void {
  for (const reset of resetters) reset();
}

/** Prisma returns Decimal for money; the app works in plain numbers. */
function money(value: { toNumber(): number } | null): number | undefined {
  return value ? value.toNumber() : undefined;
}

/** Postgres dates come back as Date; the catalogue's shape is 'YYYY-MM-DD'. */
function isoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

const productInclude = {
  category: true,
  brand: true,
  specifications: { orderBy: { position: 'asc' } },
  faqs: { orderBy: { position: 'asc' } },
  reviews: { orderBy: { date: 'desc' } },
} as const;

type ProductRow = Awaited<
  ReturnType<typeof prisma.product.findFirstOrThrow<{ include: typeof productInclude }>>
>;

function toProduct(row: ProductRow): Product {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    brand: row.brand.name,
    brandSlug: row.brand.slug,
    category: row.category.name,
    categorySlug: row.category.slug,
    price: row.price.toNumber(),
    compareAtPrice: money(row.compareAtPrice),
    rating: row.rating,
    reviewCount: row.reviewCount,
    inStock: row.inStock,
    stockCount: row.stockCount,
    isNew: row.isNew,
    isBestSeller: row.isBestSeller,
    isTrending: row.isTrending,
    isDeal: row.isDeal,
    description: row.description,
    longDescription: row.longDescription,
    specifications: row.specifications.map((s) => ({ label: s.label, value: s.value })),
    benefits: row.benefits,
    directions: row.directions,
    ingredients: row.ingredients,
    shipping: row.shipping,
    returns: row.returns,
    images: row.images,
    faqs: row.faqs.map((f) => ({ question: f.question, answer: f.answer })),
    reviews: row.reviews.map((r) => ({
      id: r.id,
      author: r.author,
      rating: r.rating,
      date: isoDate(r.date),
      title: r.title,
      body: r.body,
    })),
  };
}

/* ------------------------------------------------------------ base reads */

export const getProducts = cached(
  async (): Promise<Product[]> => {
    const rows = await prisma.product.findMany({
      include: productInclude,
      orderBy: { position: 'asc' },
    });
    return rows.map(toProduct);
  },
);

export const getCategories = cached(
  async (): Promise<(Category & { listed: number })[]> => {
    const rows = await prisma.category.findMany({
      orderBy: { position: 'asc' },
      include: { _count: { select: { products: true } } },
    });
    return rows.map((c) => ({
      name: c.name,
      slug: c.slug,
      description: c.description,
      icon: c.icon,
      productCount: c.productCount,
      /* What is actually listed, as opposed to the headline figure in the copy. */
      listed: c._count.products,
    }));
  },
);

export const getBrands = cached(
  async (): Promise<(Brand & { listed: number })[]> => {
    const rows = await prisma.brand.findMany({
      orderBy: { position: 'asc' },
      include: { _count: { select: { products: true } } },
    });
    return rows.map((b) => ({
      name: b.name,
      slug: b.slug,
      description: b.description,
      productCount: b.productCount,
      listed: b._count.products,
    }));
  },
);

export const getBlogPosts = cached(
  async (): Promise<BlogPost[]> => {
    const rows = await prisma.blogPost.findMany({ orderBy: { date: 'desc' } });
    return rows.map((p) => ({
      id: p.id,
      slug: p.slug,
      title: p.title,
      excerpt: p.excerpt,
      content: p.content,
      category: p.category,
      author: p.author,
      date: isoDate(p.date),
      readTime: p.readTime,
      image: p.image,
    }));
  },
);

export const getTestimonials = cached(
  async (): Promise<Testimonial[]> => {
    const rows = await prisma.testimonial.findMany({ orderBy: { position: 'asc' } });
    return rows.map((t) => ({
      id: t.id,
      name: t.name,
      role: t.role,
      location: t.location,
      rating: t.rating,
      quote: t.quote,
    }));
  },
);

export const getFaqs = cached(
  async (): Promise<FaqItem[]> => {
    const rows = await prisma.faq.findMany({ orderBy: { position: 'asc' } });
    return rows.map((f) => ({ question: f.question, answer: f.answer }));
  },
);

/* ------------------------------------------------- derived, in memory */

export async function getProductBySlug(slug: string): Promise<Product | null> {
  const all = await getProducts();
  return all.find((p) => p.slug === slug) ?? null;
}

/** Slugs only — for generateStaticParams, which does not need whole records. */
export async function getProductSlugs(): Promise<string[]> {
  const all = await getProducts();
  return all.map((p) => p.slug);
}

export async function getProductsByCategory(categorySlug: string): Promise<Product[]> {
  const all = await getProducts();
  return all.filter((p) => p.categorySlug === categorySlug);
}

export async function getProductsByBrand(brandSlug: string): Promise<Product[]> {
  const all = await getProducts();
  return all.filter((p) => p.brandSlug === brandSlug);
}

/**
 * Closest first, then top up.
 *
 * Relatedness degrades in a defined order — same category, then same manufacturer, then the
 * rest of the catalogue — so a row of four always fills. Several categories hold only one
 * product, and a lone related item leaves three empty cells in the grid.
 */
export async function getRelatedProducts(product: Product, limit = 4): Promise<Product[]> {
  const all = await getProducts();
  const seen = new Set<string>([product.id]);
  const out: Product[] = [];

  const take = (candidates: Product[]) => {
    for (const candidate of candidates) {
      if (out.length >= limit) return;
      if (seen.has(candidate.id)) continue;
      seen.add(candidate.id);
      out.push(candidate);
    }
  };

  take(all.filter((p) => p.categorySlug === product.categorySlug));
  if (out.length < limit) take(all.filter((p) => p.brandSlug === product.brandSlug));
  if (out.length < limit) take(all);

  return out;
}

export async function getBrandSlugs(): Promise<string[]> {
  const all = await getBrands();
  return all.map((b) => b.slug);
}

export async function getBrandBySlug(slug: string): Promise<Brand | null> {
  const all = await getBrands();
  const found = all.find((b) => b.slug === slug);
  if (!found) return null;
  const { listed, ...brand } = found;
  return brand;
}

export async function getBlogPostBySlug(slug: string): Promise<BlogPost | null> {
  const all = await getBlogPosts();
  return all.find((p) => p.slug === slug) ?? null;
}

export async function getBlogSlugs(): Promise<string[]> {
  const all = await getBlogPosts();
  return all.map((p) => p.slug);
}
