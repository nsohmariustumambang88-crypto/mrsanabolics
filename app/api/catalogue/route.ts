import { NextResponse } from 'next/server';
import { getProducts, toSummary } from '@/lib/db/catalogue';
import type { Product, ProductSummary } from '@/lib/types';

/*
  Search and browse the catalogue, one page of results at a time.

  This exists so the browser stops holding the catalogue. The storefront layout used to hand
  every client component all ~790 products through a context — 502 KB of JSON, about 660 KB of
  payload, on EVERY page of the site, so that three screens could filter it. The shop browser,
  the search dialog and the wishlist now ask this route for exactly what they are showing.

  It answers from the same memoised read the pages use (lib/db/catalogue.ts), so a burst of
  searches costs one set of queries a minute, not one per request.

  Two shapes, one route:
    ?ids=a,b,c                      look up specific products (the wishlist)
    ?q=&category=&group=&brand=…    filter, sort and page (the shop browser, the search dialog)
*/

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DEFAULT_LIMIT = 24;
const MAX_LIMIT = 48;
/** A wishlist of hundreds is not a page; it is a scrape. */
const MAX_IDS = 60;

type Sort = 'featured' | 'price-asc' | 'price-desc' | 'rating' | 'newest';

/** The ceiling follows the catalogue, so a price change in the database moves the slider. */
function priceCeiling(list: { price: number }[]): number {
  return Math.ceil(list.reduce((max, p) => Math.max(max, p.price), 0) / 10) * 10;
}

function matches(p: Product, q: string): boolean {
  return (
    p.name.toLowerCase().includes(q) ||
    p.brand.toLowerCase().includes(q) ||
    p.category.toLowerCase().includes(q) ||
    (p.subcategoryName ?? '').toLowerCase().includes(q) ||
    p.description.toLowerCase().includes(q)
  );
}

function sorted(list: Product[], sort: Sort): Product[] {
  switch (sort) {
    case 'price-asc':
      return list.sort((a, b) => a.price - b.price);
    case 'price-desc':
      return list.sort((a, b) => b.price - a.price);
    case 'rating':
      return list.sort((a, b) => b.rating - a.rating);
    case 'newest':
      return list.sort((a, b) => Number(b.isNew ?? 0) - Number(a.isNew ?? 0));
    default:
      return list;
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const param = (key: string) => url.searchParams.get(key)?.trim() ?? '';
  const all = await getProducts();
  const ceiling = priceCeiling(all);

  /* Specific products, in the order they were asked for. */
  const ids = param('ids');
  if (ids) {
    const wanted = ids.split(',').map((s) => s.trim()).filter(Boolean).slice(0, MAX_IDS);
    const byId = new Map(all.map((p) => [p.id, p]));
    const items = wanted.flatMap((id) => {
      const p = byId.get(id);
      return p ? [toSummary(p)] : [];
    });
    return json({ items, total: items.length, ceiling, groups: [] });
  }

  const category = param('category');
  const group = category ? param('group') : '';
  const brand = param('brand');
  const filter = param('filter');
  const query = param('q').toLowerCase();
  const sort = (param('sort') || 'featured') as Sort;
  const max = Number(param('max') || ceiling);
  const page = Math.max(0, Number(param('page') || 0));
  const limit = Math.min(MAX_LIMIT, Math.max(1, Number(param('limit') || DEFAULT_LIMIT)));

  let list = all.slice();
  if (category) list = list.filter((p) => p.categorySlug === category);
  if (group) list = list.filter((p) => p.subcategory === group);
  if (brand) list = list.filter((p) => p.brandSlug === brand);
  if (filter === 'best-sellers') list = list.filter((p) => p.isBestSeller);
  if (filter === 'new') list = list.filter((p) => p.isNew);
  if (filter === 'trending') list = list.filter((p) => p.isTrending);
  if (filter === 'deals') list = list.filter((p) => p.isDeal);
  if (Number.isFinite(max) && max < ceiling) list = list.filter((p) => p.price <= max);
  if (query) list = list.filter((p) => matches(p, query));

  /*
    The groups a category actually holds, counted BEFORE the other filters narrow it — the
    group buttons are a way into the category, so they must not vanish as you filter within it.
  */
  const groups = category
    ? Array.from(
        all
          .filter((p) => p.categorySlug === category && p.subcategory && p.subcategoryName)
          .reduce((seen, p) => {
            const entry = seen.get(p.subcategory!) ?? { slug: p.subcategory!, name: p.subcategoryName!, count: 0 };
            entry.count += 1;
            return seen.set(p.subcategory!, entry);
          }, new Map<string, { slug: string; name: string; count: number }>())
          .values()
      ).sort((a, b) => a.name.localeCompare(b.name))
    : [];

  const total = list.length;
  const items: ProductSummary[] = sorted(list, sort)
    .slice(page * limit, page * limit + limit)
    .map(toSummary);

  return json({ items, total, ceiling, groups });
}

function json(body: unknown) {
  return NextResponse.json(body, {
    /* Popular searches can be served from the edge cache; the data is a minute stale at worst. */
    headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' },
  });
}
