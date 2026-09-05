import 'server-only';

import type { Review, ReviewStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { asBoolean, getSetting } from '@/lib/settings';
import { looksLikeEmail, normaliseEmail } from '@/lib/marketing/consent';

/*
  Reviews: submission, moderation, and the arithmetic that keeps the star figure honest.

  The rule the whole file exists to hold: an unapproved review is never visible on the
  storefront, and the star rating never counts one. `Product.rating` and `Product.reviewCount`
  are derived here from APPROVED rows only, so the number above the reviews and the reviews
  themselves can never disagree — which is the failure a stored aggregate normally produces the
  first time somebody rejects a row and forgets to recount.

  What this file does NOT do, and must not be given a helper for: it never creates, revives or
  touches a Subscriber. Somebody writing about a vial they bought has told you nothing about
  wanting email, and the address captured here exists only so a moderator can recognise a
  repeat submitter. lib/crm/enquiries.ts keeps the same line for the same reason.

  No interactive transactions (see CLAUDE.md): every write below is a single statement or a
  batched prisma.$transaction([...]), because this database is Neon behind PgBouncer and
  prisma.$transaction(async tx => …) held a connection open across round trips until it timed
  out.
*/

export const MAX_AUTHOR_LENGTH = 80;
export const MAX_TITLE_LENGTH = 120;
export const MIN_BODY_LENGTH = 20;
export const MAX_BODY_LENGTH = 4000;

export type ReviewInput = {
  productId: string;
  author: string;
  /** Optional. Never published, never mailed — see the schema comment on Review.email. */
  email?: string | null;
  rating: number;
  title: string;
  body: string;
  /** Already hashed by the caller: the raw address never reaches this layer. */
  ipHash?: string | null;
};

export type ReviewResult = { ok: true } | { ok: false; error: string };

/* ------------------------------------------------------------------ submit */

/**
 * Store a review as PENDING.
 *
 * There is deliberately no status parameter. A public submission that could choose its own
 * status is not moderation, and the one caller that legitimately sets a status —
 * `moderateReview` — is behind an admin session.
 */
export async function submitReview(input: ReviewInput): Promise<ReviewResult> {
  /*
    The kill switch is checked here rather than only in the UI. Hiding the form leaves the
    route open, and a route that still accepts writes is not "reviews closed".
  */
  if (!asBoolean(await getSetting('reviews_open'))) {
    return { ok: false, error: 'Reviews are closed at the moment.' };
  }

  const author = input.author?.trim() ?? '';
  const title = input.title?.trim() ?? '';
  const body = input.body?.trim() ?? '';
  const email = input.email ? normaliseEmail(input.email) : '';
  const rating = Number(input.rating);

  if (!author || author.length > MAX_AUTHOR_LENGTH) {
    return { ok: false, error: 'Give a name to publish this under.' };
  }

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { ok: false, error: 'Pick a rating between one and five stars.' };
  }

  if (!title || title.length > MAX_TITLE_LENGTH) {
    return { ok: false, error: 'A short headline helps other people scan the reviews.' };
  }

  if (body.length < MIN_BODY_LENGTH) {
    return { ok: false, error: 'A little more detail makes this useful to somebody else.' };
  }

  if (body.length > MAX_BODY_LENGTH) {
    return { ok: false, error: 'That review is longer than this form accepts.' };
  }

  /* An address is optional, but a mistyped one is worth catching while they are still here. */
  if (email && !looksLikeEmail(email)) {
    return { ok: false, error: 'That address is missing an @ or a domain.' };
  }

  const product = await prisma.product.findUnique({
    where: { id: input.productId },
    select: { id: true },
  });
  if (!product) return { ok: false, error: 'That product no longer exists.' };

  await prisma.review.create({
    data: {
      productId: product.id,
      author,
      email: email || null,
      rating,
      title,
      body,
      /* `date` is the review's own date; `createdAt` is when the row was written. */
      date: new Date(),
      status: 'PENDING',
      ipHash: input.ipHash ?? null,
    },
  });

  /*
    Nothing is recomputed here on purpose. A PENDING row contributes nothing to the stored
    aggregate, so touching the product would only be a write that changes no value.
  */
  return { ok: true };
}

/* -------------------------------------------------------------- moderation */

/**
 * Approve or reject one review, then restate the product's rating from what is approved.
 *
 * The recompute is not optional and not deferred: the moment a row's status changes, the stored
 * aggregate is wrong, and every storefront read between now and a nightly job would show a star
 * figure counting a review nobody can see.
 */
export async function moderateReview(
  id: string,
  status: ReviewStatus,
  moderatorEmail: string
): Promise<{ ok: true; productId: string } | { ok: false; error: string }> {
  const existing = await prisma.review.findUnique({
    where: { id },
    select: { id: true, productId: true, status: true },
  });
  if (!existing) return { ok: false, error: 'That review no longer exists.' };

  if (existing.status !== status) {
    await prisma.review.update({
      where: { id },
      data: {
        status,
        /*
          Stamped on every decision rather than only the first. Unlike Enquiry.handledAt, this
          is not "how long somebody waited" — it is who is answerable for what is on the page
          right now, and that must be the person who last ruled on it.
        */
        moderatedAt: new Date(),
        moderatedBy: moderatorEmail,
      },
    });
  }

  await recomputeProductRating(existing.productId);
  return { ok: true, productId: existing.productId };
}

/**
 * Restate `Product.rating` and `Product.reviewCount` from APPROVED rows.
 *
 * Zero and zero when there are none — not "unrated", because the schema has no such value and
 * a leftover average from before the last rejection would be a figure with nothing behind it.
 */
export async function recomputeProductRating(
  productId: string
): Promise<{ rating: number; reviewCount: number }> {
  const summary = await prisma.review.aggregate({
    where: { productId, status: 'APPROVED' },
    _avg: { rating: true },
    _count: { _all: true },
  });

  const reviewCount = summary._count._all;
  const average = summary._avg.rating ?? 0;
  /* One decimal, to match how every surface prints it (`rating.toFixed(1)`). */
  const rating = reviewCount === 0 ? 0 : Math.round(average * 10) / 10;

  await prisma.product.update({
    where: { id: productId },
    data: { rating, reviewCount },
  });

  return { rating, reviewCount };
}

/** The only read that belongs under a product. Newest first, approved only. */
export async function approvedReviewsFor(productId: string): Promise<Review[]> {
  return prisma.review.findMany({
    where: { productId, status: 'APPROVED' },
    orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
  });
}
