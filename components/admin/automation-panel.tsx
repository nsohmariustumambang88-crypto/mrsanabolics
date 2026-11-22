'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { runAction } from '@/components/admin/run-action';
import {
  runAutomationJob,
  sendAutomationTest,
  setAutomationPaused,
  switchAutomationJob,
  type AutomationResult,
} from '@/app/admin/automation-actions';

/*
  The buttons on /admin/automation. Every call goes through runAction, like every admin control,
  so a dropped database connection shows as a message rather than a button stuck on "Working…".
*/

function useAct() {
  const router = useRouter();
  const [busy, setBusy] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<{ ok: boolean; text: string } | null>(null);
  const act = async (label: string, fn: () => Promise<AutomationResult>) => {
    setBusy(label);
    setNotice(null);
    const result = await runAction(fn);
    setBusy(null);
    setNotice(result.ok ? { ok: true, text: (result as { message: string }).message } : { ok: false, text: (result as { error: string }).error });
    router.refresh();
  };
  return { busy, notice, act };
}

function Notice({ notice }: { notice: { ok: boolean; text: string } | null }) {
  if (!notice) return null;
  return (
    <div className={`wp-notice ${notice.ok ? 'wp-notice-success' : 'wp-notice-error'}`} style={{ marginTop: 8 }}>
      <p>{notice.text}</p>
    </div>
  );
}

export function PauseControl({ paused }: { paused: boolean }) {
  const { busy, notice, act } = useAct();
  return (
    <div>
      <button
        type="button"
        className={paused ? 'wp-button wp-button-primary' : 'wp-button'}
        disabled={busy !== null}
        onClick={() => act('pause', () => setAutomationPaused(!paused))}
      >
        {busy ? 'Working…' : paused ? 'Resume automation' : 'Pause all automation'}
      </button>
      <Notice notice={notice} />
    </div>
  );
}

export function JobControls({
  job,
  enabled,
  needsApproval,
  currentVersion,
  canTest,
  cannotSwitchOn,
}: {
  job: string;
  enabled: boolean;
  needsApproval: boolean;
  currentVersion: string;
  canTest: boolean;
  /** Why the job may not be switched on yet (marketing without a postal address), or null. */
  cannotSwitchOn: string | null;
}) {
  const { busy, notice, act } = useAct();
  const confirmOn = () =>
    !needsApproval ||
    window.confirm(
      `Switching this on approves template ${currentVersion}: the version in the subject of your latest test email. Only switch it on if you have read that test and are happy with it.`
    );
  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        <button type="button" className="wp-button" disabled={busy !== null || !canTest} onClick={() => act('test', () => sendAutomationTest(job))}>
          {busy === 'test' ? 'Sending…' : 'Send me a test'}
        </button>
        <button type="button" className="wp-button" disabled={busy !== null} onClick={() => act('dry', () => runAutomationJob(job, true))}>
          {busy === 'dry' ? 'Counting…' : 'Dry run (count only)'}
        </button>
        <button
          type="button"
          className="wp-button"
          disabled={busy !== null || !enabled}
          title={enabled ? '' : 'Switch the job on first'}
          onClick={() => window.confirm('Run this job now, for real? It sends to real people.') && act('run', () => runAutomationJob(job, false))}
        >
          {busy === 'run' ? 'Running…' : 'Run now'}
        </button>
        {enabled ? (
          <button type="button" className="wp-button" disabled={busy !== null} onClick={() => act('off', () => switchAutomationJob(job, false))}>
            Switch off
          </button>
        ) : (
          <button
            type="button"
            className="wp-button wp-button-primary"
            disabled={busy !== null || cannotSwitchOn !== null}
            title={cannotSwitchOn ?? ''}
            onClick={() => confirmOn() && act('on', () => switchAutomationJob(job, true))}
          >
            {needsApproval ? `Approve ${currentVersion} and switch on` : 'Switch on'}
          </button>
        )}
      </div>
      {cannotSwitchOn && !enabled && <p className="mb-0 mt-2 text-[12px] text-[#646970]">{cannotSwitchOn}</p>}
      <Notice notice={notice} />
    </div>
  );
}
