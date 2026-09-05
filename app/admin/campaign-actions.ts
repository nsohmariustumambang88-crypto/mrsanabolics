'use server';

import { revalidatePath } from 'next/cache';
import type { CampaignStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { countSegment, isSegmentKey, readinessProblems } from '@/lib/campaigns';

/*
  Campaign mutations.

  THERE IS NO SEND ACTION IN THIS FILE, and there is not going to be one. This build has no
  sending infrastructure, so an action called `send` could only ever mark a row and lie about
  it — and the person who clicked it would go away believing several thousand people had
  received something. `recordCampaignSent` is the honest shape: a person sent it, from a real
  platform, and says here that they did, naming the platform and stamping their own address
  against it. A SENT row is somebody's statement, never this system's.

  Like the rest of the admin, every action calls requireAdmin() first. A server action is a
  public HTTP endpoint with a generated URL; not linking to it is not access control.
*/

export type ActionResult = { ok: true } | { ok: false; error: string };
export type CreateCampaignResult = { ok: true; id: string } | { ok: false; error: string };

const EXPIRED = 'Your session has expired. Sign in again.';

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

function refresh(id?: string) {
  revalidatePath('/admin/campaigns');
  if (id) revalidatePath(`/admin/campaigns/${id}`);
}

function text(form: FormData, key: string): string {
  const raw = form.get(key);
  return typeof raw === 'string' ? raw.trim() : '';
}

const STATUS_LABEL: Record<CampaignStatus, string> = {
  DRAFT: 'Draft',
  READY: 'Ready',
  SENT: 'Sent',
  CANCELLED: 'Cancelled',
};

/* ------------------------------------------------------------------------- create */

export async function createCampaign(form: FormData): Promise<CreateCampaignResult> {
  const who = await admin();
  if (!who) return { ok: false, error: EXPIRED };

  const name = text(form, 'name');
  if (!name) return { ok: false, error: 'A campaign needs a name so you can find it again.' };
  if (name.length > 200) return { ok: false, error: 'That name is too long.' };

  const segment = text(form, 'segment') || 'subscribed';
  if (!isSegmentKey(segment)) return { ok: false, error: 'Unknown audience.' };

  const created = await prisma.campaign.create({
    data: {
      name,
      subject: text(form, 'subject'),
      body: text(form, 'body'),
      segment,
      /* Always DRAFT. Readiness is checked against what is saved, and nothing is saved yet. */
      status: 'DRAFT',
    },
    select: { id: true },
  });

  refresh(created.id);
  return { ok: true, id: created.id };
}

/* ------------------------------------------------------------------------- update */

/**
 * Edit a campaign's words and audience.
 *
 * A SENT campaign is refused. Its subject and body are the record of what was actually put in
 * front of several thousand people; rewriting them afterwards would leave the system asserting
 * that something was sent which nobody ever received. Cancel it and write a new one instead.
 */
export async function updateCampaign(id: string, form: FormData): Promise<ActionResult> {
  const who = await admin();
  if (!who) return fail(EXPIRED);

  const current = await prisma.campaign.findUnique({
    where: { id },
    select: { status: true },
  });
  if (!current) return fail('That campaign no longer exists.');
  if (current.status === 'SENT') {
    return fail('This was recorded as sent. What it said is now a record, so it cannot be edited.');
  }

  const name = text(form, 'name');
  if (!name) return fail('A campaign needs a name so you can find it again.');
  if (name.length > 200) return fail('That name is too long.');

  const segment = text(form, 'segment') || 'subscribed';
  if (!isSegmentKey(segment)) return fail('Unknown audience.');

  const subject = text(form, 'subject');
  const body = text(form, 'body');

  /*
    Editing a READY campaign drops it back to DRAFT. "Ready" is a statement about a specific
    subject, body and audience that passed the checks; changing any of them without rechecking
    would leave the badge standing for words nobody approved.
  */
  await prisma.campaign.update({
    where: { id },
    data: {
      name,
      subject,
      body,
      segment,
      ...(current.status === 'READY' ? { status: 'DRAFT' as const } : {}),
    },
  });

  refresh(id);
  return { ok: true };
}

/* ------------------------------------------------------------------------- status */

/**
 * Move a campaign between DRAFT, READY and CANCELLED.
 *
 * SENT is deliberately not reachable from here. Reaching it requires naming who sent it and
 * through what, which is what `recordCampaignSent` asks for — a status dropdown that could
 * select "Sent" would let somebody assert a send with no author and no platform behind it.
 */
export async function setCampaignStatus(
  id: string,
  status: CampaignStatus
): Promise<ActionResult> {
  const who = await admin();
  if (!who) return fail(EXPIRED);

  if (status === 'SENT') {
    return fail('Use “Record as sent” — a send has to name who sent it and through what.');
  }
  if (!STATUS_LABEL[status]) return fail('Unknown status.');

  const campaign = await prisma.campaign.findUnique({
    where: { id },
    select: { status: true, subject: true, body: true, segment: true },
  });
  if (!campaign) return fail('That campaign no longer exists.');
  if (campaign.status === 'SENT') {
    return fail('This was recorded as sent. That is a fact about the past and does not move.');
  }
  if (campaign.status === status) return { ok: true };

  if (status === 'READY') {
    /*
      Re-checked on the server, not trusted from the screen. The checklist the person saw was
      rendered from the state at page load, and the postal address may have been cleared on
      another tab since.
    */
    const problems = await readinessProblems(campaign);
    if (problems.length) {
      return fail(
        problems.length === 1
          ? `Not ready: ${problems[0].label}`
          : `Not ready — ${problems.length} things still block it. See the checklist.`
      );
    }
  }

  await prisma.campaign.update({ where: { id }, data: { status } });

  refresh(id);
  return { ok: true };
}

/* -------------------------------------------------------------------- record a send */

/**
 * Record that a person sent this, from somewhere else.
 *
 * `sentVia` is required and free text — "Mailchimp", "Brevo", "exported to Ben's client" — and
 * `sentBy` is taken from the session rather than typed, so it names whoever actually pressed
 * this rather than whoever they say did.
 *
 * `recipientCount` is snapshotted here because the list moves: three months from now the
 * segment will resolve to a different number of people, and "how many did this reach" is a
 * question about the day it went out.
 *
 * The stamp is written once. An already-SENT campaign is refused rather than re-stamped — the
 * same rule as `handledAt` on Enquiry and the milestone stamps on Order.
 */
export async function recordCampaignSent(id: string, sentVia: string): Promise<ActionResult> {
  const who = await admin();
  if (!who) return fail(EXPIRED);

  const via = sentVia.trim();
  if (!via) return fail('Name the platform it was sent through — that is the point of the record.');
  if (via.length > 120) return fail('That is longer than a platform name needs to be.');

  const campaign = await prisma.campaign.findUnique({
    where: { id },
    select: { status: true, segment: true },
  });
  if (!campaign) return fail('That campaign no longer exists.');
  if (campaign.status === 'SENT') {
    return fail('This is already recorded as sent. The stamp is written once.');
  }
  if (campaign.status === 'CANCELLED') {
    return fail('This campaign was cancelled. Reopen it as a draft first.');
  }

  /*
    Counted now rather than read from anything the browser posted. A recipient count that came
    from the client is a number the client chose.
  */
  const recipientCount = await countSegment(campaign.segment);

  await prisma.campaign.update({
    where: { id },
    data: {
      status: 'SENT',
      sentAt: new Date(),
      sentBy: who.email,
      sentVia: via,
      recipientCount,
    },
  });

  refresh(id);
  return { ok: true };
}

/* ------------------------------------------------------------------------- delete */

export async function deleteCampaign(id: string): Promise<ActionResult> {
  const who = await admin();
  if (!who) return fail(EXPIRED);

  const campaign = await prisma.campaign.findUnique({ where: { id }, select: { id: true } });
  if (!campaign) return fail('That campaign no longer exists.');

  await prisma.campaign.delete({ where: { id } });

  refresh();
  return { ok: true };
}
