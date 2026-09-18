'use client';

import * as React from 'react';
import type { Category, Brand } from '@/lib/types';

/*
  The catalogue's structure, handed from the server to the client once: categories and brands.

  NOT THE PRODUCTS. This context used to carry every product as well, so the header, search, cart
  and a few home sections could filter them in the browser. At ~790 products that was 502 KB of
  JSON — about 660 KB of payload — on every page of the site, most of it on pages that never
  looked at a product. It was the heaviest thing the site sent.

  Products now come from where they are needed:
    - server pages read them directly (lib/db/catalogue.ts) and pass down what they render;
    - the shop browser, the search dialog and the wishlist ask /api/catalogue for one page at a
      time (components/shop/use-catalogue-search.ts);
    - the cart draws from its own stored snapshot.

  Do not add products back here. A component that needs products should receive them as props
  from its server page, or ask the route for exactly what it shows.
*/

export type CatalogueCategory = Category & { listed: number };
export type CatalogueBrand = Brand & { listed: number };

type Catalogue = {
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
    [value.categories, value.brands]
  );

  return <CatalogueContext.Provider value={memo}>{children}</CatalogueContext.Provider>;
}

export function useCatalogue(): Catalogue {
  const ctx = React.useContext(CatalogueContext);
  if (!ctx) {
    throw new Error('useCatalogue must be used inside <CatalogueProvider>');
  }
  return ctx;
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
