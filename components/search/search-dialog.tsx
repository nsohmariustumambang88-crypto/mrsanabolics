'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Search, CornerDownLeft } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { useStore } from '@/components/providers/store-provider';
import { useCategories } from '@/components/providers/catalogue-provider';
import { useCatalogueSearch } from '@/components/shop/use-catalogue-search';
import { formatPrice } from '@/lib/format';
import { ProductPlate } from '@/components/product/product-plate';
import { categoryPigment } from '@/lib/site';
import { categoryPath } from '@/lib/catalogue/paths';
import { useSearchLog } from '@/components/analytics/use-search-log';
import { matchesQuery } from '@/lib/search/match';
import type { ProductSummary } from '@/lib/types';
import { cn } from '@/lib/utils';

/*
  What the search looks in depends on the page it was opened from.

  - On the journal, it searches articles only: someone reading a guide who types "cutting" wants
    the guide, not a shop listing.
  - On the shop, a product page, a brand or a category, it searches products only.
  - Everywhere else, products come first and matching articles sit beneath them, so neither is
    hidden.
*/
type Scope = 'products' | 'articles' | 'general';

function scopeFor(pathname: string): Scope {
  if (pathname === '/blog' || pathname.startsWith('/blog/')) return 'articles';
  if (/^\/(shop|product|brands|categories)(\/|$)/.test(pathname)) return 'products';
  return 'general';
}

type ArticleHit = { slug: string; title: string; excerpt: string; category: string };

/*
  The store's own help pages. "return" found nothing because search only looked at products and
  articles; somebody typing it wants the returns policy. Matched with the same forgiving matcher,
  in every scope, and listed first.
*/
type HelpPage = { href: string; title: string; keys: string[] };
const HELP_PAGES: HelpPage[] = [
  { href: '/legal/returns', title: 'Returns and refunds', keys: ['return', 'returns', 'refund', 'exchange', 'damaged', 'broken', 'wrong', 'cancel', 'policy'] },
  { href: '/legal/shipping', title: 'Shipping policy', keys: ['shipping', 'ship', 'delivery', 'deliver', 'tracking', 'track', 'postage', 'courier', 'customs', 'parcel', 'package', 'policy'] },
  { href: '/delivery', title: 'Delivery by country', keys: ['delivery', 'country', 'countries', 'international', 'europe', 'uk', 'canada', 'australia', 'worldwide'] },
  { href: '/faq', title: 'Frequently asked questions', keys: ['faq', 'help', 'questions', 'payment', 'pay', 'bitcoin', 'crypto', 'btc', 'eth', 'ethereum', 'cashapp', 'bank', 'transfer', 'minimum', 'discount', 'code', 'coupon'] },
  { href: '/contact', title: 'Contact us', keys: ['contact', 'email', 'support', 'telegram', 'whatsapp', 'phone', 'message', 'help'] },
  { href: '/legal/privacy', title: 'Privacy policy', keys: ['privacy', 'data', 'cookies', 'gdpr', 'policy'] },
  { href: '/legal/terms', title: 'Terms and conditions', keys: ['terms', 'conditions', 'legal', 'policy'] },
];

type Entry =
  | { kind: 'page'; key: string; href: string; page: HelpPage }
  | { kind: 'product'; key: string; href: string; product: ProductSummary }
  | { kind: 'article'; key: string; href: string; article: ArticleHit };

export function SearchDialog() {
  const router = useRouter();
  const pathname = usePathname();
  const { searchOpen, setSearchOpen } = useStore();
  const categories = useCategories();
  const [query, setQuery] = React.useState('');
  const [cursor, setCursor] = React.useState(0);

  const scope = scopeFor(pathname);
  const showProducts = scope !== 'articles';
  const showArticles = scope !== 'products';

  /* Cmd/Ctrl+K opens it from anywhere — the shortcut people already try. */
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setSearchOpen]);

  React.useEffect(() => {
    if (!searchOpen) {
      setQuery('');
      setCursor(0);
    }
  }, [searchOpen]);

  /*
    Typing is debounced, because every keystroke would otherwise be a request. Products come from
    /api/catalogue and articles from /api/journal/search; the hook for products drops a reply that
    arrives after a newer one, and the article request is aborted when the query changes.
  */
  const [debounced, setDebounced] = React.useState('');
  React.useEffect(() => {
    const trimmed = query.trim();
    const timer = setTimeout(() => setDebounced(trimmed), 180);
    return () => clearTimeout(timer);
  }, [query]);

  const productSearch = useCatalogueSearch(
    { q: debounced },
    7,
    showProducts && debounced.length > 0
  );
  const results = productSearch.items;

  const [articles, setArticles] = React.useState<ArticleHit[]>([]);
  const [articlesSimilar, setArticlesSimilar] = React.useState(false);
  const [articlesLoading, setArticlesLoading] = React.useState(false);
  React.useEffect(() => {
    if (!showArticles || debounced.length === 0) {
      setArticles([]);
      setArticlesSimilar(false);
      setArticlesLoading(false);
      return;
    }
    const controller = new AbortController();
    setArticlesLoading(true);
    fetch(`/api/journal/search?q=${encodeURIComponent(debounced)}`, { signal: controller.signal })
      .then((r) => (r.ok ? (r.json() as Promise<{ items: ArticleHit[]; similar?: boolean }>) : { items: [], similar: false }))
      .then((data) => {
        setArticles(data.items);
        setArticlesSimilar(Boolean(data.similar));
        setArticlesLoading(false);
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === 'AbortError') return;
        setArticles([]);
        setArticlesSimilar(false);
        setArticlesLoading(false);
      });
    return () => controller.abort();
  }, [debounced, showArticles]);

  const pages = debounced
    ? HELP_PAGES.filter((p) => matchesQuery([p.title, ...p.keys], debounced)).slice(0, 3)
    : [];

  const entries: Entry[] = [
    ...pages.map((page): Entry => ({ kind: 'page', key: `h-${page.href}`, href: page.href, page })),
    ...(showProducts
      ? results.map((product): Entry => ({
          kind: 'product',
          key: `p-${product.id}`,
          href: `/product/${product.slug}`,
          product,
        }))
      : []),
    ...(showArticles
      ? articles.map((article): Entry => ({
          kind: 'article',
          key: `a-${article.slug}`,
          href: `/blog/${article.slug}`,
          article,
        }))
      : []),
  ];

  const loading =
    (showProducts && productSearch.loading) || (showArticles && articlesLoading);

  React.useEffect(() => setCursor(0), [query]);

  /* What people ask for, and whether anything answered. See components/analytics. */
  const [settled, setSettled] = React.useState(0);
  React.useEffect(() => {
    if (!loading) setSettled(entries.length);
  }, [loading, entries.length]);
  useSearchLog(debounced, settled);

  const go = React.useCallback(
    (href: string) => {
      setSearchOpen(false);
      router.push(href);
    },
    [router, setSearchOpen]
  );

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setCursor((c) => Math.min(c + 1, Math.max(entries.length - 1, 0)));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setCursor((c) => Math.max(c - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const hit = entries[cursor];
      if (hit) go(hit.href);
      else if (query.trim() && showProducts) go(`/shop?q=${encodeURIComponent(query.trim())}`);
      else if (query.trim()) go('/blog');
    }
  };

  const placeholder =
    scope === 'articles'
      ? 'Search the journal'
      : scope === 'products'
        ? 'Search compounds, brands, categories'
        : 'Search products and articles';

  return (
    <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
      <DialogContent
        className="top-[12%] max-w-xl translate-y-0 gap-0 border-rule bg-paper p-0 shadow-lift-strong"
        aria-describedby={undefined}
      >
        <DialogTitle className="sr-only">Search the site</DialogTitle>

        <div className="flex items-center gap-3 border-b border-rule px-4">
          <Search
            className="h-4 w-4 shrink-0 text-ink-faint"
            strokeWidth={1.6}
            aria-hidden="true"
          />
          <label htmlFor="site-search" className="sr-only">
            {placeholder}
          </label>
          <input
            id="site-search"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={placeholder}
            className="w-full bg-transparent py-4 text-sm outline-none placeholder:text-ink-faint"
            role="combobox"
            aria-expanded={entries.length > 0}
            aria-controls="search-results"
          />
        </div>

        {query.trim() === '' ? (
          showProducts ? (
            <div className="px-4 py-5">
              <p className="font-mono text-2xs uppercase tracking-[0.16em] text-ink-faint">
                Jump to a category
              </p>
              <ul className="mt-3 flex flex-wrap gap-1.5">
                {categories.slice(0, 8).map((c) => (
                  <li key={c.slug}>
                    <button
                      type="button"
                      onClick={() => go(categoryPath(c.slug))}
                      className="inline-flex items-center gap-1.5 rounded-full border border-rule px-2.5 py-1 text-xs text-ink-soft transition-colors hover:border-pigment-indigo-lift hover:text-ink"
                    >
                      <span
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ backgroundColor: categoryPigment(c.slug) }}
                        aria-hidden="true"
                      />
                      {c.name}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="px-4 py-5">
              <button
                type="button"
                onClick={() => go('/blog')}
                className="text-sm text-pigment-indigo underline underline-offset-4"
              >
                Browse all articles
              </button>
            </div>
          )
        ) : entries.length === 0 ? (
          loading ? (
            <p className="px-4 py-10 text-center text-sm text-ink-faint">Searching&hellip;</p>
          ) : (
            <div className="px-4 py-10 text-center">
              <p className="text-sm text-ink-soft">
                {scope === 'articles'
                  ? `No articles match “${query}”.`
                  : `Nothing matches “${query}”.`}
              </p>
              {scope === 'articles' ? (
                <button
                  type="button"
                  onClick={() => go('/blog')}
                  className="mt-3 text-sm text-pigment-indigo underline underline-offset-4"
                >
                  Browse all articles
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => go(`/shop?q=${encodeURIComponent(query.trim())}`)}
                  className="mt-3 text-sm text-pigment-indigo underline underline-offset-4"
                >
                  Search the full catalogue anyway
                </button>
              )}
            </div>
          )
        ) : (
          <ul id="search-results" role="listbox" className="max-h-[24rem] overflow-y-auto">
            {entries.map((entry, i) => {
              const firstPage = entry.kind === 'page' && i === 0;
              const firstProduct = entry.kind === 'product' && (i === 0 || entries[i - 1].kind !== 'product');
              const firstArticle = entry.kind === 'article' && (i === 0 || entries[i - 1].kind !== 'article');
              const label = firstPage
                ? 'Help'
                : firstProduct && productSearch.similar
                  ? 'Closest products'
                  : firstProduct && pages.length > 0
                    ? 'Products'
                    : firstArticle && articlesSimilar
                      ? 'Closest articles'
                      : firstArticle && (showProducts || pages.length > 0)
                        ? 'From the journal'
                        : null;
              return (
                <React.Fragment key={entry.key}>
                  {label && (
                    <li role="presentation" className="border-b border-rule bg-paper-sunk px-4 py-2">
                      <p className="font-mono text-2xs uppercase tracking-[0.16em] text-ink-faint">
                        {label}
                      </p>
                    </li>
                  )}
                  <li role="option" aria-selected={i === cursor}>
                    <Link
                      href={entry.href}
                      onClick={() => setSearchOpen(false)}
                      onMouseEnter={() => setCursor(i)}
                      className={cn(
                        'flex items-center gap-3.5 border-b border-rule px-4 py-3 transition-colors',
                        i === cursor ? 'bg-paper-sunk' : 'hover:bg-paper-sunk'
                      )}
                    >
                      {entry.kind === 'page' ? (
                        <span className="min-w-0 flex-1">
                          <span className="block font-mono text-2xs uppercase tracking-[0.14em] text-ink-faint">
                            Help
                          </span>
                          <span className="mt-0.5 block truncate text-sm font-medium">
                            {entry.page.title}
                          </span>
                        </span>
                      ) : entry.kind === 'product' ? (
                        <>
                          <span className="relative h-11 w-11 shrink-0 overflow-hidden border border-rule bg-paper-sunk">
                            <ProductPlate product={entry.product} showMarking={false} sizes="44px" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block font-mono text-2xs uppercase tracking-[0.14em] text-ink-faint">
                              {entry.product.brand}
                            </span>
                            <span className="mt-0.5 block truncate text-sm font-medium">
                              {entry.product.name}
                            </span>
                          </span>
                          <span className="shrink-0 text-sm tabular">
                            {formatPrice(entry.product.price)}
                          </span>
                        </>
                      ) : (
                        <span className="min-w-0 flex-1">
                          <span className="block font-mono text-2xs uppercase tracking-[0.14em] text-ink-faint">
                            {entry.article.category}
                          </span>
                          <span className="mt-0.5 block truncate text-sm font-medium">
                            {entry.article.title}
                          </span>
                        </span>
                      )}
                      {i === cursor && (
                        <CornerDownLeft
                          className="h-3.5 w-3.5 shrink-0 text-ink-faint"
                          strokeWidth={1.75}
                          aria-hidden="true"
                        />
                      )}
                    </Link>
                  </li>
                </React.Fragment>
              );
            })}
          </ul>
        )}

        <p className="flex items-center gap-3 border-t border-rule px-4 py-2.5 font-mono text-2xs uppercase tracking-[0.14em] text-ink-faint">
          <span>↑↓ move</span>
          <span>↵ open</span>
          <span>esc close</span>
        </p>
      </DialogContent>
    </Dialog>
  );
}
