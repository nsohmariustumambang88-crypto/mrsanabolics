'use client';

import * as React from 'react';
import type { ProductSummary } from '@/lib/types';

/*
  Ask /api/catalogue for a page of products.

  The browser no longer holds the catalogue, so every screen that used to filter it in memory
  asks for what it is showing instead. Two rules this hook exists to keep:

  - A REPLY THAT ARRIVES AFTER A NEWER ONE IS DROPPED. Typing "test" fires four searches; the
    third can answer after the fourth. Each request carries the query it was made for, and a
    reply is only used if that query is still the current one.
  - LOADING IS NOT "NOTHING FOUND". The two states are separate, because a grid that says "no
    products match" while the answer is still in flight is a lie the user acts on.
*/

export type CatalogueQuery = {
  q?: string;
  category?: string;
  group?: string;
  brand?: string;
  filter?: string;
  sort?: string;
  max?: number;
  /** Specific products, in order. Ignores every other field. */
  ids?: string[];
};

export type CatalogueGroup = { slug: string; name: string; count: number };

type Result = {
  items: ProductSummary[];
  total: number;
  /** The most expensive product in the catalogue, rounded up: the price slider's top. */
  ceiling: number;
  groups: CatalogueGroup[];
  /** True when nothing matched exactly and these are the closest products instead. */
  similar: boolean;
  loading: boolean;
  loadingMore: boolean;
  error: boolean;
  hasMore: boolean;
  loadMore: () => void;
};

function toSearch(query: CatalogueQuery, page: number, limit: number): string {
  const params = new URLSearchParams();
  if (query.ids?.length) params.set('ids', query.ids.join(','));
  else {
    for (const [key, value] of Object.entries(query)) {
      if (key === 'ids' || value === undefined || value === '' || value === null) continue;
      params.set(key, String(value));
    }
    params.set('page', String(page));
    params.set('limit', String(limit));
  }
  return params.toString();
}

export function useCatalogueSearch(query: CatalogueQuery, limit = 24, enabled = true): Result {
  /* The query as a string, so an object rebuilt on every render does not refetch. */
  const key = JSON.stringify(query);
  const [page, setPage] = React.useState(0);
  const [state, setState] = React.useState<Omit<Result, 'loadMore' | 'hasMore'>>({
    items: [],
    total: 0,
    ceiling: 0,
    groups: [],
    similar: false,
    loading: true,
    loadingMore: false,
    error: false,
  });

  /* A new query starts again at the first page. */
  React.useEffect(() => {
    setPage(0);
  }, [key]);

  React.useEffect(() => {
    /* Nothing to ask for — an empty search box must not fetch the whole catalogue. */
    if (!enabled) {
      setState({ items: [], total: 0, ceiling: 0, groups: [], similar: false, loading: false, loadingMore: false, error: false });
      return;
    }

    const parsed: CatalogueQuery = JSON.parse(key);
    const controller = new AbortController();
    let live = true;

    setState((s) => (page === 0 ? { ...s, loading: true, error: false } : { ...s, loadingMore: true }));

    fetch(`/api/catalogue?${toSearch(parsed, page, limit)}`, { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((data) => {
        if (!live) return;
        setState((s) => ({
          items: page === 0 ? data.items : [...s.items, ...data.items],
          total: data.total,
          ceiling: data.ceiling || s.ceiling,
          groups: data.groups ?? [],
          similar: Boolean(data.similar),
          loading: false,
          loadingMore: false,
          error: false,
        }));
      })
      .catch((e) => {
        if (!live || e?.name === 'AbortError') return;
        setState((s) => ({ ...s, loading: false, loadingMore: false, error: true }));
      });

    return () => {
      live = false;
      controller.abort();
    };
  }, [key, page, limit, enabled]);

  return {
    ...state,
    hasMore: state.items.length < state.total,
    loadMore: React.useCallback(() => setPage((p) => p + 1), []),
  };
}
