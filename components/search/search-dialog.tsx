'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
import { cn } from '@/lib/utils';

export function SearchDialog() {
  const router = useRouter();
  const { searchOpen, setSearchOpen } = useStore();
  const categories = useCategories();
  const [query, setQuery] = React.useState('');
  const [cursor, setCursor] = React.useState(0);

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
    Results come from /api/catalogue, not from a copy of the catalogue in the browser.

    Typing is debounced, because every keystroke would otherwise be a request: the dialog asks
    once the typing pauses. The hook drops a reply that arrives after a newer one, so a slow
    answer for "tes" cannot overwrite the answer for "test".
  */
  const [debounced, setDebounced] = React.useState('');
  React.useEffect(() => {
    const trimmed = query.trim();
    const timer = setTimeout(() => setDebounced(trimmed), 180);
    return () => clearTimeout(timer);
  }, [query]);

  const { items: results, loading } = useCatalogueSearch({ q: debounced }, 7, debounced.length > 0);

  React.useEffect(() => setCursor(0), [query]);

  /* What people ask for, and whether the catalogue answered. See components/analytics. */
  const [settled, setSettled] = React.useState(0);
  React.useEffect(() => {
    if (!loading) setSettled(results.length);
  }, [loading, results.length]);
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
      setCursor((c) => Math.min(c + 1, Math.max(results.length - 1, 0)));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setCursor((c) => Math.max(c - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const hit = results[cursor];
      if (hit) go(`/product/${hit.slug}`);
      else if (query.trim()) go(`/shop?q=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
      <DialogContent className="top-[12%] max-w-xl translate-y-0 gap-0 border-rule bg-paper p-0 shadow-lift-strong">
        <DialogTitle className="sr-only">Search the catalogue</DialogTitle>

        <div className="flex items-center gap-3 border-b border-rule px-4">
          <Search
            className="h-4 w-4 shrink-0 text-ink-faint"
            strokeWidth={1.6}
            aria-hidden="true"
          />
          <label htmlFor="site-search" className="sr-only">
            Search compounds, brands, and categories
          </label>
          <input
            id="site-search"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search compounds, brands, categories"
            className="w-full bg-transparent py-4 text-sm outline-none placeholder:text-ink-faint"
            role="combobox"
            aria-expanded={results.length > 0}
            aria-controls="search-results"
          />
        </div>

        {query.trim() === '' ? (
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
        ) : results.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <p className="text-sm text-ink-soft">
              Nothing matches &ldquo;{query}&rdquo;.
            </p>
            <button
              type="button"
              onClick={() => go(`/shop?q=${encodeURIComponent(query.trim())}`)}
              className="mt-3 text-sm text-pigment-indigo underline underline-offset-4"
            >
              Search the full catalogue anyway
            </button>
          </div>
        ) : (
          <ul id="search-results" role="listbox" className="max-h-[24rem] overflow-y-auto">
            {results.map((p, i) => (
              <li key={p.id} role="option" aria-selected={i === cursor}>
                <Link
                  href={`/product/${p.slug}`}
                  onClick={() => setSearchOpen(false)}
                  onMouseEnter={() => setCursor(i)}
                  className={cn(
                    'flex items-center gap-3.5 border-b border-rule px-4 py-3 transition-colors',
                    i === cursor ? 'bg-paper-sunk' : 'hover:bg-paper-sunk'
                  )}
                >
                  <span className="relative h-11 w-11 shrink-0 overflow-hidden border border-rule bg-paper-sunk">
                    <ProductPlate product={p} showMarking={false} sizes="44px" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-mono text-2xs uppercase tracking-[0.14em] text-ink-faint">
                      {p.brand}
                    </span>
                    <span className="mt-0.5 block truncate text-sm font-medium">
                      {p.name}
                    </span>
                  </span>
                  <span className="shrink-0 text-sm tabular">{formatPrice(p.price)}</span>
                  {i === cursor && (
                    <CornerDownLeft
                      className="h-3.5 w-3.5 shrink-0 text-ink-faint"
                      strokeWidth={1.75}
                      aria-hidden="true"
                    />
                  )}
                </Link>
              </li>
            ))}
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
