'use client';

import * as React from 'react';
import Link from 'next/link';
import { Search, TrendingUp, Clock, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useStore } from '@/components/providers/store-provider';
import { products } from '@/lib/data/products';
import { formatPrice } from '@/lib/format';

const popularSearches = ['Testosterone', 'SARMs', 'PCT', 'Peptides', 'Fat Burners'];
const recentSearchesKey = 'mranabolics-recent-searches';

export function SearchDialog() {
  const { searchOpen, setSearchOpen } = useStore();
  const [query, setQuery] = React.useState('');
  const [recent, setRecent] = React.useState<string[]>([]);

  React.useEffect(() => {
    try {
      const r = localStorage.getItem(recentSearchesKey);
      if (r) setRecent(JSON.parse(r));
    } catch {}
  }, []);

  const results = React.useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return products
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.brand.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q)
      )
      .slice(0, 6);
  }, [query]);

  const saveRecent = (term: string) => {
    const updated = [term, ...recent.filter((r) => r !== term)].slice(0, 5);
    setRecent(updated);
    localStorage.setItem(recentSearchesKey, JSON.stringify(updated));
  };

  return (
    <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
      <DialogContent className="top-[15%] max-w-2xl translate-y-0 gap-0 overflow-hidden p-0">
        <DialogTitle className="sr-only">Search products</DialogTitle>
        <div className="flex items-center border-b border-border px-4">
          <Search className="h-5 w-5 shrink-0 text-muted-foreground" />
          <Input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && query.trim()) {
                saveRecent(query.trim());
                setSearchOpen(false);
                window.location.href = `/shop?q=${encodeURIComponent(query.trim())}`;
              }
            }}
            placeholder="Search products, brands, categories..."
            className="border-0 focus-visible:ring-0"
          />
          <button
            onClick={() => setSearchOpen(false)}
            className="rounded-md p-1 text-muted-foreground hover:text-foreground"
            aria-label="Close search"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-4">
          {!query.trim() ? (
            <div className="space-y-6">
              <div>
                <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <TrendingUp className="h-3.5 w-3.5" /> Popular Searches
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {popularSearches.map((s) => (
                    <button
                      key={s}
                      onClick={() => {
                        setQuery(s);
                        saveRecent(s);
                      }}
                      className="rounded-full border border-border bg-secondary/50 px-3 py-1.5 text-sm transition-colors hover:border-accent hover:text-accent"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              {recent.length > 0 && (
                <div>
                  <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" /> Recent Searches
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {recent.map((s) => (
                      <button
                        key={s}
                        onClick={() => setQuery(s)}
                        className="rounded-full border border-border bg-secondary/50 px-3 py-1.5 text-sm transition-colors hover:border-accent hover:text-accent"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : results.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm text-muted-foreground">
                No results for &ldquo;{query}&rdquo;
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {results.map((p) => (
                <Link
                  key={p.id}
                  href={`/product/${p.slug}`}
                  onClick={() => {
                    saveRecent(query.trim());
                    setSearchOpen(false);
                  }}
                  className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-secondary"
                >
                  <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-background">
                    <img
                      src={p.images[0]}
                      alt={p.name}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{p.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.brand} · {p.category}
                    </p>
                  </div>
                  <span className="text-sm font-semibold">
                    {formatPrice(p.price)}
                  </span>
                </Link>
              ))}
              <Link
                href={`/shop?q=${encodeURIComponent(query)}`}
                onClick={() => setSearchOpen(false)}
                className="block rounded-lg p-2 text-center text-sm font-medium text-accent transition-colors hover:bg-secondary"
              >
                View all results for &ldquo;{query}&rdquo;
              </Link>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
