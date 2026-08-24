import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { ProductCreateForm } from '@/components/admin/product-create-form';

export const dynamic = 'force-dynamic';

export default async function NewProductPage() {
  await requireAdmin();

  /* Category and brand are foreign keys, so the form offers real rows rather than free text. */
  const [categories, brands] = await Promise.all([
    prisma.category.findMany({
      orderBy: { position: 'asc' },
      select: { id: true, name: true },
    }),
    prisma.brand.findMany({
      orderBy: { position: 'asc' },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/admin/products"
          className="mb-1 flex w-fit items-center gap-1.5 text-[13px]"
        >
          <ChevronLeft className="h-4 w-4" strokeWidth={1.75} />
          All products
        </Link>

        <h1 className="wp-heading-inline">
          Add product
        </h1>
        <p className="max-w-[46rem] mt-2 text-sm wp-muted">
          Writes straight to Neon. The product appears on the storefront as soon as the
          catalogue cache turns over, within a minute.
        </p>
      </div>

      <ProductCreateForm categories={categories} brands={brands} />
    </div>
  );
}
