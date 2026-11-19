'use client';

import { ProductCard } from '@/components/product/product-card';
import type { ProductSummary } from '@/lib/types';
import { cn } from '@/lib/utils';

/*
  Product cards on open ground, spaced like the reference store the owner chose (19 November
  2026): 12px between columns and 28px between rows on a phone, 20px and 40px from md. The
  hairline grid this replaced (`gap-px bg-rule` plus GridFillers to close a short last row) no
  longer applies: the cards have no box of their own, so there is no rule to draw between them
  and nothing to fill.

  Column counts still step 2 / 3 / 4 rather than jumping 2 → 4. On a 1024px laptop four columns
  put each card near 240px, which wraps most product names onto three lines; three columns hold
  the name on two. The fourth column arrives at 1280px, where there is room for it. Changing a
  count means changing the card's `sizes` too.
*/

const SHAPE: Record<number, string> = {
  3: 'grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-2 md:grid-cols-3 xl:grid-cols-4',
};

export function ProductGrid({
  products,
  columns = 4,
  className,
  phoneLimit,
}: {
  products: ProductSummary[];
  columns?: 3 | 4;
  className?: string;
  /** Show only this many below md (768px); the rest appear from md. */
  phoneLimit?: number;
}) {
  const phoneShown =
    phoneLimit === undefined ? products.length : Math.min(products.length, phoneLimit);

  return (
    <div
      className={cn(
        'grid gap-x-3 gap-y-7 md:gap-x-5 md:gap-y-10',
        SHAPE[columns],
        className
      )}
    >
      {products.map((product, i) => (
        <ProductCard
          key={product.id}
          product={product}
          className={i >= phoneShown ? 'max-md:hidden' : undefined}
        />
      ))}
    </div>
  );
}
