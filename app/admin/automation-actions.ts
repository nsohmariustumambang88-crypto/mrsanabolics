'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { SITE } from '@/lib/site';
import { getSettings, invalidateSettings, writeSettings } from '@/lib/settings';
import { advertisedDiscount } from '@/lib/discounts';
import { jobDef, excludedFromMarketing, type JobId } from '@/lib/automation/jobs';
import { runJobNow } from '@/lib/automation/registry';
import {
  UNSUBSCRIBE_PLACEHOLDER,
  templateVersion,
  unpaidReminderEmail,
  welcomeEmail2,
  welcomeEmail3,
  withPostalAddress,
} from '@/lib/automation/templates';
import { sendPlain } from '@/lib/automation/sender';
import { basketReminderSubject, renderBasketReminderHTML } from '@/lib/email/basket-reminder';
import { buildWeeklyReport } from '@/lib/automation/jobs/shop-reports';
import { weeklyReportEmail, enquiryAlertEmail } from '@/lib/automation/templates';

/*
  The Automation screen's controls. requireAdmin() first in every one, like every action file.

  Switching a customer-facing job ON records the template version the owner approved: the one
  his test showed (its subject carries the version). Changing a template later changes its
  version, and the job stops sending until it is switched on again — his rule that any template
  change needs his OK.
*/

export type AutomationResult = { ok: true; message: string } | { ok: false; error: string };

const EXPIRED = 'Your session has expired. Sign in again.';

async function admin() {
  try {
    return await requireAdmin();
  } catch {
    return null;
  }
}

function asJob(id: string): JobId | null {
  return jobDef(id)?.id ?? null;
}

export async function runAutomationJob(jobId: string, dryRun: boolean): Promise<AutomationResult> {
  if (!(await admin())) return { ok: false, error: EXPIRED };
  const job = asJob(jobId);
  if (!job) return { ok: false, error: 'No such job.' };
  const report = await runJobNow(job, { trigger: 'admin', dryRun });
  revalidatePath('/admin/automation');
  const counts = Object.entries(report.counts)
    .map(([k, v]) => `${k}: ${v}`)
    .join('; ');
  const head = dryRun ? 'Dry run, nothing sent' : report.status === 'SKIPPED' ? 'Not run' : `Run ${report.status.toLowerCase()}`;
  return report.status === 'FAILED'
    ? { ok: false, error: report.note ?? 'The run failed.' }
    : { ok: true, message: `${head}. ${report.note ? `${report.note} ` : ''}${counts || 'Nothing to do.'}` };
}

export async function switchAutomationJob(jobId: string, on: boolean): Promise<AutomationResult> {
  const who = await admin();
  if (!who) return { ok: false, error: EXPIRED };
  const def = jobDef(jobId);
  if (!def) return { ok: false, error: 'No such job.' };
  const values: Record<string, string> = { [def.enabledKey]: on ? 'true' : 'false' };
  if (on && def.needsApproval) values[def.approvedKey] = templateVersion(def.id);
  await writeSettings(values, who.email);
  revalidatePath('/admin/automation');
  return {
    ok: true,
    message: on
      ? `${def.label} is on${def.needsApproval ? `, with template ${values[def.approvedKey]} approved` : ''}.`
      : `${def.label} is off.`,
  };
}

export async function setAutomationPaused(paused: boolean): Promise<AutomationResult> {
  const who = await admin();
  if (!who) return { ok: false, error: EXPIRED };
  await writeSettings({ automation_paused: paused ? 'true' : 'false' }, who.email);
  revalidatePath('/admin/automation');
  return { ok: true, message: paused ? 'All automation is paused.' : 'Automation is no longer paused. Each job still needs its own switch on.' };
}

/*
  A test of a job's template, to the `automation_copy_to` address only, never to a customer.
  The subject carries the template version, which is what switching the job on approves.
  Sample data, with real product names and photos so it looks like the real thing.
*/
export async function sendAutomationTest(jobId: string): Promise<AutomationResult> {
  if (!(await admin())) return { ok: false, error: EXPIRED };
  const def = jobDef(jobId);
  if (!def) return { ok: false, error: 'No such job.' };
  invalidateSettings();
  const settings = await getSettings();
  const to = (settings.automation_copy_to ?? '').trim();
  if (!to) return { ok: false, error: 'Set "Copy of the first email of each run, and template tests, to" first.' };

  const version = templateVersion(def.id);
  const postal = (settings.postal_address ?? '').trim();
  const marketing = (html: string) => {
    const linked = html.split(UNSUBSCRIBE_PLACEHOLDER).join(`${SITE.url}/unsubscribe`);
    return withPostalAddress(linked, postal || 'POSTAL ADDRESS NOT SET: required before this email can go to subscribers');
  };

  const sample = await prisma.product.findMany({
    where: { inStock: true, price: { gte: 40, lte: 120 } },
    select: { name: true, slug: true, brand: { select: { name: true } }, images: true, price: true, category: { select: { slug: true } } },
    take: 30,
  });
  const products = sample.filter((p) => !excludedFromMarketing({ name: p.name, categorySlug: p.category?.slug })).slice(0, 2);

  const emails: { subject: string; html: string }[] = [];
  if (def.id === 'unpaid-orders') {
    const items = products.map((p) => ({ name: p.name, quantity: 1, lineTotal: Number(p.price) }));
    const subtotal = items.reduce((s, i) => s + i.lineTotal, 0);
    const base = {
      firstName: 'Marius',
      reference: 'MRA-TEST01',
      placedAt: new Date(Date.now() - 26 * 3_600_000),
      items,
      subtotal,
      discountLabel: null,
      discountTotal: 0,
      shipping: 9,
      total: subtotal + 9,
      payUrl: `${SITE.url}/checkout/payment-confirmation?order=MRA-TEST01`,
      cashApp: null,
    };
    emails.push(unpaidReminderEmail({ ...base, step: 1, method: 'crypto' }));
    emails.push(unpaidReminderEmail({ ...base, step: 2, method: 'bank_transfer', payUrl: null }));
  } else if (def.id === 'basket-reminders') {
    const live = await advertisedDiscount('WELCOME15').catch(() => null);
    const offer = Boolean(live && live.headline === '15% off' && !live.condition);
    const lines = products.map((p) => ({
      slug: p.slug,
      name: p.name,
      brand: p.brand?.name ?? '',
      image: p.images[0] ?? '',
      price: Number(p.price),
      quantity: 1,
    }));
    emails.push({
      subject: basketReminderSubject(lines, offer),
      html: marketing(
        renderBasketReminderHTML({ firstName: 'Marius', lines, restoreUrl: `${SITE.url}/basket`, unsubscribeUrl: UNSUBSCRIBE_PLACEHOLDER, offer, reachedCheckout: true })
      ),
    });
  } else if (def.id === 'welcome') {
    const live = await advertisedDiscount('WELCOME15').catch(() => null);
    const two = welcomeEmail2();
    const three = welcomeEmail3(live ? { code: live.code, headline: live.headline, condition: live.condition } : null);
    emails.push({ subject: two.subject, html: marketing(two.html) });
    emails.push({ subject: three.subject, html: marketing(three.html) });
  } else if (def.id === 'weekly-report') {
    emails.push(weeklyReportEmail(await buildWeeklyReport(new Date(), settings)));
  } else if (def.id === 'enquiry-alert') {
    emails.push(
      enquiryAlertEmail({ enquiries: [{ name: 'Sample person', email: 'sample@example.com', subject: 'Sample enquiry', waitedHours: 30, url: `${SITE.url}/admin/enquiries` }] })
    );
  }

  const stamp = Date.now();
  const sent: string[] = [];
  for (const [i, email] of emails.entries()) {
    if (i > 0) await new Promise((r) => setTimeout(r, 600));
    const outcome = await sendPlain({
      key: `test:${def.id}:${i}:${stamp}`,
      job: def.id,
      kind: 'TEST',
      to,
      subject: `[TEST${version ? ` ${version}` : ''}] ${email.subject}`,
      html: email.html,
    });
    if (outcome.status !== 'sent') return { ok: false, error: `Test ${i + 1} was not sent: ${'reason' in outcome ? outcome.reason : outcome.status}` };
    sent.push(email.subject);
  }
  revalidatePath('/admin/automation');
  return { ok: true, message: `Sent ${sent.length} test${sent.length === 1 ? '' : 's'} to ${to}${version ? ` (template ${version})` : ''}.` };
}
