import Link from 'next/link';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { ProductsTable, type AdminProductRow } from '@/components/admin/products-table';
import { WpSubsubsub } from '@/components/admin/wp-ui';
import { WpScreenMeta } from '@/components/admin/wp-notice';

/*
  The catalogue list screen.

  Every control writes to the URL rather than to component state: a filtered, sorted, searched
  view is then a shareable address, the back button behaves, and the server does the work in
  one query instead of shipping the whole table to the browser to filter client-side.

  The filter row is WordPress's subsubsub — "All (12) | In stock (9) | …" — and each count is
  a real query rather than a label, so a tab that reads zero is telling the truth.
*/

export const dynamic = 'force-dynamic';

type Params = {
  q?: string;
  filter?: string;
  category?: string;
  sort?: string;
  dir?: string;
};

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'available', label: 'In stock' },
  { key: 'low', label: 'Low stock' },
  { key: 'out', label: 'Out of stock' },
  { key: 'offer', label: 'On offer' },
  { key: 'no-image', label: 'No image' },
] as const;

function filterWhere(filter?: string): Prisma.ProductWhereInput {
  switch (filter) {
    case 'available':
      return { inStock: true };
    case 'low':
      return { inStock: true, stockCount: { lte: 5 } };
    case 'out':
      return { inStock: false };
    case 'offer':
      return { isDeal: true };
    case 'no-image':
      return { images: { isEmpty: true } };
    default:
      return {};
  }
}

function whereFor(params: Params): Prisma.ProductWhereInput {
  const where: Prisma.ProductWhereInput = { ...filterWhere(params.filter) };

  if (params.category) where.category = { slug: params.category };

  const q = params.q?.trim();
  if (q) {
    where.OR = [
      { name: { contains: q, mode: 'insensitive' } },
      { slug: { contains: q, mode: 'insensitive' } },
      { description: { contains: q, mode: 'insensitive' } },
      { brand: { name: { contains: q, mode: 'insensitive' } } },
    ];
  }

  return where;
}

function orderFor(sort: string, dir: 'asc' | 'desc'): Prisma.ProductOrderByWithRelationInput {
  switch (sort) {
    case 'name':
      return { name: dir };
    case 'price':
      return { price: dir };
    case 'stock':
      return { stockCount: dir };
    case 'category':
      return { category: { name: dir } };
    case 'brand':
      return { brand: { name: dir } };
    default:
      return { position: dir };
  }
}

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Params;
}) {
  await requireAdmin();

  const sort = searchParams.sort ?? 'position';
  const dir: 'asc' | 'desc' = searchParams.dir === 'desc' ? 'desc' : 'asc';
  const activeTab = searchParams.filter ?? 'all';

  /* Tab counts respect the category and search terms already applied, so the numbers
     describe the list you are actually looking at. */
  const scope: Prisma.ProductWhereInput = {};
  if (searchParams.category) scope.category = { slug: searchParams.category };
  const q = searchParams.q?.trim();
  if (q) {
    scope.OR = [
      { name: { contains: q, mode: 'insensitive' } },
      { slug: { contains: q, mode: 'insensitive' } },
      { description: { contains: q, mode: 'insensitive' } },
      { brand: { name: { contains: q, mode: 'insensitive' } } },
    ];
  }

  const [products, categories, tabCounts] = await Promise.all([
    prisma.product.findMany({
      where: whereFor(searchParams),
      orderBy: orderFor(sort, dir),
      include: { category: true, brand: true },
    }),
    prisma.category.findMany({
      orderBy: { position: 'asc' },
      select: { slug: true, name: true },
    }),
    Promise.all(
      TABS.map((t) =>
        prisma.product.count({ where: { ...scope, ...filterWhere(t.key) } })
      )
    ),
  ]);

  const rows: AdminProductRow[] = products.map((p) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    price: p.price.toString(),
    compareAtPrice: p.compareAtPrice?.toString() ?? null,
    stockCount: p.stockCount,
    inStock: p.inStock,
    isBestSeller: p.isBestSeller,
    isNew: p.isNew,
    isTrending: p.isTrending,
    isDeal: p.isDeal,
    categoryName: p.category.name,
    categorySlug: p.category.slug,
    brandName: p.brand.name,
    image: p.images[0] ?? null,
  }));

  /* Build hrefs that keep every other filter intact. */
  const href = (patch: Partial<Params>) => {
    const next = new URLSearchParams();
    const merged = { ...searchParams, ...patch };
    for (const [k, v] of Object.entries(merged)) {
      if (v && v !== 'all') next.set(k, String(v));
    }
    const qs = next.toString();
    return qs ? `/admin/products?${qs}` : '/admin/products';
  };

  const activeCategory = categories.find((c) => c.slug === searchParams.category);
  const filtered = Boolean(searchParams.q || searchParams.category || searchParams.filter);

  return (
    <>
      <WpScreenMeta
        help={
          <div>
            <p className="mt-0">
              <strong>Editing.</strong> Click a product name to open it. Hover a row for Edit,
              View and Delete. The stock field edits in place — tab or press Enter to save.
            </p>
            <p>
              <strong>Bulk actions.</strong> Tick rows, choose an action, press Apply. The
              selection is dropped when you change filters, so an action can never reach a row
              you cannot see.
            </p>
            <p className="mb-0">
              <strong>Sorting and filtering</strong> live in the address bar, so any view here
              can be bookmarked or shared.
            </p>
          </div>
        }
      />

      <h1 className="wp-heading-inline">Products</h1>
      <Link href="/admin/products/new" className="wp-page-title-action">
        Add New
      </Link>

      {searchParams.q && (
        <span className="ml-2 wp-muted">
          Search results for “<strong>{searchParams.q}</strong>”
        </span>
      )}

      <hr className="my-2 border-0 border-t border-[#c3c4c7]" />

      <WpSubsubsub
        items={TABS.map((t, i) => ({
          href: href({ filter: t.key }),
          label: t.label,
          count: tabCounts[i],
          current: activeTab === t.key,
        }))}
      />

      {/* Category filter and search, each its own GET form so neither needs JavaScript. */}
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <form method="get" action="/admin/products" className="flex items-center gap-2">
          {activeTab !== 'all' && <input type="hidden" name="filter" value={activeTab} />}
          {searchParams.q && <input type="hidden" name="q" value={searchParams.q} />}

          <label className="wp-screen-reader-text" htmlFor="filter-category">
            Filter by category
          </label>
          <select
            id="filter-category"
            name="category"
            defaultValue={searchParams.category ?? ''}
            className="wp-select wp-w-auto"
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>

          <button type="submit" className="wp-button">
            Filter
          </button>

          {filtered && (
            <Link href="/admin/products" className="wp-button">
              Clear
            </Link>
          )}
        </form>

        <form method="get" action="/admin/products" className="flex items-center gap-2">
          {activeTab !== 'all' && <input type="hidden" name="filter" value={activeTab} />}
          {searchParams.category && (
            <input type="hidden" name="category" value={searchParams.category} />
          )}
          <label className="wp-screen-reader-text" htmlFor="product-search">
            Search products
          </label>
          <input
            id="product-search"
            name="q"
            defaultValue={searchParams.q ?? ''}
            placeholder="Search products"
            className="wp-input wp-input-search"
          />
          <button type="submit" className="wp-button">
            Search Products
          </button>
        </form>
      </div>

      {activeCategory && (
        <p className="wp-subtitle">
          Showing <strong>{activeCategory.name}</strong> only.{' '}
          <Link href={href({ category: undefined })}>Show all categories</Link>
        </p>
      )}

      <ProductsTable
        rows={rows}
        sort={sort}
        dir={dir}
        query={{
          ...(searchParams.q ? { q: searchParams.q } : {}),
          ...(searchParams.filter && searchParams.filter !== 'all'
            ? { filter: searchParams.filter }
            : {}),
          ...(searchParams.category ? { category: searchParams.category } : {}),
        }}
      />
    </>
  );
}
