'use server';

import { revalidatePath } from 'next/cache';
import type { ReviewStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import {
  MAX_BODY_LENGTH,
  MAX_TITLE_LENGTH,
  MIN_BODY_LENGTH,
  moderateReview,
  recomputeProductRating,
} from '@/lib/reviews';
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

/* -------------------------------------------------------------------- edit */

/*
  A MODERATION edit: fixing a typo, removing a phone number or a name, masking profanity.

  The headline, the message and the DISPLAYED date (`date`) can change. Rating and author are
  not editable — changing those is writing a review on the customer's behalf. `createdAt`, the
  true submission timestamp, is never touched, so a moved date can always be told apart from
  when the review actually arrived.

  The displayed date is bounded on both sides: not in the future, and not before the product's
  own `createdAt` — a review cannot predate the listing it is about. Within that window a change
  is still recorded: the owner has said the team will not backdate reviews, and the record is
  what makes that checkable.

  The originals are copied into originalTitle/originalBody/originalDate on the FIRST change to
  each and never overwritten afterwards, so however many times a moderator touches it, what was
  first published survives. editedAt/editedBy record who is answerable for the current version,
  and the storefront says the review was edited.

  Status, the rating and reviewCount are untouched: the stars are unchanged, so the aggregate is.
*/
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

export async function editReviewAction(id: string, form: FormData): Promise<ActionResult> {
  const who = await admin();
  if (!who) return fail('Your session has expired. Sign in again.');

  const title = String(form.get('title') ?? '').trim();
  const body = String(form.get('body') ?? '').trim();
  const day = String(form.get('date') ?? '').trim();

  /* The same limits a submission is held to (lib/reviews), so an edit cannot produce a review
     the form would have refused. */
  if (!title) return fail('The headline cannot be empty.');
  if (title.length > MAX_TITLE_LENGTH) {
    return fail(`The headline must be ${MAX_TITLE_LENGTH} characters or fewer.`);
  }
  if (body.length < MIN_BODY_LENGTH) {
    return fail(`The message must be at least ${MIN_BODY_LENGTH} characters.`);
  }
  if (body.length > MAX_BODY_LENGTH) {
    return fail(`The message must be ${MAX_BODY_LENGTH} characters or fewer.`);
  }

  /* `date` is a Postgres DATE, so compare whole UTC days as YYYY-MM-DD strings. */
  if (!ISO_DAY.test(day) || Number.isNaN(Date.parse(`${day}T00:00:00Z`))) {
    return fail('Enter the review date as a full date.');
  }
  const existing = await prisma.review.findUnique({
    where: { id },
    select: {
      productId: true,
      title: true,
      body: true,
      date: true,
      originalTitle: true,
      originalBody: true,
      originalDate: true,
      product: { select: { createdAt: true } },
    },
  });
  if (!existing) return fail('That review no longer exists.');

  const currentDay = existing.date.toISOString().slice(0, 10);
  const textChanged = existing.title !== title || existing.body !== body;
  const dateChanged = currentDay !== day;

  /*
    The bounds apply to a NEW date only. A review already dated before its product's createdAt
    (rows carried over from the old database, where the product row is newer than the review)
    must still be fixable for a typo without being forced onto a different date.
  */
  if (dateChanged) {
    const today = new Date().toISOString().slice(0, 10);
    if (day > today) return fail('The review date cannot be in the future.');

    const listedOn = existing.product.createdAt.toISOString().slice(0, 10);
    if (day < listedOn) {
      return fail(
        `The review date cannot be earlier than ${listedOn}, when this product was listed.`
      );
    }
  }

  /* Saving unchanged fields is not an edit, and must not stamp "Edited" on the storefront. */
  if (!textChanged && !dateChanged) return { ok: true };

  await prisma.review.update({
    where: { id },
    data: {
      title,
      body,
      date: new Date(`${day}T00:00:00Z`),
      /* Each original is captured the first time THAT field changes, and never again. */
      ...(textChanged &&
        existing.originalTitle === null &&
        existing.originalBody === null && {
          originalTitle: existing.title,
          originalBody: existing.body,
        }),
      ...(dateChanged && existing.originalDate === null && { originalDate: existing.date }),
      editedAt: new Date(),
      editedBy: who.email,
    },
  });

  refreshStorefront(await slugsFor([existing.productId]));
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
