import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { WpScreenMeta } from '@/components/admin/wp-notice';
import { DiscountForm, type CategoryOption } from '@/components/admin/discount-form';

export const dynamic = 'force-dynamic';

export default async function AdminNewDiscountPage() {
  await requireAdmin();

  /* categoryId is a real column on Discount, so the form offers real rows rather than free text. */
  const categories: CategoryOption[] = await prisma.category.findMany({
    orderBy: { position: 'asc' },
    select: { id: true, name: true },
  });

  return (
    <>
      <WpScreenMeta
        help={
          <div>
            <p className="mt-0">
              <strong>A percentage can never take more than the basket.</strong> Values over 100%
              are refused here, and the calculation caps at the subtotal besides — a discount is
              money off, never money back.
            </p>
            <p className="mb-0">
              <strong>Windows are entered in UTC,</strong> stated on the fields. A wall-clock time
              in whichever timezone the browser or the host happened to be in is how a sale opens
              at the wrong hour.
            </p>
          </div>
        }
      />

      <h1 className="wp-heading-inline">Add Discount</h1>
      <Link href="/admin/discounts" className="wp-page-title-action">
        Back to discounts
      </Link>

      <hr className="my-2 border-0 border-t border-[#c3c4c7]" />

      <DiscountForm categories={categories} />
    </>
  );
}
