'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { purgeOldPageViews } from '@/app/admin/analytics-actions';
import { runAction } from '@/components/admin/run-action';
import { cn } from '@/lib/utils';

/*
  "Delete data older than N days."

  N is not a field here. It is the `analytics_retention_days` setting, shown so the person
  pressing the button knows what they are about to enforce, and changed on the Settings screen.
  A free-typed depth in this control would let the retention period the site states differ from
  the retention period it keeps, and the stated one is the promise.

  Nothing here batches or confirms in a modal: the confirm names the cutoff date, because "older
  than 90 days" is arithmetic somebody should not have to do while their finger is on a delete
  button.
*/

export function AnalyticsPurge({ retentionDays }: { retentionDays: number }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [notice, setNotice] = React.useState<{ ok: boolean; text: string } | null>(null);

  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  async function purge() {
    const message = [
      `Delete every page view recorded before ${cutoff}?`,
      'Visitor rows and their running view counts are kept, so the totals stay correct — only the individual views go.',
      'This cannot be undone.',
    ].join('\n\n');

    if (!window.confirm(message)) return;

    setBusy(true);
    setNotice(null);
    const result = await runAction(() => purgeOldPageViews());
    setBusy(false);

    if (result.ok) {
      const deleted = 'deleted' in result ? result.deleted : 0;
      setNotice({
        ok: true,
        text:
          deleted === 0
            ? `Nothing to delete — no page views are older than ${retentionDays} days.`
            : `Deleted ${deleted} page view${deleted === 1 ? '' : 's'} recorded before ${cutoff}.`,
      });
      router.refresh();
    } else {
      setNotice({ ok: false, text: result.error });
    }
  }

  return (
    <div>
      {notice && (
        <div
          className={cn('wp-notice', notice.ok ? 'wp-notice-success' : 'wp-notice-error')}
          role={notice.ok ? 'status' : 'alert'}
        >
          <p>{notice.text}</p>
        </div>
      )}

      <p className="wp-help mt-0">
        Retention is set to <strong>{retentionDays} days</strong>. Running this removes every
        page view recorded before <span className="wp-num">{cutoff}</span>. Change the period
        under Settings &rarr; Privacy.
      </p>

      <button type="button" className="wp-button" onClick={purge} disabled={busy}>
        {busy ? 'Deleting…' : `Delete data older than ${retentionDays} days`}
      </button>
    </div>
  );
}
