import Link from 'next/link';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { expireDiscountsPastEnd } from '@/lib/discounts';
import { WpSubsubsub } from '@/components/admin/wp-ui';
import { WpScreenMeta } from '@/components/admin/wp-notice';
import { DiscountsTable, type DiscountRow } from '@/components/admin/discounts-table';

/*
  Discount codes.

  The tabs are the questions somebody actually opens this screen with: what is live, what have I
  paused, what has run out, and what is queued up for later. "Scheduled" overlaps with "Active"
  on purpose — a code can be switched on and not yet open, and that state is easy to miss and
  expensive to miss, because it looks live everywhere else.
*/

export const dynamic = 'force-dynamic';

type Params = { q?: string; filter?: string };

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'paused', label: 'Paused' },
  { key: 'expired', label: 'Expired' },
  { key: 'scheduled', label: 'Scheduled' },
] as const;

function filterWhere(filter: string, now: Date): Prisma.DiscountWhereInput {
  switch (filter) {
    case 'active':
      return { status: 'ACTIVE' };
    case 'paused':
      return { status: 'PAUSED' };
    case 'expired':
      return { status: 'EXPIRED' };
    case 'scheduled':
      /* Not yet open. A paused code with a future start is still queued, so status is only
         used to exclude the ones that are already finished. */
      return { status: { not: 'EXPIRED' }, startsAt: { gt: now } };
    default:
      return {};
  }
}

export default async function AdminDiscountsPage({ searchParams }: { searchParams: Params }) {
  await requireAdmin();

  /*
    Housekeeping, not enforcement.

    `evaluateDiscount` checks the clock itself, so a code past its end date is already refused
    whatever this column says. Flipping the row here only stops the list claiming ACTIVE for
    something that is over — which is worth doing precisely because a list that lies about
    state is how somebody concludes the code must be broken. Failure is ignored for the same
    reason: this is cosmetic, and it must never be the thing that stops the screen loading.
  */
  await expireDiscountsPastEnd().catch(() => {});

  const activeTab = searchParams.filter ?? 'all';
  const q = searchParams.q?.trim();
  const now = new Date();

  const where: Prisma.DiscountWhereInput = { ...filterWhere(activeTab, now) };
  if (q) {
    where.OR = [
      { code: { contains: q, mode: 'insensitive' } },
      { description: { contains: q, mode: 'insensitive' } },
    ];
  }

  const [rows, counts] = await Promise.all([
    prisma.discount.findMany({
      where,
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      take: 300,
    }),
    Promise.all(TABS.map((t) => prisma.discount.count({ where: filterWhere(t.key, now) }))),
  ]);

  const data: DiscountRow[] = rows.map((d) => ({
    id: d.id,
    code: d.code,
    description: d.description,
    type: d.type,
    value: d.value.toString(),
    status: d.status,
    usageCount: d.usageCount,
    usageLimit: d.usageLimit,
    startsAt: d.startsAt?.toISOString() ?? null,
    endsAt: d.endsAt?.toISOString() ?? null,
  }));

  const href = (patch: Partial<Params>) => {
    const next = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...searchParams, ...patch })) {
      if (v && v !== 'all') next.set(k, String(v));
    }
    const qs = next.toString();
    return qs ? `/admin/discounts?${qs}` : '/admin/discounts';
  };

  return (
    <>
      <WpScreenMeta
        help={
          <div>
            <p className="mt-0">
              <strong>The window beats the status.</strong> A code whose end date has passed is
              refused even if it still reads Active — the check is against the clock, not against
              this column, so a code cannot stay live because a background sweep has not run.
            </p>
            <p>
              <strong>A shopper is never told which codes exist.</strong> An unknown code and an
              expired one give the same answer at the storefront. Telling them apart would let
              anyone sit on the form and enumerate every code ever issued, which is how a private
              code reaches a voucher site the same afternoon. This screen shows you the real
              reason; the shopper gets one sentence.
            </p>
            <p className="mb-0">
              <strong>Deleting a code keeps the orders.</strong> Each order snapshots the code and
              the amount it was given, so what a customer actually paid survives the code being
              tidied up. What goes with it is the redemption history.
            </p>
          </div>
        }
      />

      <h1 className="wp-heading-inline">Discounts</h1>
      <Link href="/admin/discounts/new" className="wp-page-title-action">
        Add New
      </Link>

      <hr className="my-2 border-0 border-t border-[#c3c4c7]" />

      <WpSubsubsub
        items={TABS.map((t, i) => ({
          href: href({ filter: t.key }),
          label: t.label,
          count: counts[i],
          current: activeTab === t.key,
        }))}
      />

      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <p className="wp-subtitle m-0">
          Showing {data.length}
          {data.length === 300 && ' (capped)'} — newest first.
        </p>

        <form method="get" action="/admin/discounts" className="flex items-center gap-2">
          {activeTab !== 'all' && <input type="hidden" name="filter" value={activeTab} />}
          <label className="wp-screen-reader-text" htmlFor="discount-search">
            Search discount codes
          </label>
          <input
            id="discount-search"
            name="q"
            defaultValue={searchParams.q ?? ''}
            placeholder="Code or description"
            className="wp-input wp-input-search"
          />
          <button type="submit" className="wp-button">
            Search
          </button>
          {(q || activeTab !== 'all') && (
            <Link href="/admin/discounts" className="wp-button">
              Clear
            </Link>
          )}
        </form>
      </div>

      <DiscountsTable rows={data} />
    </>
  );
}
