'use client';

import { SectionHeading } from '@/components/product/section-heading';
import { ProductRow } from '@/components/product/product-row';
import { StaggerGroup } from '@/components/animations/motion';
import type { Product } from '@/lib/types';

export function ProductsSection({
  eyebrow,
  title,
  description,
  href,
  products,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  href?: string;
  products: Product[];
}) {
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 lg:px-6">
      <SectionHeading
        eyebrow={eyebrow}
        title={title}
        description={description}
        href={href}
      />
      <StaggerGroup className="mt-10">
        <ProductRow products={products} />
      </StaggerGroup>
    </section>
  );
}
