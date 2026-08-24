import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { updateBrand } from '@/app/admin/actions';
import { InlineEditor } from '@/components/admin/inline-editor';

export const dynamic = 'force-dynamic';

export default async function AdminBrandsPage() {
  await requireAdmin();

  const brands = await prisma.brand.findMany({
    orderBy: { position: 'asc' },
    include: { _count: { select: { products: true } } },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="wp-heading-inline">
          Manufacturers
        </h1>
        <p className="max-w-[46rem] mt-2 text-sm wp-muted">
          The name on the vial is the name accountable for the assay. Deleting one is blocked
          while it still has products, which is why there is no delete here.
        </p>
      </div>

      <div className="border-t border-[#dcdcde]">
        {brands.map((brand) => (
          <InlineEditor
            key={brand.id}
            title={brand.name}
            subtitle={brand.description}
            meta={`${brand._count.products} listed`}
            action={updateBrand.bind(null, brand.id)}
            fields={[
              { name: 'name', label: 'Name', value: brand.name, required: true },
              {
                name: 'description',
                label: 'Description',
                value: brand.description,
                type: 'textarea',
                rows: 3,
                required: true,
              },
              {
                name: 'productCount',
                label: 'Headline count',
                value: String(brand.productCount),
                type: 'number',
                hint: `Marketing figure. ${brand._count.products} are actually listed.`,
              },
            ]}
          />
        ))}
      </div>
    </div>
  );
}
