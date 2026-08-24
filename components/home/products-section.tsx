'use client';

import { SectionHeading } from '@/components/product/section-heading';
import { ProductGrid } from '@/components/product/product-grid';
import type { Product } from '@/lib/types';

export function ProductsSection({
  title,
  description,
  href,
  products,
}: {
  title: string;
  description?: string;
  href?: string;
  products: Product[];
}) {
  if (products.length === 0) return null;

  return (
    <section className="border-b border-rule">
      <div className="mx-auto max-w-[86rem] px-4 py-12 sm:px-6 sm:py-16 lg:px-10 lg:py-20">
        <SectionHeading title={title} description={description} href={href} />
        <ProductGrid products={products} columns={4} className="mt-8 sm:mt-10" />
      </div>
    </section>
  );
}
