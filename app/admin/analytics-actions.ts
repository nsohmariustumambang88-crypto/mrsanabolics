'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { asNumber, getSettingsSafe } from '@/lib/settings';
import { normaliseTerm } from '@/lib/analytics/track';

/*
  Analytics mutations.

  Every export calls requireAdmin() first. A server action is a public HTTP endpoint with a
  generated URL — being unreachable from the UI is not access control, and middleware only
  covers page routes.

  Everything here deletes. That is the whole surface, and it is on purpose: analytics rows are
  observations, not records anyone edits. There is no "correct this view" or "merge these two
  visitors", because a traffic report you can retouch answers nothing you would ask a traffic
  report. What staff genuinely need is the ability to throw data away — for retention, and for
  a person who asks to be forgotten.
*/

export type ActionResult = { ok: true } | { ok: false; error: string };
export type PurgeResult = { ok: true; deleted: number; days: number } | { ok: false; error: string };

const EXPIRED = 'Your session has expired. Sign in again.';

async function signedIn(): Promise<boolean> {
  try {
    await requireAdmin();
    return true;
  } catch {
    return false;
  }
}

function refresh() {
  revalidatePath('/admin/analytics');
  revalidatePath('/admin/search');
}

/**
 * Delete page views older than the `analytics_retention_days` setting.
 *
 * Retention is read from the setting rather than taken as an argument, so the number on the
 * Privacy settings screen is the number that is actually enforced. A button that could purge
 * to an arbitrary depth would make that setting decorative, and a stated retention period you
 * do not keep to is worse than not stating one.
 *
 * Only PageView rows go. The Visitor row survives with its running `viewCount`, so the totals
 * stay honest after a purge — the detail is gone, the fact that somebody visited is not. To
 * remove a person entirely, delete the visitor: that cascades their views.
 */
export async function purgeOldPageViews(): Promise<PurgeResult> {
  if (!(await signedIn())) return { ok: false, error: EXPIRED };

  const settings = await getSettingsSafe();
  const days = asNumber(settings.analytics_retention_days, 90);

  if (!Number.isFinite(days) || days < 1) {
    return {
      ok: false,
      error: 'Set a retention period of at least one day on the Settings screen first.',
    };
  }

  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  try {
    const { count } = await prisma.pageView.deleteMany({
      where: { occurredAt: { lt: cutoff } },
    });
    refresh();
    return { ok: true, deleted: count, days };
  } catch {
    return { ok: false, error: 'The page views could not be deleted. Nothing was removed.' };
  }
}

/**
 * Forget one visitor.
 *
 * Their page views cascade. Their searches do not — `SearchQuery.visitorId` is `SetNull`, so
 * the term survives unlinked. That is the right split: "somebody searched for X and found
 * nothing" is a fact about the catalogue, and it stops being about a person the moment the
 * link is cut.
 */
export async function deleteVisitor(id: string): Promise<ActionResult> {
  if (!(await signedIn())) return { ok: false, error: EXPIRED };
  if (!id) return { ok: false, error: 'No visitor was given.' };

  try {
    await prisma.visitor.delete({ where: { id } });
    refresh();
    return { ok: true };
  } catch {
    return { ok: false, error: 'That visitor could not be deleted — it may already be gone.' };
  }
}

/** The bulk form of the same thing, for the list table's Apply control. One round trip. */
export async function deleteVisitors(ids: string[]): Promise<ActionResult> {
  if (!(await signedIn())) return { ok: false, error: EXPIRED };
  if (!ids.length) return { ok: false, error: 'Select at least one visitor.' };

  try {
    await prisma.visitor.deleteMany({ where: { id: { in: ids } } });
    refresh();
    return { ok: true };
  } catch {
    return { ok: false, error: 'Those visitors could not be deleted. Nothing was removed.' };
  }
}

/**
 * Remove every search recorded under one normalised term.
 *
 * Normalised rather than as-typed, because the screen groups by the normalised form: clearing
 * "Test Peptide" while "test peptide" stayed behind would leave a row the person just told the
 * interface to remove.
 */
export async function clearSearchTerm(normalized: string): Promise<ActionResult> {
  if (!(await signedIn())) return { ok: false, error: EXPIRED };

  const key = normaliseTerm(normalized ?? '');
  if (!key) return { ok: false, error: 'No search term was given.' };

  try {
    await prisma.searchQuery.deleteMany({ where: { normalized: key } });
    refresh();
    return { ok: true };
  } catch {
    return { ok: false, error: 'That term could not be cleared. Nothing was removed.' };
  }
}
