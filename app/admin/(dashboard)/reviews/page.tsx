import Link from 'next/link';
import type { Prisma, ReviewStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { asBoolean, getSetting } from '@/lib/settings';
import { WpStaticNotice, WpSubsubsub } from '@/components/admin/wp-ui';
import { WpScreenMeta } from '@/components/admin/wp-notice';
import { ReviewsTable, type ReviewRow } from '@/components/admin/reviews-table';

/*
  The moderation queue, modelled on wp-admin's Comments screen.

  Pending is the landing tab, as it is in WordPress. A moderation screen that opens on "All"
  buries the only rows that need a decision under every row that already had one, and the queue
  silently grows while looking full of finished work.

  Nothing here is live until somebody approves it, and nothing here counts toward a product's
  star rating until then either — both figures are recomputed from APPROVED rows on every
  moderation (lib/reviews/index.ts), so the number above a product's reviews and the reviews
  under it cannot disagree.
*/

export const dynamic = 'force-dynamic';

type Params = { q?: string; filter?: string };

const TABS = [
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'all', label: 'All' },
] as const;

const STATUS_FOR: Record<string, ReviewStatus | undefined> = {
  pending: 'PENDING',
  approved: 'APPROVED',
  rejected: 'REJECTED',
};

function filterWhere(filter?: string): Prisma.ReviewWhereInput {
  const status = STATUS_FOR[filter ?? ''];
  return status ? { status } : {};
}

export default async function AdminReviewsPage({ searchParams }: { searchParams: Params }) {
  await requireAdmin();

  /* Defaults to the work, not to the archive. */
  const activeTab = searchParams.filter ?? 'pending';
  const q = searchParams.q?.trim();

  const where: Prisma.ReviewWhereInput = { ...filterWhere(activeTab) };
  if (q) {
    where.OR = [
      { author: { contains: q, mode: 'insensitive' } },
      { title: { contains: q, mode: 'insensitive' } },
      { body: { contains: q, mode: 'insensitive' } },
      { email: { contains: q, mode: 'insensitive' } },
      { product: { name: { contains: q, mode: 'insensitive' } } },
    ];
  }

  const [rows, counts, reviewsOpen] = await Promise.all([
    prisma.review.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: { product: { select: { id: true, name: true, slug: true } } },
    }),
    Promise.all(TABS.map((t) => prisma.review.count({ where: filterWhere(t.key) }))),
    getSetting('reviews_open'),
  ]);

  const data: ReviewRow[] = rows.map((r) => ({
    id: r.id,
    author: r.author,
    email: r.email,
    rating: r.rating,
    title: r.title,
    body: r.body,
    status: r.status,
    createdAt: r.createdAt.toISOString(),
    moderatedAt: r.moderatedAt?.toISOString() ?? null,
    moderatedBy: r.moderatedBy,
    productId: r.product.id,
    productName: r.product.name,
    productSlug: r.product.slug,
  }));

  const href = (patch: Partial<Params>) => {
    const next = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...searchParams, ...patch })) {
      if (v) next.set(k, String(v));
    }
    const qs = next.toString();
    return qs ? `/admin/reviews?${qs}` : '/admin/reviews';
  };

  return (
    <>
      <WpScreenMeta
        help={
          <div>
            <p className="mt-0">
              <strong>Nothing submitted here is published until you approve it.</strong>{' '}
              Unmoderated free text under a product is how a catalogue ends up hosting spam,
              abuse and medical claims nobody at this business made.
            </p>
            <p>
              <strong>The star rating counts approved reviews only.</strong> Approving or
              rejecting one restates the product&rsquo;s rating and review count immediately, so
              the figure above the reviews and the reviews under it always agree.
            </p>
            <p className="mb-0">
              <strong>Rejecting is usually right; deleting is for spam.</strong> A rejected review
              is off the storefront and out of the rating, and the record that somebody submitted
              it survives. Deleting cannot be undone.
            </p>
          </div>
        }
      />

      <h1 className="wp-heading-inline">Reviews</h1>

      <hr className="my-2 border-0 border-t border-[#c3c4c7]" />

      {!asBoolean(reviewsOpen) && (
        <WpStaticNotice tone="warning">
          New reviews are switched off, so the form is hidden on product pages and the route
          refuses submissions. Existing reviews are unaffected — change this under Settings →
          Commerce.
        </WpStaticNotice>
      )}

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
          Showing {rows.length}
          {rows.length === 200 && ' (capped)'} — newest first.
        </p>

        <form method="get" action="/admin/reviews" className="flex items-center gap-2">
          <input type="hidden" name="filter" value={activeTab} />
          <label className="wp-screen-reader-text" htmlFor="review-search">
            Search reviews
          </label>
          <input
            id="review-search"
            name="q"
            defaultValue={searchParams.q ?? ''}
            placeholder="Author, product or words"
            className="wp-input wp-input-search"
          />
          <button type="submit" className="wp-button">
            Search
          </button>
          {q && (
            <Link href={href({ q: undefined })} className="wp-button">
              Clear
            </Link>
          )}
        </form>
      </div>

      <ReviewsTable
        rows={data}
        emptyHint={
          activeTab === 'pending'
            ? 'No review is waiting on a decision.'
            : 'Reviews submitted from product pages arrive here.'
        }
      />
    </>
  );
}
