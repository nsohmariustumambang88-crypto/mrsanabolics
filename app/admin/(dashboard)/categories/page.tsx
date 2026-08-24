import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { updateCategory } from '@/app/admin/actions';
import { InlineEditor } from '@/components/admin/inline-editor';
import { categoryPigment } from '@/lib/site';

export const dynamic = 'force-dynamic';

export default async function AdminCategoriesPage() {
  await requireAdmin();

  const categories = await prisma.category.findMany({
    orderBy: { position: 'asc' },
    include: { _count: { select: { products: true } } },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="wp-heading-inline">Categories</h1>
        <p className="max-w-[46rem] mt-2 text-sm wp-muted">
          Each category owns one pigment, used everywhere it appears. The slug and colour are
          fixed in the design system; name, description and the headline count are editable.
        </p>
      </div>

      <div className="border-t border-[#dcdcde]">
        {categories.map((category) => (
          <div key={category.id} className="relative">
            <span
              className="absolute left-0 top-6 h-2 w-2 rounded-full"
              style={{ backgroundColor: categoryPigment(category.slug) }}
              aria-hidden="true"
            />
            <div className="pl-6">
              <InlineEditor
                title={category.name}
                subtitle={category.description}
                meta={`${category._count.products} listed`}
                action={updateCategory.bind(null, category.id)}
                fields={[
                  { name: 'name', label: 'Name', value: category.name, required: true },
                  {
                    name: 'description',
                    label: 'Description',
                    value: category.description,
                    type: 'textarea',
                    rows: 3,
                    required: true,
                  },
                  {
                    name: 'productCount',
                    label: 'Headline count',
                    value: String(category.productCount),
                    type: 'number',
                    hint: `Marketing figure shown in copy. ${category._count.products} are actually listed.`,
                  },
                ]}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
