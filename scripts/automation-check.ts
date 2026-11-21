/*
  Checks of the automation against the real database. Run from the repo root:

    node --env-file=.env --conditions=react-server --import tsx scripts/automation-check.ts dry
    node --env-file=.env --conditions=react-server --import tsx scripts/automation-check.ts twice
    node --env-file=.env --conditions=react-server --import tsx scripts/automation-check.ts tests <job>
    node --env-file=.env --conditions=react-server --import tsx scripts/automation-check.ts status <resendId>…

  `--conditions=react-server` makes `import 'server-only'` resolve to its empty build, so the real
  modules run here unchanged: this checks the code that ships, not a copy of it.

  dry    Every job, dry run: who would get what, as COUNTS only. Sends nothing, takes no lock.
  twice  The no-double-send proof. Makes a throwaway contact (Resend's delivered@resend.dev test
         inbox) and one unpaid order 26 hours old, runs the unpaid-orders job for that order only,
         then runs it again (the lock stops it), then deletes the lock and runs it a third time
         (the email log stops it). Expects exactly one email. Deletes everything it made.
  tests  Sends the job's template tests to `automation_copy_to` (the owner) and prints Resend ids.
  status Resend's last event for each id.
*/
import { prisma } from '../lib/prisma';
import { JOBS, type JobId } from '../lib/automation/jobs';
import { runJobNow } from '../lib/automation/registry';
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

async function twice() {
  const email = 'delivered@resend.dev';
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
    console.log(`email log rows for the order: ${logs.length}, sent: ${sent.length}`);
    const pass = sent.length === 1 && second.status === 'SKIPPED' && (third.counts['skipped: already sent'] ?? 0) === 1;
    console.log(pass ? 'PASS: exactly one email, the lock and the email log each stopped a second one' : 'FAIL');
    if (sent[0]?.resendId) {
      await new Promise((r) => setTimeout(r, 5000));
      console.log('Resend status of that email:', await resendStatus(sent[0].resendId));
    }
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
  else if (mode === 'twice') await twice();
  else if (mode === 'tests') await tests(args[0] as JobId);
  else if (mode === 'status') await status(args);
  else console.log('modes: dry | twice | tests <job> | status <id>…');
  await prisma.$disconnect();
})().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
