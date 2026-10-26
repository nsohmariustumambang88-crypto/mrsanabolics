'use client';

import * as React from 'react';
import { ProductGrid } from '@/components/product/product-grid';
import type { ProductSummary } from '@/lib/types';

/*
  "Continue shopping": the visitor's last viewed products, from the ids kept in localStorage.

  It asks /api/catalogue for just those ids — the same route the wishlist uses. It used to be
  handed every product in the catalogue as a prop, which put all ~790 summaries into the home
  page's HTML for every visitor (most of its 984 KB) to show at most eight to the few who had
  viewed something.
*/
export function RecentlyViewed() {
  const [viewed, setViewed] = React.useState<ProductSummary[]>([]);

  React.useEffect(() => {
    let ids: string[] = [];
    try {
      const stored = localStorage.getItem('mra-recently-viewed');
      if (stored) ids = (JSON.parse(stored) as string[]).filter((id) => typeof id === 'string').slice(0, 8);
    } catch {
      /* Storage refused or malformed: nothing to continue. */
    }
    if (ids.length === 0) return;

    const controller = new AbortController();
    fetch(`/api/catalogue?ids=${ids.map(encodeURIComponent).join(',')}`, { signal: controller.signal })
      .then((r) => (r.ok ? (r.json() as Promise<{ items: ProductSummary[] }>) : { items: [] }))
      .then((data) => setViewed(data.items))
      .catch(() => {
        /* Aborted or offline: the section simply does not appear. */
      });
    return () => controller.abort();
  }, []);

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
