import 'server-only';

import { prisma } from '@/lib/prisma';
import type {
  Product,
  ProductSummary,
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

/*
  Neon suspends an idle endpoint and refuses the connection that wakes it.

  The admin survives this because every action goes through `runAction`, which turns a rejection
  into a message and a button you can press again. A static build has nobody to press it: the
  first prerender after an idle spell throws PrismaClientInitializationError, and because 882
  pages all read this module, one cold start fails the whole build. That is not a hypothetical —
  it is how the last build died.

  So a read retries a CONNECTION failure a few times, backing off long enough for the endpoint
  to finish waking (Neon typically takes a few seconds). A query that fails for any other reason
  is thrown immediately: retrying a malformed query or a constraint violation just fails slower.
*/
const WAKE_ATTEMPTS = 4;
const WAKE_BACKOFF_MS = [1_000, 3_000, 6_000];

function isColdStart(error: unknown): boolean {
  const name = (error as { name?: string })?.name ?? '';
  const code = (error as { errorCode?: string; code?: string })?.errorCode
    ?? (error as { code?: string })?.code
    ?? '';
  const message = (error as { message?: string })?.message ?? '';

  return (
    name === 'PrismaClientInitializationError' ||
    /^P1(00[0-9]|01[0-7])$/.test(code) ||
    /ECONNRESET|ETIMEDOUT|ECONNREFUSED|Closed/i.test(message)
  );
}

async function withWakeRetry<T>(read: () => Promise<T>): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt < WAKE_ATTEMPTS; attempt++) {
    try {
      return await read();
    } catch (error) {
      lastError = error;
      if (!isColdStart(error) || attempt === WAKE_ATTEMPTS - 1) throw error;
      await new Promise((resolve) => setTimeout(resolve, WAKE_BACKOFF_MS[attempt]));
    }
  }

  throw lastError;
}

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
    inFlight = withWakeRetry(read).catch((error) => {
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
  /*
    APPROVED ONLY, and this `where` is load-bearing.

    Reviews arrive from the storefront as PENDING and a person decides whether they are
    published. `Product.rating` and `reviewCount` are recomputed from approved rows alone, so
    reading every row here would put an unmoderated review on the page while the star figure
    above it refused to count it — the two disagreeing is precisely the state the moderation
    design exists to prevent. It would also mean anything anyone typed into the form appeared
    under a controlled-substance listing before a human read it.
  */
  reviews: { where: { status: 'APPROVED' }, orderBy: { date: 'desc' } },
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
    subcategory: row.subcategory ?? undefined,
    subcategoryName: row.subcategoryName ?? undefined,
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

/**
 * The projection the browser gets. See ProductSummary in lib/types.ts: the storefront layout
 * ships every product to every page through the catalogue provider, and at 800 products the
 * full record is megabytes. Cards, search, filters and the cart need only this.
 */
export function toSummary(p: Product): ProductSummary {
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    brand: p.brand,
    brandSlug: p.brandSlug,
    category: p.category,
    categorySlug: p.categorySlug,
    subcategory: p.subcategory,
    subcategoryName: p.subcategoryName,
    price: p.price,
    compareAtPrice: p.compareAtPrice,
    rating: p.rating,
    reviewCount: p.reviewCount,
    inStock: p.inStock,
    stockCount: p.stockCount,
    isNew: p.isNew,
    isBestSeller: p.isBestSeller,
    isTrending: p.isTrending,
    isDeal: p.isDeal,
    description: p.description,
    images: p.images.slice(0, 1),
    specifications: p.specifications.slice(0, 1),
  };
}

export async function getProductSummaries(): Promise<ProductSummary[]> {
  const all = await getProducts();
  return all.map(toSummary);
}

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
