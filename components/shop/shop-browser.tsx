'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { ProductGrid } from '@/components/product/product-grid';
import {
  useCategories,
  useBrands,
} from '@/components/providers/catalogue-provider';
import { formatPrice } from '@/lib/format';
import { categoryPigment } from '@/lib/site';
import { useSearchLog } from '@/components/analytics/use-search-log';
import { useCatalogueSearch } from '@/components/shop/use-catalogue-search';
import { cn } from '@/lib/utils';

/*
  Two doors into one catalogue, per PRODUCT.md: a compound-led path (category and manufacturer
  filters) and a goal-led path (the named filters). Every filter is a URL parameter, so a
  filtered view is a shareable, linkable address rather than hidden component state.
*/

type Sort = 'featured' | 'price-asc' | 'price-desc' | 'rating' | 'newest';

const SORTS: { value: Sort; label: string }[] = [
  { value: 'featured', label: 'Featured' },
  { value: 'price-asc', label: 'Price, low to high' },
  { value: 'price-desc', label: 'Price, high to low' },
  { value: 'rating', label: 'Best rated' },
  { value: 'newest', label: 'Newest' },
];

const NAMED_FILTERS: { value: string; label: string }[] = [
  { value: 'best-sellers', label: 'Best sellers' },
  { value: 'new', label: 'Newly floated' },
  { value: 'trending', label: 'Moving this week' },
  { value: 'deals', label: 'On offer' },
];

/** How many products arrive per request. The rest come on "Show more". */
const PAGE_SIZE = 24;

/**
 * The slider's top before the first reply lands. The real ceiling comes from the catalogue with
 * the results; this only has to be sane for the frame or two before it arrives.
 */
const FALLBACK_CEILING = 500;

export function ShopBrowser() {
  const router = useRouter();
  const params = useSearchParams();
  /* The catalogue is no longer shipped to the browser: the server filters and pages it. */
  const categories = useCategories();
  const brands = useBrands();


  const category = params.get('category') ?? '';
  /* The compound group — the folder's second level. Only meaningful inside a category. */
  const group = category ? params.get('group') ?? '' : '';
  const brand = params.get('brand') ?? '';
  const filter = params.get('filter') ?? '';
  const query = params.get('q') ?? '';
  const sort = (params.get('sort') as Sort) ?? 'featured';
  const maxParam = params.get('max');

  const [draftQuery, setDraftQuery] = React.useState(query);
  const [panelOpen, setPanelOpen] = React.useState(false);

  React.useEffect(() => setDraftQuery(query), [query]);

  const setParam = React.useCallback(
    (key: string, value: string | null) => {
      const next = new URLSearchParams(Array.from(params.entries()));
      if (!value) next.delete(key);
      else next.set(key, value);
      /* A group belongs to its category: changing or clearing the category drops it. */
      if (key === 'category') next.delete('group');
      const qs = next.toString();
      router.replace(qs ? `/shop?${qs}` : '/shop', { scroll: false });
    },
    [params, router]
  );

  const clearAll = () => router.replace('/shop', { scroll: false });

  /*
    The results, from the server. The filtering that used to run here over every product in the
    browser now runs in /api/catalogue, which also hands back the price ceiling and the
    category's compound groups — the two things the filters need but a page of results does not
    carry.
  */
  const {
    items: visible,
    total,
    ceiling,
    groups,
    loading,
    loadingMore,
    error,
    hasMore,
    loadMore,
  } = useCatalogueSearch(
    { q: query, category, group, brand, filter, sort, max: maxParam ? Number(maxParam) : undefined },
    PAGE_SIZE
  );

  /* Until the first reply lands, the slider has no ceiling to draw; fall back to a sane top. */
  const PRICE_CEILING = ceiling || FALLBACK_CEILING;
  const maxPrice = Number(maxParam ?? PRICE_CEILING);

  /*
    The committed ?q= search, reported once the results are known. The count is held at the last
    settled value while a request is in flight, so a search is never logged as "0 results"
    because its answer had not arrived yet.
  */
  const [settledTotal, setSettledTotal] = React.useState(0);
  React.useEffect(() => {
    if (!loading) setSettledTotal(total);
  }, [loading, total]);
  useSearchLog(query, settledTotal);

  const activeCount =
    (category ? 1 : 0) +
    (group ? 1 : 0) +
    (brand ? 1 : 0) +
    (filter ? 1 : 0) +
    (query ? 1 : 0) +
    (maxPrice < PRICE_CEILING ? 1 : 0);

  const heading =
    groups.find((g) => g.slug === group)?.name ??
    categories.find((c) => c.slug === category)?.name ??
    brands.find((b) => b.slug === brand)?.name ??
    NAMED_FILTERS.find((f) => f.value === filter)?.label ??
    'The catalogue';

  const Filters = (
    <div className="space-y-8">
      <div>
        <h2 className="font-mono text-2xs uppercase tracking-[0.16em] text-ink-faint">
          Category
        </h2>
        <ul className="mt-3 space-y-0.5">
          <li>
            <button
              type="button"
              onClick={() => setParam('category', null)}
              className={cn(
                'w-full py-1.5 text-left text-sm transition-colors',
                !category ? 'font-medium text-pigment-indigo' : 'text-ink-soft hover:text-ink'
              )}
            >
              Everything
            </button>
          </li>
          {categories.map((c) => (
            <li key={c.slug}>
              <button
                type="button"
                onClick={() => setParam('category', category === c.slug ? null : c.slug)}
                className={cn(
                  'flex w-full items-center gap-2.5 py-1.5 text-left text-sm transition-colors',
                  category === c.slug
                    ? 'font-medium text-pigment-indigo'
                    : 'text-ink-soft hover:text-ink'
                )}
              >
                <span
                  className="h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ backgroundColor: categoryPigment(c.slug) }}
                  aria-hidden="true"
                />
                <span className="flex-1">{c.name}</span>
                <span className="font-mono text-2xs text-ink-faint tabular">
                  {c.listed}
                </span>
              </button>

              {/* The category's compound groups, indented under it while it is selected. */}
              {category === c.slug && groups.length > 0 && (
                <ul className="mb-2 ml-4 mt-1 space-y-0.5 border-l border-rule pl-3">
                  {groups.map((g) => (
                    <li key={g.slug}>
                      <button
                        type="button"
                        onClick={() => setParam('group', group === g.slug ? null : g.slug)}
                        className={cn(
                          'flex w-full items-center gap-2 py-1 text-left text-xs transition-colors',
                          group === g.slug
                            ? 'font-medium text-pigment-indigo'
                            : 'text-ink-soft hover:text-ink'
                        )}
                      >
                        <span className="flex-1">{g.name}</span>
                        <span className="font-mono text-2xs text-ink-faint tabular">
                          {g.count}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h2 className="font-mono text-2xs uppercase tracking-[0.16em] text-ink-faint">
          Manufacturer
        </h2>
        <ul className="mt-3 space-y-0.5">
          {brands.map((b) => (
            <li key={b.slug}>
              <button
                type="button"
                onClick={() => setParam('brand', brand === b.slug ? null : b.slug)}
                className={cn(
                  'w-full py-1.5 text-left text-sm transition-colors',
                  brand === b.slug
                    ? 'font-medium text-pigment-indigo'
                    : 'text-ink-soft hover:text-ink'
                )}
              >
                {b.name}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h2 className="font-mono text-2xs uppercase tracking-[0.16em] text-ink-faint">
          Collections
        </h2>
        <ul className="mt-3 space-y-0.5">
          {NAMED_FILTERS.map((f) => (
            <li key={f.value}>
              <button
                type="button"
                onClick={() => setParam('filter', filter === f.value ? null : f.value)}
                className={cn(
                  'w-full py-1.5 text-left text-sm transition-colors',
                  filter === f.value
                    ? 'font-medium text-pigment-indigo'
                    : 'text-ink-soft hover:text-ink'
                )}
              >
                {f.label}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <label
          htmlFor="max-price"
          className="font-mono text-2xs uppercase tracking-[0.16em] text-ink-faint"
        >
          Up to {formatPrice(maxPrice)}
        </label>
        <input
          id="max-price"
          type="range"
          min={0}
          max={PRICE_CEILING}
          step={5}
          value={maxPrice}
          onChange={(e) =>
            setParam(
              'max',
              Number(e.target.value) >= PRICE_CEILING ? null : e.target.value
            )
          }
          className="mt-3 w-full accent-pigment-indigo"
        />
      </div>
    </div>
  );

  return (
    <>
      <section className="border-b border-rule">
        <div className="mx-auto max-w-[86rem] px-4 py-10 sm:px-6 lg:px-10 lg:py-14">
          <h1 className="font-display text-[clamp(2rem,4vw,3.25rem)] font-semibold leading-[1.02] tracking-[-0.04em]">
            {heading}
          </h1>
          <p className="measure mt-3 text-sm leading-relaxed text-ink-soft sm:text-base">
            {loading ? 'Loading the catalogue…' : `${total} ${total === 1 ? 'product' : 'products'}`}
            {!loading && activeCount > 0 ? ' match these filters.' : '.'} Each listing carries its
            manufacturer, strength and pack as printed on the product.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-[86rem] px-4 sm:px-6 lg:px-10">
        <div className="grid gap-10 py-10 lg:grid-cols-[16rem_minmax(0,1fr)]">
          <aside className="hidden lg:block">
            <div className="sticky top-28">{Filters}</div>
          </aside>

          <div>
            <div className="flex flex-wrap items-center gap-3 border-b border-rule pb-4">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setParam('q', draftQuery || null);
                }}
                className="flex min-w-[12rem] flex-1 items-center gap-2 border-b border-rule-strong focus-within:border-pigment-indigo"
              >
                <Search
                  className="h-4 w-4 shrink-0 text-ink-faint"
                  strokeWidth={1.6}
                  aria-hidden="true"
                />
                <label htmlFor="shop-search" className="sr-only">
                  Search the catalogue
                </label>
                <input
                  id="shop-search"
                  value={draftQuery}
                  onChange={(e) => setDraftQuery(e.target.value)}
                  placeholder="Search compounds, brands, categories"
                  className="w-full bg-transparent py-2 text-sm outline-none placeholder:text-ink-faint"
                />
              </form>

              <button
                type="button"
                onClick={() => setPanelOpen((v) => !v)}
                className="flex items-center gap-2 border border-rule-strong px-3 py-2 text-sm transition-colors hover:border-pigment-indigo lg:hidden"
              >
                <SlidersHorizontal className="h-4 w-4" strokeWidth={1.6} />
                Filters
                {activeCount > 0 && (
                  <span className="font-mono text-2xs tabular">({activeCount})</span>
                )}
              </button>

              <div className="flex items-center gap-2">
                <label
                  htmlFor="sort"
                  className="font-mono text-2xs uppercase tracking-[0.14em] text-ink-faint"
                >
                  Sort
                </label>
                <select
                  id="sort"
                  value={sort}
                  onChange={(e) =>
                    setParam('sort', e.target.value === 'featured' ? null : e.target.value)
                  }
                  className="border border-rule-strong bg-paper px-2 py-1.5 text-sm outline-none focus:border-pigment-indigo"
                >
                  {SORTS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {panelOpen && (
              <div className="border-b border-rule py-6 lg:hidden">{Filters}</div>
            )}

            {activeCount > 0 && (
              <div className="flex flex-wrap items-center gap-2 py-4">
                {category && (
                  <FilterChip
                    label={categories.find((c) => c.slug === category)?.name ?? category}
                    onClear={() => setParam('category', null)}
                  />
                )}
                {group && (
                  <FilterChip
                    label={groups.find((g) => g.slug === group)?.name ?? group}
                    onClear={() => setParam('group', null)}
                  />
                )}
                {brand && (
                  <FilterChip
                    label={brands.find((b) => b.slug === brand)?.name ?? brand}
                    onClear={() => setParam('brand', null)}
                  />
                )}
                {filter && (
                  <FilterChip
                    label={NAMED_FILTERS.find((f) => f.value === filter)?.label ?? filter}
                    onClear={() => setParam('filter', null)}
                  />
                )}
                {query && (
                  <FilterChip label={`“${query}”`} onClear={() => setParam('q', null)} />
                )}
                {maxPrice < PRICE_CEILING && (
                  <FilterChip
                    label={`Under ${formatPrice(maxPrice)}`}
                    onClear={() => setParam('max', null)}
                  />
                )}
                <button
                  type="button"
                  onClick={clearAll}
                  className="text-xs text-ink-faint underline underline-offset-4 transition-colors hover:text-ink"
                >
                  Clear all
                </button>
              </div>
            )}

            {loading ? (
              /* Not an empty state: "nothing matches" while the answer is in flight is a lie. */
              <p className="mt-6 border border-rule bg-card px-6 py-20 text-center text-sm text-ink-soft">
                Loading…
              </p>
            ) : error ? (
              <div className="mt-6 border border-rule bg-card px-6 py-20 text-center">
                <h2 className="font-display text-xl font-semibold tracking-[-0.025em]">
                  The catalogue did not answer
                </h2>
                <p className="measure-tight mx-auto mt-3 text-sm leading-relaxed text-ink-soft">
                  Something went wrong fetching these products. Try again in a moment.
                </p>
              </div>
            ) : visible.length === 0 ? (
              <div className="border border-rule bg-card px-6 py-20 text-center">
                <h2 className="font-display text-xl font-semibold tracking-[-0.025em]">
                  Nothing in the bath matches that
                </h2>
                <p className="measure-tight mx-auto mt-3 text-sm leading-relaxed text-ink-soft">
                  Try a broader price range, or clear a filter. Every compound in the
                  catalogue is listed under exactly one category.
                </p>
                <button
                  type="button"
                  onClick={clearAll}
                  className="mt-6 rounded-full bg-pigment-indigo px-6 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-pigment-indigo-lift"
                >
                  Clear all filters
                </button>
              </div>
            ) : (
              <>
                <ProductGrid products={visible} columns={3} className="mt-6" />
                {hasMore && (
                  <div className="mt-8 flex flex-col items-center gap-2">
                    <button
                      type="button"
                      onClick={loadMore}
                      disabled={loadingMore}
                      className="rounded-full border border-rule-strong px-6 py-3 text-sm font-medium transition-colors hover:border-pigment-indigo hover:bg-paper-sunk disabled:opacity-60"
                    >
                      {loadingMore ? 'Loading…' : 'Show more'}
                    </button>
                    <p className="font-mono text-2xs uppercase tracking-[0.14em] text-ink-faint tabular">
                      {visible.length} of {total} shown
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function FilterChip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 border border-rule bg-paper-sunk px-2.5 py-1 text-xs">
      {label}
      <button
        type="button"
        onClick={onClear}
        aria-label={`Remove ${label} filter`}
        className="text-ink-faint transition-colors hover:text-pigment-madder"
      >
        <X className="h-3 w-3" strokeWidth={2} />
      </button>
    </span>
  );
}
