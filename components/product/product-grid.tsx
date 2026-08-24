'use client';

import { ProductCard } from '@/components/product/product-card';
import { GridFillers } from '@/components/layout/grid-fillers';
import type { Product } from '@/lib/types';
import { cn } from '@/lib/utils';

/*
  The hairline grid is drawn by the container's own colour showing through a 1px gap, which
  is why a short final row used to leave a bare rule-coloured box sitting in the layout.
  Filler cells close the row instead — see GridFillers.

  Column counts step 2 / 3 / 4 rather than jumping 2 → 4. On a 1024px laptop four columns put
  each card near 240px, which wraps most product names onto three lines; three columns hold
  the name on two. The fourth column arrives at 1280px, where there is room for it.
*/

const SHAPE: Record<number, { cls: string; mid?: number; midPrefix?: 'md'; widePrefix: 'lg' | 'xl' }> = {
  3: { cls: 'grid-cols-2 lg:grid-cols-3', widePrefix: 'lg' },
  4: { cls: 'grid-cols-2 md:grid-cols-3 xl:grid-cols-4', mid: 3, midPrefix: 'md', widePrefix: 'xl' },
};

export function ProductGrid({
  products,
  columns = 4,
  className,
}: {
  products: Product[];
  columns?: 3 | 4;
  className?: string;
}) {
  const shape = SHAPE[columns];

  return (
    <div className={cn('grid gap-px bg-rule', shape.cls, className)}>
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}

      <GridFillers
        len={products.length}
        mid={shape.mid}
        midPrefix={shape.midPrefix}
        wide={columns}
        widePrefix={shape.widePrefix}
      />
    </div>
  );
}
