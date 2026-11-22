'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth';
import { getSettings, invalidateSettings, writeSettings } from '@/lib/settings';
import { jobDef, type JobId } from '@/lib/automation/jobs';
import { runJobNow } from '@/lib/automation/registry';
import { templateVersion } from '@/lib/automation/templates';
import { sendTemplateTests } from '@/lib/automation/template-tests';

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
  if (on && def.marketing) {
    invalidateSettings();
    const postal = ((await getSettings()).postal_address ?? '').trim();
    if (!postal) return { ok: false, error: 'Enter a real postal address on the Email screen first: marketing email may not go out without one.' };
  }
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

/* A test of a job's templates, to the owner's address only (lib/automation/template-tests.ts). */
export async function sendAutomationTest(jobId: string): Promise<AutomationResult> {
  if (!(await admin())) return { ok: false, error: EXPIRED };
  const result = await sendTemplateTests(jobId);
  revalidatePath('/admin/automation');
  if (!result.ok) return result;
  return {
    ok: true,
    message: `Sent ${result.sent.length} test${result.sent.length === 1 ? '' : 's'} to ${result.to}${result.version ? ` (template ${result.version})` : ''}.`,
  };
}
