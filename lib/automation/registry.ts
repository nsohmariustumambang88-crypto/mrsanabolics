import 'server-only';

import { NextResponse, type NextRequest } from 'next/server';
import type { JobId } from '@/lib/automation/jobs';
import { runJob, type JobFn, type RunReport } from '@/lib/automation/run';
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

/*
  A cron route. FAILS CLOSED: with no CRON_SECRET on the deployment it answers 503 to everyone,
  and with one it answers 401 to anything but `Authorization: Bearer <CRON_SECRET>`, which Vercel
  sends by itself on every scheduled call. `?dry=1` counts without sending.
*/
export async function handleCron(request: NextRequest, job: JobId): Promise<NextResponse> {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ ok: false, error: 'CRON_SECRET is not set on this deployment.' }, { status: 503 });
  }
  if (request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: 'Unauthorised.' }, { status: 401 });
  }
  const dryRun = request.nextUrl.searchParams.get('dry') === '1';
  try {
    const report = await runJobNow(job, { trigger: 'cron', dryRun });
    return NextResponse.json({ ok: report.status !== 'FAILED', ...report }, { status: report.status === 'FAILED' ? 500 : 200 });
  } catch (error) {
    console.error(`[cron ${job}] failed:`, error);
    return NextResponse.json({ ok: false, error: 'The run failed; see the logs.' }, { status: 500 });
  }
}
