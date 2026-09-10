'use client';

import { SectionHeading } from '@/components/product/section-heading';
import { ProductGrid } from '@/components/product/product-grid';
import type { ProductSummary } from '@/lib/types';

export function ProductsSection({
  title,
  description,
  href,
  products,
  limit = 8,
}: {
  title: string;
  description?: string;
  href?: string;
  products: ProductSummary[];
  /**
   * How many to show. A home page carries a SELECTION and a way through to the rest; it is not
   * the shop.
   *
   * This section had no cap, which was invisible at twelve fixture products and became 27% of
   * a thirty-five-screen page once the real catalogue arrived with 42 best sellers. Eight is
   * two full rows at the grid's widest step (4) and four at its narrowest (2), so the row
   * always closes and `GridFillers` has nothing to patch.
   */
  limit?: number;
}) {
  if (products.length === 0) return null;

  const shown = products.slice(0, limit);

  return (
    <section className="border-b border-rule">
      <div className="mx-auto max-w-[86rem] px-4 py-12 sm:px-6 sm:py-16 lg:px-10 lg:py-20">
        <SectionHeading title={title} description={description} href={href} />
        <ProductGrid products={shown} columns={4} className="mt-8 sm:mt-10" />
      </div>
    </section>
  );
}
