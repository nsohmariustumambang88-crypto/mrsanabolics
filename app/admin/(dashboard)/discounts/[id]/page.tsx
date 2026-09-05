import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { formatPrice } from '@/lib/format';
import { WpScreenMeta } from '@/components/admin/wp-notice';
import { WpStaticNotice } from '@/components/admin/wp-ui';
import { DiscountForm, type DiscountFormValues } from '@/components/admin/discount-form';

/*
  Editing one code, with its redemptions beside it.

  The redemption list is here rather than on its own screen because it is the answer to the only
  question anyone has while editing a code: has anybody used this, and for how much. Deciding
  whether to change a live code without that in front of you is guessing.

  It is read-only, and stays that way. `usageCount` is the count of these rows; a screen that
  could edit either would let somebody free up a limited-use code with nothing left to explain
  why it was freed.
*/

export const dynamic = 'force-dynamic';

const day = (iso: Date) => iso.toISOString().slice(0, 10);
const minute = (iso: Date) => iso.toISOString().slice(0, 16).replace('T', ' ');

export default async function AdminEditDiscountPage({ params }: { params: { id: string } }) {
  await requireAdmin();

  const [discount, categories] = await Promise.all([
    prisma.discount.findUnique({
      where: { id: params.id },
      include: {
        redemptions: { orderBy: { occurredAt: 'desc' }, take: 200 },
      },
    }),
    prisma.category.findMany({
      orderBy: { position: 'asc' },
      select: { id: true, name: true },
    }),
  ]);

  if (!discount) notFound();

  const values: DiscountFormValues = {
    id: discount.id,
    code: discount.code,
    description: discount.description ?? '',
    type: discount.type,
    value: discount.type === 'FREE_SHIPPING' ? '' : discount.value.toString(),
    status: discount.status,
    minSubtotal: discount.minSubtotal?.toString() ?? '',
    startsAt: discount.startsAt?.toISOString() ?? '',
    endsAt: discount.endsAt?.toISOString() ?? '',
    usageLimit: discount.usageLimit?.toString() ?? '',
    perContactLimit: discount.perContactLimit?.toString() ?? '',
    categoryId: discount.categoryId ?? '',
  };

  const closed = discount.endsAt !== null && discount.endsAt.getTime() <= Date.now();
  const notYetOpen = discount.startsAt !== null && discount.startsAt.getTime() > Date.now();
  const exhausted = discount.usageLimit !== null && discount.usageCount >= discount.usageLimit;

  const totalGiven = discount.redemptions.reduce((sum, r) => sum + Number(r.amount), 0);

  return (
    <>
      <WpScreenMeta
        help={
          <div>
            <p className="mt-0">
              <strong>Changing a code does not change past orders.</strong> Each order snapshots
              the code and the amount it was given, so editing the value here affects only what
              happens next.
            </p>
            <p className="mb-0">
              <strong>The uses count cannot be edited,</strong> deliberately. It is the number of
              redemption rows below; a figure you could type would stop being evidence of
              anything.
            </p>
          </div>
        }
      />

      <Link
        href="/admin/discounts"
        className="mb-1 flex w-fit items-center gap-1.5 text-[13px]"
      >
        <ChevronLeft className="h-4 w-4" strokeWidth={1.75} />
        All discounts
      </Link>

      <h1 className="wp-heading-inline wp-num">{discount.code}</h1>

      <hr className="my-2 border-0 border-t border-[#c3c4c7]" />

      {/* The states that make a code look live while refusing everybody. */}
      {closed && (
        <WpStaticNotice tone="warning">
          <strong>This code&rsquo;s window closed on {day(discount.endsAt!)}.</strong> It is
          refused at the till whatever its status says. Change the end date to run it again.
        </WpStaticNotice>
      )}
      {!closed && notYetOpen && (
        <WpStaticNotice tone="info">
          <strong>Not open yet.</strong> This code starts on {minute(discount.startsAt!)} UTC and
          is refused until then.
        </WpStaticNotice>
      )}
      {!closed && exhausted && (
        <WpStaticNotice tone="warning">
          <strong>Fully claimed.</strong> All {discount.usageLimit} uses have been taken, so it is
          refused. Raise the limit to allow more.
        </WpStaticNotice>
      )}

      <div className="mt-4 grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-12">
        <DiscountForm categories={categories} discount={values} />

        <aside className="space-y-8 lg:border-l lg:border-[#dcdcde] lg:pl-8">
          <section>
            <h2 className="wp-postbox-title mb-2">Redemptions</h2>
            <p className="wp-help mt-0">
              {discount.usageCount === 0
                ? 'Never used.'
                : `Used ${discount.usageCount}${
                    discount.usageLimit === null ? '' : ` of ${discount.usageLimit}`
                  } — ${formatPrice(totalGiven)} given away.`}
            </p>

            {discount.redemptions.length > 0 && (
              <div className="mt-4 overflow-x-auto">
                <table className="wp-list-table">
                  <thead>
                    <tr>
                      <th scope="col">When</th>
                      <th scope="col">Order</th>
                      <th scope="col">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {discount.redemptions.map((r) => (
                      <tr key={r.id}>
                        <td className="wp-num text-[12px]">{minute(r.occurredAt)}</td>
                        <td className="wp-num text-[12px]">
                          {r.orderReference ? (
                            r.orderReference
                          ) : (
                            <span className="wp-muted">—</span>
                          )}
                        </td>
                        <td className="wp-num">{formatPrice(Number(r.amount))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/*
              A redemption references its order by the human reference rather than by a foreign
              key, so deleting an order does not silently hand back a use of a limited code. That
              is why an order can be gone and its line still here.
            */}
            <p className="wp-help mt-3">
              Orders are referenced by their code, not linked — deleting an order does not free up
              a use that genuinely happened.
            </p>
          </section>

          <section>
            <h2 className="wp-postbox-title mb-2">Record</h2>
            <dl className="mt-3 border-t border-[#dcdcde]">
              <div className="flex items-baseline justify-between gap-4 border-b border-[#dcdcde] py-2.5">
                <dt className="text-[11px] uppercase wp-muted">Created</dt>
                <dd className="wp-num text-sm">{day(discount.createdAt)}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-4 border-b border-[#dcdcde] py-2.5">
                <dt className="text-[11px] uppercase wp-muted">Last changed</dt>
                <dd className="wp-num text-sm">{day(discount.updatedAt)}</dd>
              </div>
            </dl>
          </section>
        </aside>
      </div>
    </>
  );
}
