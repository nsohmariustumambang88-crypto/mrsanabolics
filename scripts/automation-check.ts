/*
  Checks of the automation against the real database. Run from the repo root:

    node --env-file=.env --conditions=react-server --import tsx scripts/automation-check.ts dry [job]
    node --env-file=.env --conditions=react-server --import tsx scripts/automation-check.ts switches
    node --env-file=.env --conditions=react-server --import tsx scripts/automation-check.ts cron
    node --env-file=.env --conditions=react-server --import tsx scripts/automation-check.ts twice
    node --env-file=.env --conditions=react-server --import tsx scripts/automation-check.ts tests <job>
    node --env-file=.env --conditions=react-server --import tsx scripts/automation-check.ts status <resendId>…

  `--conditions=react-server` makes `import 'server-only'` resolve to its empty build, so the real
  modules run here unchanged: this checks the code that ships, not a copy of it.

  dry      Every job (or one), dry run: who would get what, as COUNTS only. Sends nothing, takes
           no lock. Each dry run is one row in the run log, marked "test, dry run".
  switches Why each job would not send right now, from the live settings (switch, pause, approved
           template, postal address). Reads only.
  cron     The cron routes fail closed: no CRON_SECRET answers 503, a wrong one 401. The secret is
           set only inside this process, never on Vercel. Touches no data.
  twice    The no-double-send proof, with Resend STUBBED in this process so no email can leave
           (test email goes only to the owner). Makes a throwaway contact at an .invalid address
           and one unpaid order 26 hours old, runs the unpaid-orders job for that order only, then
           again (the lock stops it), then deletes the lock and runs it a third time (the email log
           stops it). Expects exactly one send. Deletes everything it made.
  tests    Sends the job's template tests to `automation_copy_to` (the owner) and prints Resend ids.
  status   Resend's last event for each id.
*/
import { NextRequest } from 'next/server';
import { prisma } from '../lib/prisma';
import { getSettings, invalidateSettings } from '../lib/settings';
import { JOBS, type JobId } from '../lib/automation/jobs';
import { blockedReason } from '../lib/automation/run';
import { handleCron, runJobNow } from '../lib/automation/registry';
import { sendTemplateTests } from '../lib/automation/template-tests';
import { resendStatus } from '../lib/automation/sender';

const [mode, ...args] = process.argv.slice(2);

async function dry(only?: string) {
  for (const job of JOBS.filter((j) => !only || j.id === only)) {
    const report = await runJobNow(job.id, { trigger: 'test', dryRun: true, timeBudgetMs: Number(process.env.BUDGET_MS ?? 70_000) });
    console.log(`\n${job.label} [${report.status}]`);
    for (const [k, v] of Object.entries(report.counts)) console.log(`  ${k}: ${v}`);
    if (report.note) console.log(`  note: ${report.note}`);
    if (!Object.keys(report.counts).length) console.log('  nothing to do');
  }
}

async function switches() {
  invalidateSettings();
  const settings = await getSettings();
  for (const job of JOBS) console.log(`${job.label}: ${blockedReason(job, settings) ?? 'WOULD SEND (switched on, nothing blocking)'}`);
}

async function cron() {
  const saved = process.env.CRON_SECRET;
  const call = (auth?: string) =>
    handleCron(
      new NextRequest('https://www.mrsanabolics.com/api/cron/unpaid-orders', auth ? { headers: { authorization: auth } } : undefined),
      'unpaid-orders'
    );
  try {
    delete process.env.CRON_SECRET;
    const none = await call('Bearer anything');
    process.env.CRON_SECRET = 'local-check-only-' + Math.random().toString(36).slice(2);
    const missing = await call();
    const wrong = await call('Bearer not-the-secret');
    console.log(`no CRON_SECRET: ${none.status} (want 503)`);
    console.log(`secret set, no header: ${missing.status} (want 401)`);
    console.log(`secret set, wrong header: ${wrong.status} (want 401)`);
    const pass = none.status === 503 && missing.status === 401 && wrong.status === 401;
    console.log(pass ? 'PASS: the cron routes fail closed' : 'FAIL');
    if (!pass) process.exitCode = 1;
  } finally {
    if (saved === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = saved;
  }
}

/** Replace Resend with a stub for this process: every send "succeeds" and nothing leaves. */
function stubResend(): { sends: () => number } {
  let sends = 0;
  const real = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    if (url.startsWith('https://api.resend.com/')) {
      if ((init?.method ?? 'GET').toUpperCase() === 'POST') sends += 1;
      return new Response(JSON.stringify({ id: `stub-${sends}`, last_event: 'stubbed' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }
    return real(input, init);
  }) as typeof fetch;
  return { sends: () => sends };
}

async function twice() {
  const stub = stubResend();
  const email = `automation-check-${Date.now().toString(36)}@example.invalid`;
  const existing = await prisma.contact.findUnique({ where: { email } });
  if (existing) throw new Error('A contact with the test address already exists; not touching it.');
  const contact = await prisma.contact.create({ data: { email, name: 'Automation Test', firstSource: 'automation test' } });
  const reference = `MRA-T${Date.now().toString(36).toUpperCase().slice(-5)}`;
  const order = await prisma.order.create({
    data: {
      reference,
      contactId: contact.id,
      status: 'NEW',
      shipName: 'Automation Test',
      shipLine1: '1 Test Street',
      shipCity: 'Test',
      shipPostcode: '',
      shipCountry: 'US',
      subtotal: '120.00',
      shipping: '9.00',
      total: '129.00',
      notes: 'Payment: bank_transfer',
      createdAt: new Date(Date.now() - 26 * 3_600_000),
      items: { create: [{ name: 'Test line', slug: 'test-line', unitPrice: '120.00', quantity: 1, lineTotal: '120.00' }] },
    },
  });
  const only = { orderIds: [order.id] };
  const runIds: string[] = [];
  try {
    const first = await runJobNow('unpaid-orders', { trigger: 'test', dryRun: false, ignoreSwitches: true, only });
    runIds.push(first.runId ?? '');
    console.log('run 1:', first.status, JSON.stringify(first.counts));

    const second = await runJobNow('unpaid-orders', { trigger: 'test', dryRun: false, ignoreSwitches: true, only });
    runIds.push(second.runId ?? '');
    console.log('run 2 (same day, lock held):', second.status, second.note);

    const period = (await prisma.automationRun.findUnique({ where: { id: first.runId! } }))!.period;
    await prisma.automationLock.deleteMany({ where: { key: `unpaid-orders:${period}` } });
    const third = await runJobNow('unpaid-orders', { trigger: 'test', dryRun: false, ignoreSwitches: true, only });
    runIds.push(third.runId ?? '');
    console.log('run 3 (lock removed, as a duplicate delivery would be):', third.status, JSON.stringify(third.counts));

    const logs = await prisma.emailLog.findMany({ where: { orderId: order.id } });
    const sent = logs.filter((l) => l.status === 'SENT');
    console.log(`email log rows for the order: ${logs.length}, sent: ${sent.length}, calls to (stubbed) Resend: ${stub.sends()}`);
    const pass =
      sent.length === 1 && stub.sends() === 1 && second.status === 'SKIPPED' && (third.counts['skipped: already sent'] ?? 0) === 1;
    console.log(pass ? 'PASS: exactly one send; the lock and the email log each stopped a second one' : 'FAIL');
    if (!pass) process.exitCode = 1;
  } finally {
    await prisma.emailLog.deleteMany({ where: { orderId: order.id } });
    await prisma.emailLog.deleteMany({ where: { runId: { in: runIds.filter(Boolean) } } });
    await prisma.automationRun.deleteMany({ where: { id: { in: runIds.filter(Boolean) } } });
    await prisma.automationLock.deleteMany({ where: { runId: { in: runIds.filter(Boolean) } } });
    await prisma.order.delete({ where: { id: order.id } });
    await prisma.contact.delete({ where: { id: contact.id } });
    console.log('cleaned up the test order, contact, runs, locks and log rows');
  }
}

async function tests(job: string) {
  const result = await sendTemplateTests(job);
  console.log(JSON.stringify(result, null, 1));
  if (!result.ok) process.exitCode = 1;
}

async function status(ids: string[]) {
  for (const id of ids) console.log(id, await resendStatus(id));
}

(async () => {
  if (mode === 'dry') await dry(args[0]);
  else if (mode === 'switches') await switches();
  else if (mode === 'cron') await cron();
  else if (mode === 'twice') await twice();
  else if (mode === 'tests') await tests(args[0] as JobId);
  else if (mode === 'status') await status(args);
  else console.log('modes: dry [job] | switches | cron | twice | tests <job> | status <id>…');
  await prisma.$disconnect();
})().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
