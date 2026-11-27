import 'server-only';

import { createHash, timingSafeEqual } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { DAILY_ORDER, isSaturdayInNewYork, jobDef, type JobId } from '@/lib/automation/jobs';
import { asBoolean, getSettings, invalidateSettings } from '@/lib/settings';
import { recordSkippedRun, runJob, type JobFn, type RunReport } from '@/lib/automation/run';
import { unpaidOrdersJob } from '@/lib/automation/jobs/unpaid-orders';
import { welcomeJob } from '@/lib/automation/jobs/welcome';
import { enquiryAlertJob, weeklyReportJob } from '@/lib/automation/jobs/shop-reports';
import { basketRemindersJob } from '@/lib/basket/reminders';

/* Which function each job runs. */
export const JOB_FNS: Record<JobId, JobFn> = {
  'unpaid-orders': unpaidOrdersJob,
  'basket-reminders': basketRemindersJob,
  welcome: welcomeJob,
  'enquiry-alert': enquiryAlertJob,
  'weekly-report': weeklyReportJob,
};

export function runJobNow(
  job: JobId,
  opts: Parameters<typeof runJob>[2]
): Promise<RunReport> {
  return runJob(job, JOB_FNS[job], opts);
}

/** Constant-time comparison of the Authorization header with the expected value. */
function sameSecret(given: string | null, expected: string): boolean {
  if (!given) return false;
  const a = createHash('sha256').update(given).digest();
  const b = createHash('sha256').update(expected).digest();
  return timingSafeEqual(a, b);
}

/* The daily timer's whole run fits one function call (maxDuration 60 on the route). */
const DAILY_BUDGET_MS = 50_000;
/** Kept back for the last send of a job (Resend answers within 10 seconds) and the bookkeeping. */
const JOB_RESERVE_MS = 12_000;
/** A job is not started with less than this left; the next day's run picks its work up. */
const MIN_JOB_MS = 5_000;

export type DailyStep = { job: JobId; status: RunReport['status'] | 'not today' | 'off' | 'no time left'; note?: string | null; counts?: Record<string, number> };

/**
 * Run the daily timer's jobs in DAILY_ORDER inside one function's time: unpaid order reminders,
 * basket reminders, then the enquiry alert and (Saturdays) the weekly report, those two only while
 * switched on. Each job keeps all its own guards (switch, pause, approval, postal address, lock).
 */
export async function runDailyJobs(opts: { dryRun: boolean; now?: Date }): Promise<DailyStep[]> {
  const started = Date.now();
  const deadline = started + DAILY_BUDGET_MS;
  const now = opts.now ?? new Date();
  invalidateSettings();
  const settings = await getSettings();
  const steps: DailyStep[] = [];

  for (const job of DAILY_ORDER) {
    const def = jobDef(job);
    if (!def || def.timer === 'no') continue;
    if (def.timer === 'saturdays' && !isSaturdayInNewYork(now)) {
      steps.push({ job, status: 'not today' });
      continue;
    }
    if (def.timerOnlyIfOn && !asBoolean(settings[def.enabledKey])) {
      steps.push({ job, status: 'off' });
      continue;
    }
    const left = deadline - Date.now() - JOB_RESERVE_MS;
    if (left < MIN_JOB_MS) {
      const note = "No time left in today's daily run; tomorrow's run picks the work up.";
      await recordSkippedRun(job, 'cron', opts.dryRun, note).catch(() => {});
      steps.push({ job, status: 'no time left', note });
      continue;
    }
    try {
      const report = await runJobNow(job, { trigger: 'cron', dryRun: opts.dryRun, timeBudgetMs: left });
      steps.push({ job, status: report.status, note: report.note, counts: report.counts });
    } catch (error) {
      /* One job failing never stops the next one. */
      console.error(`[daily ${job}] failed:`, error);
      steps.push({ job, status: 'FAILED', note: 'The run failed; see the logs.' });
    }
  }
  return steps;
}

/*
  The daily timer's route. FAILS CLOSED: with no CRON_SECRET on the deployment it answers 503 to
  everyone, and with one it answers 401 to anything but `Authorization: Bearer <CRON_SECRET>`,
  which Vercel sends by itself on every scheduled call. `?dry=1` counts without sending.
*/
export async function handleDailyCron(request: NextRequest): Promise<NextResponse> {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return NextResponse.json({ ok: false, error: 'CRON_SECRET is not set on this deployment.' }, { status: 503 });
  }
  if (!sameSecret(request.headers.get('authorization'), `Bearer ${secret}`)) {
    return NextResponse.json({ ok: false, error: 'Unauthorised.' }, { status: 401 });
  }
  const dryRun = request.nextUrl.searchParams.get('dry') === '1';
  try {
    const steps = await runDailyJobs({ dryRun });
    const failed = steps.some((s) => s.status === 'FAILED');
    return NextResponse.json({ ok: !failed, dryRun, steps }, { status: failed ? 500 : 200 });
  } catch (error) {
    console.error('[daily cron] failed:', error);
    return NextResponse.json({ ok: false, error: 'The run failed; see the logs.' }, { status: 500 });
  }
}
