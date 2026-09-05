'use server';

import { revalidatePath } from 'next/cache';
import type { ReviewStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { moderateReview, recomputeProductRating } from '@/lib/reviews';
import { invalidateCatalogue } from '@/lib/db/catalogue';

/*
  Review moderation.

  Every action calls requireAdmin() first: a server action is a public HTTP endpoint with a
  generated URL, so being unreachable from the UI is not access control and middleware does not
  cover it.

  Every action that changes what is published also has to do three things afterwards, and all
  three are needed for the change to be visible:

    1. recompute the product's stored rating — done inside lib/reviews;
    2. invalidateCatalogue(), because catalogue reads are memoised per process for 60s and the
       storefront would otherwise serve the old list from memory without touching Postgres;
    3. revalidatePath on the product page and /shop, so the prerendered HTML is rebuilt.

  Skipping (2) is the subtle one: the ISR cache is dropped, the page re-renders, and it renders
  from the same stale memo — which looks exactly like a revalidation that did not work.
*/

export type ActionResult = { ok: true } | { ok: false; error: string };

function fail(error: string): ActionResult {
  return { ok: false, error };
}

async function admin(): Promise<{ email: string } | null> {
  try {
    const session = await requireAdmin();
    return { email: session.email };
  } catch {
    return null;
  }
}

const STATUSES: ReviewStatus[] = ['PENDING', 'APPROVED', 'REJECTED'];

/** Drop the memo, then rebuild the pages a review can appear on. */
function refreshStorefront(slugs: string[]) {
  invalidateCatalogue();
  for (const slug of slugs) revalidatePath(`/product/${slug}`);
  revalidatePath('/shop');
  revalidatePath('/admin/reviews');
  revalidatePath('/admin');
}

async function slugsFor(productIds: string[]): Promise<string[]> {
  if (productIds.length === 0) return [];
  const rows = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { slug: true },
  });
  return rows.map((r) => r.slug);
}

/* ---------------------------------------------------------------- moderate */

export async function moderateReviewAction(
  id: string,
  status: ReviewStatus
): Promise<ActionResult> {
  const who = await admin();
  if (!who) return fail('Your session has expired. Sign in again.');

  if (!STATUSES.includes(status)) return fail('Unknown review status.');

  const result = await moderateReview(id, status, who.email);
  if (!result.ok) return fail(result.error);

  refreshStorefront(await slugsFor([result.productId]));
  return { ok: true };
}

/* ------------------------------------------------------------------ delete */

/*
  Deleting is for spam and abuse, not for queue hygiene — REJECTED is what "we read it and said
  no" looks like, and it keeps the record that somebody submitted it. Both leave the review
  invisible on the storefront, so the difference is only in what the moderator can still see.
*/
export async function deleteReviewAction(id: string): Promise<ActionResult> {
  const who = await admin();
  if (!who) return fail('Your session has expired. Sign in again.');

  const existing = await prisma.review.findUnique({
    where: { id },
    select: { productId: true },
  });
  if (!existing) return fail('That review no longer exists.');

  await prisma.review.delete({ where: { id } });
  /* An approved row just left the set the average is drawn from. */
  await recomputeProductRating(existing.productId);

  refreshStorefront(await slugsFor([existing.productId]));
  return { ok: true };
}

/* -------------------------------------------------------------------- bulk */

export type ReviewBulkAction = 'approve' | 'reject' | 'delete';

export async function bulkReviewAction(
  ids: string[],
  action: ReviewBulkAction
): Promise<ActionResult> {
  const who = await admin();
  if (!who) return fail('Your session has expired. Sign in again.');

  if (ids.length === 0) return fail('Select at least one review.');
  /* A guard against a malformed client, not a policy — the UI cannot select more than it shows. */
  if (ids.length > 500) return fail('That is more reviews than one action should touch.');

  const rows = await prisma.review.findMany({
    where: { id: { in: ids } },
    select: { id: true, productId: true },
  });
  if (rows.length === 0) return fail('Those reviews no longer exist.');

  const productIds = Array.from(new Set(rows.map((r) => r.productId)));
  const targetIds = rows.map((r) => r.id);

  if (action === 'delete') {
    await prisma.review.deleteMany({ where: { id: { in: targetIds } } });
  } else {
    const status: ReviewStatus = action === 'approve' ? 'APPROVED' : 'REJECTED';
    await prisma.review.updateMany({
      where: { id: { in: targetIds } },
      data: { status, moderatedAt: new Date(), moderatedBy: who.email },
    });
  }

  /*
    One recompute per affected product, not one per review: the aggregate is a property of the
    product, so recomputing it twenty times for twenty rows on the same product is nineteen
    identical round trips.
  */
  for (const productId of productIds) await recomputeProductRating(productId);

  refreshStorefront(await slugsFor(productIds));
  return { ok: true };
}
