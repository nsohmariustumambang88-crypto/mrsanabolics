import 'server-only';

import { Prisma, type EmailKind } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { SITE } from '@/lib/site';
import { UNSUBSCRIBE_PLACEHOLDER, withPostalAddress } from '@/lib/automation/templates';

/*
  The one door every automated email goes through.

  What it guarantees, in the order it checks:

  1. MARKETING needs a postal address in the settings (CAN-SPAM), and is refused while it is empty.
  2. MARKETING re-checks consent at the moment of sending: the address must have a SUBSCRIBED row
     now, whatever was true when the job picked it. Its own unsubscribe token goes into the link
     and into List-Unsubscribe, with List-Unsubscribe-Post for one-click (RFC 8058); the one-click
     POST lands on /api/unsubscribe.
  3. MARKETING: at most one email per person per 24 hours, across every job.
  4. One row per person per message: the EmailLog row (unique `key`) is written BEFORE the send,
     so a retry, a second run or a duplicate cron delivery finds it and sends nothing. Resend also
     gets the key as its Idempotency-Key. Only a FAILED row may be tried again, at most 3 times.
  5. Resend's answer is checked: a refusal is recorded FAILED, never as sent.

  Mail goes through Resend's REST API with fetch, from orders@ with replies to support@.
*/

const FROM = 'MrsAnabolics <orders@mrsanabolics.com>';
const REPLY_TO = 'support@mrsanabolics.com';
const MAX_ATTEMPTS = 3;
const DAY_MS = 86_400_000;

export type SendRequest = {
  /** Unique per person per message: unpaid:<orderId>:1, welcome:<subscriberId>:2, … */
  key: string;
  job: string;
  kind: EmailKind;
  to: string;
  subject: string;
  /** With UNSUBSCRIBE_PLACEHOLDER where the unsubscribe link goes (marketing). */
  html: string;
  contactId?: string | null;
  subscriberId?: string | null;
  orderId?: string | null;
  runId?: string | null;
  /** Count it as it would go, write nothing, send nothing. */
  dryRun?: boolean;
  /** The postal address setting, read once per run by the caller. */
  postalAddress: string;
};

export type SendOutcome =
  | { status: 'sent'; resendId: string | null; html: string }
  | { status: 'dry-run' }
  | { status: 'skipped'; reason: string }
  | { status: 'failed'; reason: string };

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

export async function sendAutomatedEmail(req: SendRequest): Promise<SendOutcome> {
  const to = req.to.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return { status: 'skipped', reason: 'no valid address' };

  let unsubscribeToken: string | null = null;
  if (req.kind === 'MARKETING') {
    const subscriber = await prisma.subscriber.findFirst({
      where: { email: { equals: to, mode: 'insensitive' }, status: 'SUBSCRIBED' },
      select: { unsubscribeToken: true },
    });
    if (!subscriber?.unsubscribeToken) return { status: 'skipped', reason: 'not subscribed' };
    unsubscribeToken = subscriber.unsubscribeToken;

    const today = await prisma.emailLog.count({
      where: {
        toEmail: { equals: to, mode: 'insensitive' },
        kind: 'MARKETING',
        status: { in: ['SENT', 'PENDING'] },
        createdAt: { gte: new Date(Date.now() - DAY_MS) },
        NOT: { key: req.key },
      },
    });
    if (today > 0) return { status: 'skipped', reason: 'already had a marketing email today' };
  }

  const existing = await prisma.emailLog.findUnique({
    where: { key: req.key },
    select: { status: true, attempts: true },
  });
  if (existing && existing.status !== 'FAILED') return { status: 'skipped', reason: 'already sent' };
  if (existing && existing.attempts >= MAX_ATTEMPTS) return { status: 'skipped', reason: 'failed 3 times; not retried' };

  /* Checked last, so a dry run still shows who would otherwise get it. */
  if (req.kind === 'MARKETING' && !req.postalAddress.trim()) {
    return { status: 'skipped', reason: req.dryRun ? 'postal address missing (would otherwise send)' : 'postal address missing' };
  }

  if (req.dryRun) return { status: 'dry-run' };

  /* Claim the key before sending. */
  try {
    if (existing) {
      const claimed = await prisma.emailLog.updateMany({
        where: { key: req.key, status: 'FAILED', attempts: { lt: MAX_ATTEMPTS } },
        data: { status: 'PENDING', attempts: { increment: 1 }, error: null, runId: req.runId ?? null },
      });
      if (claimed.count === 0) return { status: 'skipped', reason: 'already sent' };
    } else {
      await prisma.emailLog.create({
        data: {
          key: req.key,
          job: req.job,
          kind: req.kind,
          toEmail: to,
          subject: req.subject,
          contactId: req.contactId ?? null,
          subscriberId: req.subscriberId ?? null,
          orderId: req.orderId ?? null,
          runId: req.runId ?? null,
        },
      });
    }
  } catch (error) {
    if (isUniqueViolation(error)) return { status: 'skipped', reason: 'already sent' };
    throw error;
  }

  /* The pieces only the sender adds: the recipient's own unsubscribe link and the postal address. */
  const headers: Record<string, string> = {};
  let html = req.html;
  if (req.kind === 'MARKETING' && unsubscribeToken) {
    const pageUrl = `${SITE.url}/unsubscribe?token=${encodeURIComponent(unsubscribeToken)}`;
    const oneClick = `${SITE.url}/api/unsubscribe?token=${encodeURIComponent(unsubscribeToken)}`;
    html = html.split(UNSUBSCRIBE_PLACEHOLDER).join(pageUrl);
    html = withPostalAddress(html, req.postalAddress);
    headers['List-Unsubscribe'] = `<${oneClick}>, <mailto:${REPLY_TO}?subject=unsubscribe>`;
    headers['List-Unsubscribe-Post'] = 'List-Unsubscribe=One-Click';
  }

  const result = await postToResend({ to, subject: req.subject, html, headers, idempotencyKey: req.key });
  if (result.ok) {
    await prisma.emailLog.update({
      where: { key: req.key },
      data: { status: 'SENT', resendId: result.id, sentAt: new Date(), error: null },
    });
    return { status: 'sent', resendId: result.id, html };
  }
  await prisma.emailLog.update({ where: { key: req.key }, data: { status: 'FAILED', error: result.error.slice(0, 2000) } });
  return { status: 'failed', reason: result.error };
}

/** Record a message that will never be sent (an overdue welcome email), so no later run sends it. */
export async function markSkipped(req: {
  key: string;
  job: string;
  kind: EmailKind;
  to: string;
  subject: string;
  reason: string;
  subscriberId?: string | null;
  runId?: string | null;
}): Promise<void> {
  try {
    await prisma.emailLog.create({
      data: {
        key: req.key,
        job: req.job,
        kind: req.kind,
        toEmail: req.to,
        subject: req.subject,
        status: 'SKIPPED',
        error: req.reason,
        subscriberId: req.subscriberId ?? null,
        runId: req.runId ?? null,
      },
    });
  } catch (error) {
    if (!isUniqueViolation(error)) throw error;
  }
}

/**
 * A plain send that is not about a person: the owner's copy, a template test. Still logged
 * under a unique key, still checked for Resend's refusal.
 */
export async function sendPlain(req: {
  key: string;
  job: string;
  kind: EmailKind;
  to: string;
  subject: string;
  html: string;
  runId?: string | null;
}): Promise<SendOutcome> {
  try {
    await prisma.emailLog.create({
      data: { key: req.key, job: req.job, kind: req.kind, toEmail: req.to, subject: req.subject, runId: req.runId ?? null },
    });
  } catch (error) {
    if (isUniqueViolation(error)) return { status: 'skipped', reason: 'already sent' };
    throw error;
  }
  const result = await postToResend({ to: req.to, subject: req.subject, html: req.html, headers: {}, idempotencyKey: req.key });
  await prisma.emailLog.update({
    where: { key: req.key },
    data: result.ok
      ? { status: 'SENT', resendId: result.id, sentAt: new Date() }
      : { status: 'FAILED', error: result.error.slice(0, 2000) },
  });
  return result.ok ? { status: 'sent', resendId: result.id, html: req.html } : { status: 'failed', reason: result.error };
}

async function postToResend(input: {
  to: string;
  subject: string;
  html: string;
  headers: Record<string, string>;
  idempotencyKey: string;
}): Promise<{ ok: true; id: string | null } | { ok: false; error: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { ok: false, error: 'RESEND_API_KEY is not set.' };
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        /* Resend keeps an idempotency key for 24 hours; 256 characters at most. */
        'Idempotency-Key': input.idempotencyKey.slice(0, 256),
      },
      body: JSON.stringify({
        from: FROM,
        to: [input.to],
        reply_to: REPLY_TO,
        subject: input.subject,
        html: input.html,
        ...(Object.keys(input.headers).length ? { headers: input.headers } : {}),
      }),
      signal: AbortSignal.timeout(20_000),
    });
    const body = (await response.json().catch(() => ({}))) as { id?: string; message?: string; name?: string };
    if (!response.ok) return { ok: false, error: `Resend ${response.status}: ${body.message ?? body.name ?? 'refused'}` };
    return { ok: true, id: body.id ?? null };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Resend could not be reached.' };
  }
}

/** Resend's view of one email: its last event (delivered, bounced, suppressed, …). */
export async function resendStatus(id: string): Promise<string> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return 'unknown (no API key)';
  const response = await fetch(`https://api.resend.com/emails/${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
    signal: AbortSignal.timeout(15_000),
  });
  const body = (await response.json().catch(() => ({}))) as { last_event?: string };
  return body.last_event ?? `unknown (${response.status})`;
}
