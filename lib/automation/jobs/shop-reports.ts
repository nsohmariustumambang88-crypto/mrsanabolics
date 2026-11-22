import 'server-only';

import { prisma } from '@/lib/prisma';
import { SITE } from '@/lib/site';
import { asBoolean } from '@/lib/settings';
import { FRIDAY_CODE } from '@/lib/offers/friday';
import { JOBS, isStaleRun, periodOf } from '@/lib/automation/jobs';
import { enquiryAlertEmail, weeklyReportEmail, type WeeklyReport } from '@/lib/automation/templates';
import { closeStaleRuns, type JobContext } from '@/lib/automation/run';

/*
  The shop's own two emails: the waiting-enquiries alert (daily) and the weekly report (Saturday).
  Both go to the `automation_report_to` addresses (support@ by default), one email log key per
  address per period, so a second run the same day sends nothing.
*/

const DAY = 86_400_000;

function recipients(ctx: JobContext): string[] {
  return (ctx.settings.automation_report_to || 'support@mrsanabolics.com')
    .split(/[,;\s]+/)
    .map((s) => s.trim())
    .filter((s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s));
}

export async function enquiryAlertJob(ctx: JobContext): Promise<void> {
  const waiting = await prisma.enquiry.findMany({
    where: { status: { in: ['NEW', 'OPEN'] }, createdAt: { lte: new Date(ctx.now.getTime() - DAY) } },
    orderBy: { createdAt: 'asc' },
    take: 50,
    select: { id: true, name: true, email: true, subject: true, createdAt: true },
  });
  if (waiting.length === 0) {
    ctx.count('nothing waiting over 24 hours');
    return;
  }
  ctx.count('enquiries waiting', waiting.length);
  const email = enquiryAlertEmail({
    enquiries: waiting.map((e) => ({
      name: e.name,
      email: e.email,
      subject: e.subject,
      waitedHours: (ctx.now.getTime() - e.createdAt.getTime()) / 3_600_000,
      url: `${SITE.url}/admin/enquiries`,
    })),
  });
  const period = periodOf(ctx.now);
  for (const to of recipients(ctx)) {
    await ctx.send({ key: `enquiry-alert:${period}:${to.toLowerCase()}`, job: 'enquiry-alert', kind: 'INTERNAL', to, subject: email.subject, html: email.html });
  }
}

/** The report's figures for the 7 days before `now`. Exported for the dry run and the tests. */
export async function buildWeeklyReport(now: Date, settings: Record<string, string>): Promise<WeeklyReport> {
  const to = now;
  const from = new Date(now.getTime() - 7 * DAY);
  const inWeek = { gte: from, lt: to };

  /* The New York days of the week, oldest first, for "did it run every day?". Runs are matched by
     their day, not by start time: on Hobby a job fires anywhere inside its hour, so last
     Saturday's run can start a few minutes before `from` and would otherwise read as missed. */
  const days: string[] = [];
  for (let i = 7; i >= 1; i -= 1) days.push(periodOf(new Date(now.getTime() - i * DAY)));

  /* A run left RUNNING by a process that died is closed as failed before anything is counted. */
  await closeStaleRuns(now).catch(() => {});

  const [newCustomers, newSubscribers, unsubscribed, orders, enquiriesReceived, stillWaiting, searches, emails, runs] =
    await Promise.all([
      prisma.customer.count({ where: { createdAt: inWeek } }),
      prisma.subscriber.count({ where: { createdAt: inWeek } }),
      prisma.subscriber.count({ where: { unsubscribedAt: inWeek } }),
      prisma.order.findMany({
        where: { createdAt: inWeek },
        select: { status: true, total: true, discountCode: true, discountTotal: true },
      }),
      prisma.enquiry.count({ where: { createdAt: inWeek } }),
      prisma.enquiry.count({ where: { status: { in: ['NEW', 'OPEN'] } } }),
      prisma.searchQuery.groupBy({
        by: ['normalized'],
        where: { occurredAt: inWeek, resultCount: 0 },
        _count: { _all: true },
        orderBy: { _count: { normalized: 'desc' } },
        take: 10,
      }),
      prisma.emailLog.groupBy({
        by: ['job', 'kind', 'status'],
        where: { createdAt: inWeek, kind: { not: 'TEST' } },
        _count: { _all: true },
      }),
      prisma.automationRun.findMany({
        where: { period: { in: days }, dryRun: false, trigger: { not: 'test' } },
        select: { job: true, period: true, status: true, note: true, startedAt: true },
      }),
    ]);

  const sum = (list: { total: unknown }[]) => list.reduce((s, o) => s + Number(o.total), 0);
  const paid = orders.filter((o) => o.status !== 'NEW' && o.status !== 'CANCELLED');
  const unpaid = orders.filter((o) => o.status === 'NEW');
  const friday = orders.filter((o) => o.discountCode === FRIDAY_CODE);
  const fridayPaid = friday.filter((o) => o.status !== 'NEW' && o.status !== 'CANCELLED');
  const given = (list: { discountTotal: unknown }[]) => list.reduce((s, o) => s + Number(o.discountTotal), 0);

  const jobs = JOBS.filter((j) => j.id !== 'weekly-report').map((def) => {
    const mine = runs.filter((r) => r.job === def.id);
    /* A run that died counts as failed, never as having run. A day is "missed" only when no run
       was recorded for it at all: the cron did not fire, or CRON_SECRET was missing. */
    const failedRuns = mine.filter((r) => r.status === 'FAILED' || isStaleRun(r, now));
    const daysRun = new Set(mine.map((r) => r.period));
    const skippedNotes = Array.from(
      new Set(mine.filter((r) => r.status === 'SKIPPED' && r.note && !r.note.startsWith('Already ran')).map((r) => r.note as string))
    );
    return {
      label: def.label,
      enabled: asBoolean(settings[def.enabledKey]),
      ran: mine.filter((r) => r.status === 'OK' || r.status === 'PARTIAL').length,
      failed: failedRuns.length,
      missedDays: days.filter((d) => !daysRun.has(d)),
      notes: skippedNotes.slice(0, 2),
    };
  });

  return {
    from,
    to,
    newCustomers,
    newSubscribers,
    unsubscribed,
    paid: { count: paid.length, total: sum(paid) },
    unpaid: { count: unpaid.length, total: sum(unpaid) },
    cancelled: orders.filter((o) => o.status === 'CANCELLED').length,
    friday: { orders: friday.length, given: given(friday), paidOrders: fridayPaid.length, paidGiven: given(fridayPaid) },
    enquiries: { received: enquiriesReceived, stillWaiting },
    failedSearches: searches.map((s) => ({ term: s.normalized, count: s._count._all })),
    emails: emails.map((e) => ({ job: e.job, kind: e.kind, status: e.status, count: e._count._all })),
    jobs,
  };
}

export async function weeklyReportJob(ctx: JobContext): Promise<void> {
  const report = await buildWeeklyReport(ctx.now, ctx.settings);
  const email = weeklyReportEmail(report);
  const period = periodOf(ctx.now);
  ctx.count('paid orders this week', report.paid.count);
  for (const to of recipients(ctx)) {
    await ctx.send({ key: `weekly-report:${period}:${to.toLowerCase()}`, job: 'weekly-report', kind: 'INTERNAL', to, subject: email.subject, html: email.html });
  }
}
