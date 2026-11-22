import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { SETTINGS, asBoolean, getSettings } from '@/lib/settings';
import { JOBS, isStaleRun } from '@/lib/automation/jobs';
import { templateVersion } from '@/lib/automation/templates';
import { blockedReason } from '@/lib/automation/run';
import { WpPageHeader, WpPostbox, WpStaticNotice } from '@/components/admin/wp-ui';
import { SettingsForm, type SettingsGroup } from '@/components/admin/settings-form';
import { JobControls, PauseControl } from '@/components/admin/automation-panel';

/*
  Automation: the daily jobs, their switches, the run log and the email log.

  Every switch is off until the owner turns it on, and a customer-facing job is turned on only
  by approving the template version he was sent as a test (lib/automation/jobs.ts). Nothing on
  this screen shows a secret: CRON_SECRET is reported as set or not set.
*/

export const dynamic = 'force-dynamic';
/* The Run now and Dry run buttons run a job inside this page's server action. */
export const maxDuration = 60;

const when = (d: Date | null | undefined) =>
  d
    ? new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }).format(d) + ' UTC'
    : '—';

/* A run left RUNNING by a process that died reads as "did not finish", never as still going. */
const statusText = (r: { status: string; startedAt: Date }) => (isStaleRun(r) ? 'did not finish' : r.status.toLowerCase());

const countsText = (counts: unknown) => {
  if (!counts || typeof counts !== 'object') return '';
  return Object.entries(counts as Record<string, number>)
    .map(([k, v]) => `${k}: ${v}`)
    .join(' · ');
};

export default async function AutomationPage() {
  await requireAdmin();
  const [settings, runs, emails] = await Promise.all([
    getSettings(),
    prisma.automationRun.findMany({ orderBy: { startedAt: 'desc' }, take: 40 }),
    prisma.emailLog.findMany({ orderBy: { createdAt: 'desc' }, take: 50 }),
  ]);

  const cronSecret = Boolean(process.env.CRON_SECRET);
  const postal = (settings.postal_address ?? '').trim();
  const paused = asBoolean(settings.automation_paused);
  const copyTo = (settings.automation_copy_to ?? '').trim();

  const general: SettingsGroup[] = [
    {
      title: 'Limits and recipients',
      description: 'Shared by every job.',
      fields: SETTINGS.filter((s) => ['automation_max_per_run', 'automation_copy_to', 'automation_report_to'].includes(s.key)),
    },
  ];

  return (
    <>
      <WpPageHeader
        title="Automation"
        subtitle="The daily jobs that send email on their own. Each one is off until you switch it on, and every run is logged below."
      />

      {!cronSecret && (
        <WpStaticNotice tone="warning">
          CRON_SECRET is not set on this deployment, so Vercel cannot start any job yet. The buttons below still work.
        </WpStaticNotice>
      )}
      {!postal && (
        <WpStaticNotice tone="warning">
          There is no postal address yet (<Link href="/admin/email">Email</Link> screen, Postal address box). Basket reminders and
          welcome emails 2 and 3 are marketing, and cannot be switched on until a real postal address is entered there.
        </WpStaticNotice>
      )}
      {paused && <WpStaticNotice tone="error">All automation is paused. No job sends anything until you resume it.</WpStaticNotice>}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-5">
          {JOBS.map((job) => {
            const enabled = asBoolean(settings[job.enabledKey]);
            const current = templateVersion(job.id);
            const approved = settings[job.approvedKey] ?? '';
            const last = runs.find((r) => r.job === job.id && !r.dryRun);
            const blocked = blockedReason(job, settings);
            return (
              <WpPostbox key={job.id} title={job.label}>
                <p className="mt-0">{job.does}</p>
                <dl className="m-0 grid grid-cols-[9rem_minmax(0,1fr)] gap-x-3 gap-y-1 text-[13px]">
                  <dt className="font-semibold">Switch</dt>
                  <dd className="m-0">{enabled ? 'On' : 'Off'}{enabled && blocked ? `, but not sending: ${blocked}` : ''}</dd>
                  <dt className="font-semibold">Runs</dt>
                  <dd className="m-0">{job.when}</dd>
                  <dt className="font-semibold">Goes to</dt>
                  <dd className="m-0">
                    {job.audience === 'customers' ? 'Customers (about their own order)' : job.audience === 'subscribers' ? 'Subscribers only (marketing)' : 'The shop (the addresses below)'}
                  </dd>
                  {job.needsApproval && (
                    <>
                      <dt className="font-semibold">Template</dt>
                      <dd className="m-0">
                        {current}
                        {approved ? (approved === current ? ' (approved)' : ` (approved ${approved}; changed since)`) : ' (not approved yet)'}
                      </dd>
                    </>
                  )}
                  <dt className="font-semibold">Last run</dt>
                  <dd className="m-0">
                    {last ? `${when(last.startedAt)}: ${statusText(last)}${last.note ? `, ${last.note}` : ''}${countsText(last.counts) ? ` (${countsText(last.counts)})` : ''}` : 'Never'}
                  </dd>
                </dl>
                <div className="mt-3">
                  <JobControls
                    job={job.id}
                    enabled={enabled}
                    needsApproval={job.needsApproval}
                    currentVersion={current}
                    canTest={Boolean(copyTo)}
                    cannotSwitchOn={job.marketing && !postal ? 'Enter a real postal address on the Email screen first.' : null}
                  />
                </div>
              </WpPostbox>
            );
          })}

          <WpPostbox title="Run log">
            <div className="overflow-x-auto">
              <table className="wp-list-table min-w-[40rem]">
                <thead>
                  <tr>
                    <th>Started</th>
                    <th>Job</th>
                    <th>How</th>
                    <th>Result</th>
                    <th>Counts</th>
                  </tr>
                </thead>
                <tbody>
                  {runs.length === 0 && (
                    <tr>
                      <td colSpan={5}>No runs yet.</td>
                    </tr>
                  )}
                  {runs.map((r) => (
                    <tr key={r.id}>
                      <td>{when(r.startedAt)}</td>
                      <td>{JOBS.find((j) => j.id === r.job)?.label ?? r.job}</td>
                      <td>{r.trigger}{r.dryRun ? ', dry run' : ''}</td>
                      <td>
                        {statusText(r)}
                        {r.note ? <div className="text-[12px] text-[#646970]">{r.note}</div> : null}
                      </td>
                      <td className="text-[12px]">{countsText(r.counts)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </WpPostbox>

          <WpPostbox title="Email log (latest 50)">
            <div className="overflow-x-auto">
              <table className="wp-list-table min-w-[40rem]">
                <thead>
                  <tr>
                    <th>When</th>
                    <th>Job</th>
                    <th>To</th>
                    <th>Subject</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {emails.length === 0 && (
                    <tr>
                      <td colSpan={5}>No automated email yet.</td>
                    </tr>
                  )}
                  {emails.map((e) => (
                    <tr key={e.id}>
                      <td>{when(e.sentAt ?? e.createdAt)}</td>
                      <td>{e.job} <span className="text-[12px] text-[#646970]">({e.kind.toLowerCase()})</span></td>
                      <td>{e.toEmail}</td>
                      <td>{e.subject}</td>
                      <td>
                        {e.status.toLowerCase()}
                        {e.error ? <div className="text-[12px] text-[#646970]">{e.error}</div> : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </WpPostbox>

          <SettingsForm groups={general} values={settings} />
        </div>

        <div className="space-y-5">
          <WpPostbox title="Master switch">
            <p className="mt-0">Pausing stops every job at once, whatever its own switch says. Runs are still logged as paused.</p>
            <PauseControl paused={paused} />
          </WpPostbox>
          <WpPostbox title="Before anything sends">
            <ul className="m-0 list-disc pl-5 text-[13px]">
              <li>CRON_SECRET on Vercel: {cronSecret ? 'set' : 'not set'}</li>
              <li>Postal address: {postal ? 'set' : 'missing (marketing jobs blocked)'}</li>
              <li>Test and copy address: {copyTo || 'not set (tests disabled)'}</li>
            </ul>
          </WpPostbox>
        </div>
      </div>
    </>
  );
}
