import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft, ExternalLink } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { ProductForm } from '@/components/admin/product-form';
import { ImageUpload } from '@/components/admin/image-upload';

export const dynamic = 'force-dynamic';

export default async function EditProductPage({
  params,
}: {
  params: { id: string };
}) {
  await requireAdmin();

  const product = await prisma.product.findUnique({
    where: { id: params.id },
    include: {
      category: true,
      brand: true,
      specifications: { orderBy: { position: 'asc' } },
    },
  });

  if (!product) notFound();

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

        <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="wp-heading-inline">
              {product.name}
            </h1>
            <p className="mt-2 text-[11px] uppercase wp-muted">
              {product.category.name} · {product.brand.name} · {product.slug}
            </p>
          </div>

          <Link
            href={`/product/${product.slug}`}
            target="_blank"
            className="inline-flex items-center gap-1.5 text-sm text-[#2271b1] underline underline-offset-4"
          >
            View on site
            <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.75} />
          </Link>
        </div>
      </div>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_18rem] lg:gap-12">
        <ProductForm
          product={{
            id: product.id,
            name: product.name,
            price: product.price.toString(),
            compareAtPrice: product.compareAtPrice?.toString() ?? '',
            description: product.description,
            longDescription: product.longDescription,
            directions: product.directions,
            shipping: product.shipping,
            returns: product.returns,
            stockCount: product.stockCount,
            inStock: product.inStock,
            isNew: product.isNew,
            isBestSeller: product.isBestSeller,
            isTrending: product.isTrending,
            isDeal: product.isDeal,
          }}
        />

        <aside className="space-y-8 lg:border-l lg:border-[#dcdcde] lg:pl-8">
          <section>
            <h2 className="wp-postbox-title mb-2">Image</h2>
            <div className="mt-4">
              <ImageUpload
                productId={product.id}
                slug={product.slug}
                current={product.images[0]}
              />
            </div>
          </section>

          <section>
            <h2 className="wp-postbox-title mb-2">
              Specification
            </h2>
            <p className="mt-2 text-xs wp-muted">
              Read-only here. These rows drive the protocol chain on the product page.
            </p>
            <dl className="mt-4 border-t border-[#dcdcde]">
              {product.specifications.map((spec) => (
                <div
                  key={spec.id}
                  className="flex items-baseline justify-between gap-4 border-b border-[#dcdcde] py-2.5"
                >
                  <dt className="text-[11px] uppercase wp-muted">
                    {spec.label}
                  </dt>
                  <dd className="text-right text-sm wp-num">{spec.value}</dd>
                </div>
              ))}
            </dl>
          </section>
        </aside>
      </div>
    </div>
  );
}
