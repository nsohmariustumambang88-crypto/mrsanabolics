import 'server-only';

import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { asBoolean, asNumber, getSettings, invalidateSettings } from '@/lib/settings';
import { DID_NOT_FINISH, STALE_AFTER_MS, jobDef, maskEmail, periodOf, type JobDef, type JobId } from '@/lib/automation/jobs';
import { asOwnerCopy, templateVersion } from '@/lib/automation/templates';
import { sendAutomatedEmail, sendPlain, type SendOutcome, type SendRequest } from '@/lib/automation/sender';

/*
  Running a job: the switches, the lock, the run log, the cap, the pacing and the owner's copy.

  A real run (cron or "Run now"):
    - stops if "Pause all automation" is ticked, if the job is switched off, if its template
      changed since the owner approved it, or (marketing) if there is no postal address;
    - takes the lock for its job and New York day, so a second delivery of the same cron, or a
      second click, does nothing;
    - sends at most `automation_max_per_run` emails, about two a second (Resend allows ten), and
      stops picking new work at a 40-second budget so a function (60 seconds at most) is never
      cut off mid-send: one send can take up to 10 more seconds before Resend's answer;
    - copies the first customer email of the run to the owner (`automation_copy_to`);
    - is written to the run log whatever happens. A failed run releases its lock.
  A dry run does all the choosing and none of the sending: no lock, no email, no log rows except
  the run itself, which records the counts.

  A run whose process died (killed, cut off at the time limit, lost its connection) stays RUNNING.
  Nothing waits on that status, but it would read as "still going" for ever, so every run first
  closes any run older than STALE_AFTER_MS as FAILED ("did not finish") and frees its lock. The
  weekly report and the admin screen count such a run as failed, never as having run.
*/

const PACE_MS = 550;
const TIME_BUDGET_MS = 40_000;
/** A lock lives as long as a run may stay RUNNING before it counts as dead (STALE_AFTER_MS). */
const LOCK_MINUTES = STALE_AFTER_MS / 60_000;

/**
 * Close runs left RUNNING by a process that died, free their locks, and drop locks for days long
 * past. Safe to call any time; one round trip when there is nothing to do.
 */
export async function closeStaleRuns(now = new Date()): Promise<number> {
  const stale = await prisma.automationRun.findMany({
    where: { status: 'RUNNING', startedAt: { lt: new Date(now.getTime() - STALE_AFTER_MS) } },
    select: { id: true },
  });
  if (stale.length) {
    const ids = stale.map((r) => r.id);
    await prisma.$transaction([
      prisma.automationRun.updateMany({
        where: { id: { in: ids }, status: 'RUNNING' },
        data: { status: 'FAILED', note: DID_NOT_FINISH, finishedAt: now },
      }),
      prisma.automationLock.deleteMany({ where: { runId: { in: ids } } }),
    ]);
  }
  await prisma.automationLock.deleteMany({ where: { expiresAt: { lt: new Date(now.getTime() - 7 * 86_400_000) } } });
  return stale.length;
}

export type JobContext = {
  runId: string;
  dryRun: boolean;
  now: Date;
  settings: Record<string, string>;
  postalAddress: string;
  /** Tests only: limit the run to these orders. Never set by the cron or the admin. */
  only?: { orderIds?: string[] };
  /** Count an outcome. */
  count: (outcome: string, by?: number) => void;
  /** False once the cap or the time budget is reached: stop picking more work. */
  canSend: () => boolean;
  /** Send through the shared sender, with pacing, the cap and the owner's copy. */
  send: (req: Omit<SendRequest, 'runId' | 'dryRun' | 'postalAddress'>) => Promise<SendOutcome>;
};

export type JobFn = (ctx: JobContext) => Promise<void>;

export type RunReport = {
  job: JobId;
  runId: string | null;
  status: 'OK' | 'PARTIAL' | 'FAILED' | 'SKIPPED';
  dryRun: boolean;
  counts: Record<string, number>;
  note: string | null;
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Why a real run of this job would not send right now, or null. Also used by the admin screen. */
export function blockedReason(def: JobDef, settings: Record<string, string>): string | null {
  if (asBoolean(settings.automation_paused)) return 'All automation is paused.';
  if (!asBoolean(settings[def.enabledKey])) return 'This job is switched off.';
  if (def.needsApproval) {
    const current = templateVersion(def.id);
    const approved = settings[def.approvedKey] ?? '';
    if (approved !== current) {
      return approved
        ? `Its template changed since it was approved (approved ${approved}, now ${current}). Send a test and switch it on again.`
        : 'Its template has not been approved.';
    }
  }
  if (def.marketing && !(settings.postal_address ?? '').trim()) {
    return 'There is no postal address in Settings, and marketing email may not go out without one.';
  }
  return null;
}

/** A run that did not start (the daily timer ran out of time for it): logged, so the report sees it. */
export async function recordSkippedRun(jobId: JobId, trigger: 'cron' | 'admin' | 'test', dryRun: boolean, note: string): Promise<RunReport> {
  const def = jobDef(jobId);
  if (!def) throw new Error(`Unknown job ${jobId}`);
  return recordSkipped(def, periodOf(new Date()), trigger, dryRun, note);
}

async function recordSkipped(def: JobDef, period: string, trigger: string, dryRun: boolean, note: string): Promise<RunReport> {
  const run = await prisma.automationRun.create({
    data: { job: def.id, period, trigger, dryRun, status: 'SKIPPED', note, finishedAt: new Date(), counts: {} },
    select: { id: true },
  });
  return { job: def.id, runId: run.id, status: 'SKIPPED', dryRun, counts: {}, note };
}

async function takeLock(key: string, runId: string): Promise<boolean> {
  const expiresAt = new Date(Date.now() + LOCK_MINUTES * 60_000);
  /* A lock left by a run that died: take it over once it has expired. Conditional, so two
     runs cannot both take it. */
  const takeOver = async () =>
    (
      await prisma.automationLock.updateMany({
        where: { key, expiresAt: { lt: new Date() } },
        data: { runId, lockedAt: new Date(), expiresAt },
      })
    ).count > 0;

  /* Looked up first so the usual case (already ran today) does not log a constraint error. */
  if (await prisma.automationLock.findUnique({ where: { key }, select: { key: true } })) return takeOver();
  try {
    await prisma.automationLock.create({ data: { key, runId, expiresAt } });
    return true;
  } catch (error) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')) throw error;
    return takeOver();
  }
}

export async function runJob(
  jobId: JobId,
  fn: JobFn,
  opts: {
    trigger: 'cron' | 'admin' | 'test';
    dryRun: boolean;
    now?: Date;
    ignoreSwitches?: boolean;
    only?: { orderIds?: string[] };
    /**
     * The time this run may spend sending. The daily timer passes what is left of its one
     * function's time (never more than the 40-second default); a script's test run may pass a
     * longer budget for a slow connection.
     */
    timeBudgetMs?: number;
  }
): Promise<RunReport> {
  const def = jobDef(jobId);
  if (!def) throw new Error(`Unknown job ${jobId}`);
  const now = opts.now ?? new Date();
  const period = periodOf(now);

  /* Housekeeping first, so a dead run never reads as running and its lock never lingers. */
  await closeStaleRuns(new Date()).catch((error) => console.error('[automation] closing stale runs failed:', error));

  invalidateSettings();
  const settings = await getSettings();

  if (!opts.dryRun && !opts.ignoreSwitches) {
    const blocked = blockedReason(def, settings);
    if (blocked) return recordSkipped(def, period, opts.trigger, false, blocked);
  }

  const run = await prisma.automationRun.create({
    data: { job: def.id, period, trigger: opts.trigger, dryRun: opts.dryRun },
    select: { id: true },
  });
  const lockKey = `${def.id}:${period}`;
  if (!opts.dryRun) {
    const locked = await takeLock(lockKey, run.id);
    if (!locked) {
      const note = 'Already ran for this day (the lock is taken). Nothing sent.';
      await prisma.automationRun.update({
        where: { id: run.id },
        data: { status: 'SKIPPED', note, finishedAt: new Date(), counts: {} },
      });
      return { job: def.id, runId: run.id, status: 'SKIPPED', dryRun: false, counts: {}, note };
    }
  }

  const counts: Record<string, number> = {};
  const count = (outcome: string, by = 1) => {
    counts[outcome] = (counts[outcome] ?? 0) + by;
  };
  const cap = Math.max(1, asNumber(settings.automation_max_per_run, 40));
  const budget =
    opts.timeBudgetMs === undefined
      ? TIME_BUDGET_MS
      : opts.trigger === 'test'
        ? opts.timeBudgetMs
        : Math.max(0, Math.min(opts.timeBudgetMs, TIME_BUDGET_MS));
  const started = Date.now();
  let attempted = 0;
  let stoppedBy: string | null = null;
  let copied = false;
  const copyTo = (settings.automation_copy_to ?? '').trim();

  const canSend = () => {
    if (attempted >= cap) stoppedBy = `Stopped at the cap of ${cap} emails; the rest go next time.`;
    else if (Date.now() - started > budget) stoppedBy = `Stopped at the ${Math.round(budget / 1000)}-second budget; the rest go next time.`;
    return stoppedBy === null;
  };

  const ctx: JobContext = {
    runId: run.id,
    dryRun: opts.dryRun,
    now,
    settings,
    postalAddress: settings.postal_address ?? '',
    only: opts.trigger === 'test' ? opts.only : undefined,
    count,
    canSend,
    send: async (req) => {
      if (!canSend()) return { status: 'skipped', reason: 'cap reached' };
      if (!opts.dryRun && attempted > 0) await sleep(PACE_MS);
      const outcome = await sendAutomatedEmail({ ...req, runId: run.id, dryRun: opts.dryRun, postalAddress: ctx.postalAddress });
      if (outcome.status === 'sent' || outcome.status === 'failed') attempted += 1;
      count(outcome.status === 'skipped' ? `skipped: ${outcome.reason}` : outcome.status === 'failed' ? 'failed' : outcome.status);

      /* The owner's copy of the first customer email of a real run (cron or Run now). A script's
         test run makes no copy: its "customer" is a throwaway address, and a copy would put a
         made-up order in the owner's inbox. */
      if (outcome.status === 'sent' && !copied && copyTo && def.audience !== 'shop' && opts.trigger !== 'test') {
        copied = true;
        const when = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }).format(new Date());
        const html = asOwnerCopy(
          outcome.html.split(/\/unsubscribe\?token=[^"'\s<]+/).join('/unsubscribe'),
          `Your copy: the first email of today's "${def.label}" run, sent to ${maskEmail(req.to)} at ${when} UTC. Its unsubscribe link is disabled in this copy.`
        );
        await sleep(PACE_MS);
        const copy = await sendPlain({ key: `copy:${run.id}`, job: def.id, kind: 'INTERNAL', to: copyTo, subject: `[Copy] ${req.subject}`, html, runId: run.id });
        count(copy.status === 'sent' ? 'owner copy sent' : 'owner copy failed');
      }
      return outcome;
    },
  };

  try {
    await fn(ctx);
    const status = stoppedBy ? 'PARTIAL' : 'OK';
    const failed = counts.failed ?? 0;
    const note = [stoppedBy, failed ? `${failed} email${failed === 1 ? '' : 's'} refused by Resend; they are retried next run.` : null]
      .filter(Boolean)
      .join(' ') || null;
    await prisma.automationRun.update({
      where: { id: run.id },
      data: { status, counts, note, finishedAt: new Date() },
    });
    if (!opts.dryRun) {
      /* Keep the lock for the rest of the day: the job has run. */
      await prisma.automationLock.update({ where: { key: lockKey }, data: { expiresAt: new Date(Date.now() + 2 * 86_400_000) } }).catch(() => {});
    }
    return { job: def.id, runId: run.id, status, dryRun: opts.dryRun, counts, note };
  } catch (error) {
    const note = `Failed: ${error instanceof Error ? error.message : String(error)}`.slice(0, 2000);
    console.error(`[automation ${def.id}]`, error);
    await prisma.automationRun
      .update({ where: { id: run.id }, data: { status: 'FAILED', counts, note, finishedAt: new Date() } })
      .catch(() => {});
    if (!opts.dryRun) await prisma.automationLock.deleteMany({ where: { key: lockKey, runId: run.id } }).catch(() => {});
    return { job: def.id, runId: run.id, status: 'FAILED', dryRun: opts.dryRun, counts, note };
  }
}
