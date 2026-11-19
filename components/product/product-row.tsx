import { ProductCard } from '@/components/product/product-card';
import type { ProductSummary } from '@/lib/types';

export function ProductRow({ products }: { products: ProductSummary[] }) {
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-7 md:grid-cols-3 md:gap-x-5 md:gap-y-10 lg:grid-cols-4">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  );
}
