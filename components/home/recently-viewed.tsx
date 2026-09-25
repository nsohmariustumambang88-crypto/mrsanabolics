'use client';

import * as React from 'react';
import { ProductGrid } from '@/components/product/product-grid';
import type { ProductSummary } from '@/lib/types';

export function RecentlyViewed({ allProducts }: { allProducts: ProductSummary[] }) {
  const [viewed, setViewed] = React.useState<ProductSummary[]>([]);

  React.useEffect(() => {
    try {
      const stored = localStorage.getItem('mra-recently-viewed');
      if (stored) {
        const ids = JSON.parse(stored) as string[];
        const products = ids
          .slice(0, 8)
          .map((id) => allProducts.find((p) => p.id === id))
          .filter(Boolean) as ProductSummary[];
        if (products.length > 0) {
          setViewed(products);
        }
      }
    } catch {
      // localStorage error - silently fail
    }
  }, [allProducts]);

  if (viewed.length === 0) return null;

  return (
    <section className="border-b border-rule">
      <div className="mx-auto max-w-[86rem] px-4 py-12 sm:px-6 sm:py-16 lg:px-10 lg:py-20">
        <h2 className="font-display text-lg font-semibold tracking-[-0.025em] sm:text-xl">
          Continue shopping
        </h2>
        <p className="mt-1 text-sm text-ink-soft">You were looking at these.</p>
        <ProductGrid products={viewed} columns={4} className="mt-8 sm:mt-10" />
      </div>
    </section>
  );
}
