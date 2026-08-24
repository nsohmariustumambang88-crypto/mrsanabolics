'use client';

import * as React from 'react';
import type { Product, Category, Brand } from '@/lib/types';

/*
  The catalogue, handed from the server to the client once.

  Navigation, search, the cart drawer and several home sections all need the catalogue, and
  none of them can query Postgres — they run in the browser. The root layout (a server
  component) reads Neon once per render and passes the result down through this context, so
  the data is genuinely database-backed everywhere while the connection stays on the server.

  SCALE NOTE: this ships the whole catalogue in the RSC payload. At twelve products that is a
  few tens of kilobytes and buys enormous simplicity. It is the wrong shape at a few hundred:
  at that point, give this provider a summary projection (no longDescription, reviews or FAQs)
  and let product pages fetch full records server-side, or move search to a route handler.
*/

export type CatalogueCategory = Category & { listed: number };
export type CatalogueBrand = Brand & { listed: number };

type Catalogue = {
  products: Product[];
  categories: CatalogueCategory[];
  brands: CatalogueBrand[];
};

const CatalogueContext = React.createContext<Catalogue | null>(null);

export function CatalogueProvider({
  value,
  children,
}: {
  value: Catalogue;
  children: React.ReactNode;
}) {
  /*
    The server sends a new array identity on every render. Memoising on the contents keeps
    consumers from re-rendering when nothing actually changed.
  */
  const memo = React.useMemo(
    () => value,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [value.products, value.categories, value.brands]
  );

  return (
    <CatalogueContext.Provider value={memo}>{children}</CatalogueContext.Provider>
  );
}

export function useCatalogue(): Catalogue {
  const ctx = React.useContext(CatalogueContext);
  if (!ctx) {
    throw new Error('useCatalogue must be used inside <CatalogueProvider>');
  }
  return ctx;
}

/** Convenience readers, so components do not destructure the same three fields everywhere. */
export function useProducts(): Product[] {
  return useCatalogue().products;
}

export function useCategories(): CatalogueCategory[] {
  return useCatalogue().categories;
}

export function useBrands(): CatalogueBrand[] {
  return useCatalogue().brands;
}

/** How many products in this catalogue actually sit under a category. */
export function useCategoryCount(slug: string): number {
  const categories = useCategories();
  return categories.find((c) => c.slug === slug)?.listed ?? 0;
}
