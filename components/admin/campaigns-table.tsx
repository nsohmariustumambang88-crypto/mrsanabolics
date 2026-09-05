'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { deleteCampaign } from '@/app/admin/campaign-actions';
import { runAction } from '@/components/admin/run-action';
import { cn } from '@/lib/utils';

/*
  The campaign list, in WP_List_Table shape.

  It keeps the two behaviours the other tables here call correctness rather than style:

  - Selection is keyed by id and pruned whenever the visible rows change, so a selection carried
    across a filter change can never let "delete selected" hit rows nobody could see.
  - Delete names what it is about to remove, and says explicitly when the thing being removed is
    the record of something that actually went out to people.

  There is no "Send" row action, here or anywhere. This build has no sending infrastructure, and
  a control that looks like one would be a lie the first time somebody pressed it.
*/

export type CampaignRow = {
  id: string;
  name: string;
  subject: string;
  status: 'DRAFT' | 'READY' | 'SENT' | 'CANCELLED';
  segmentLabel: string;
  /** How big that segment is right now. Meaningless for a sent row — see recipientCount. */
  audienceNow: number;
  recipientCount: number;
  sentAt: string | null;
  sentBy: string | null;
  sentVia: string | null;
  updatedAt: string;
};

const STATUS_LABEL: Record<CampaignRow['status'], string> = {
  DRAFT: 'Draft',
  READY: 'Ready',
  SENT: 'Sent',
  CANCELLED: 'Cancelled',
};

const STATUS_COLOUR: Record<CampaignRow['status'], string> = {
  DRAFT: 'var(--wp-text-muted)',
  READY: 'var(--wp-blue)',
  SENT: 'var(--wp-success)',
  CANCELLED: 'var(--wp-error)',
};

const day = (iso: string | null) => (iso ? iso.slice(0, 10) : '—');

export function CampaignsTable({ rows }: { rows: CampaignRow[] }) {
  const router = useRouter();
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [busy, setBusy] = React.useState(false);
  const [notice, setNotice] = React.useState<{ ok: boolean; text: string } | null>(null);
  const [bulk, setBulk] = React.useState<'' | 'delete'>('');

  const visibleIds = React.useMemo(() => rows.map((r) => r.id), [rows]);

  /* Never keep a selection the user cannot see. */
  React.useEffect(() => {
    setSelected((prev) => {
      const next = new Set<string>();
      for (const id of visibleIds) if (prev.has(id)) next.add(id);
      return next.size === prev.size ? prev : next;
    });
  }, [visibleIds]);

  const allSelected = rows.length > 0 && selected.size === rows.length;
  const someSelected = selected.size > 0 && !allSelected;

  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(visibleIds));

  const toggleOne = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  function warning(names: string[], sentCount: number): string {
    const what =
      names.length === 1 ? `“${names[0]}”` : `${names.length} campaigns`;
    const lines = [`Delete ${what} permanently?`];

    if (sentCount > 0) {
      lines.push(
        sentCount === 1
          ? 'One of these was recorded as sent. Deleting it removes the record of a message that really did reach people.'
          : `${sentCount} of these were recorded as sent. Deleting them removes the record of messages that really did reach people.`
      );
    }

    lines.push('This cannot be undone.');
    return lines.join('\n\n');
  }

  async function removeOne(row: CampaignRow) {
    if (!window.confirm(warning([row.name], row.status === 'SENT' ? 1 : 0))) return;

    setBusy(true);
    setNotice(null);
    const result = await runAction(() => deleteCampaign(row.id));
    setBusy(false);

    if (result.ok) {
      setNotice({ ok: true, text: `Deleted “${row.name}”.` });
      router.refresh();
    } else {
      setNotice({ ok: false, text: result.error });
    }
  }

  async function runBulk() {
    if (bulk !== 'delete') {
      setNotice({ ok: false, text: 'Choose a bulk action first.' });
      return;
    }
    if (selected.size === 0) {
      setNotice({ ok: false, text: 'Select at least one campaign.' });
      return;
    }

    const chosen = rows.filter((r) => selected.has(r.id));
    if (!window.confirm(warning(chosen.map((c) => c.name), chosen.filter((c) => c.status === 'SENT').length))) {
      return;
    }

    setBusy(true);
    setNotice(null);

    /* One action per row rather than a bulk endpoint: the set is small and each delete is its
       own single write, so a failure part-way through is reported honestly rather than hidden
       behind an all-or-nothing that this database should not be asked for. */
    let done = 0;
    let lastError: string | null = null;
    for (const row of chosen) {
      const result = await runAction(() => deleteCampaign(row.id));
      if (result.ok) done += 1;
      else lastError = result.error;
    }

    setBusy(false);
    setSelected(new Set());
    setBulk('');

    if (lastError && done === 0) {
      setNotice({ ok: false, text: lastError });
    } else if (lastError) {
      setNotice({ ok: false, text: `Deleted ${done} of ${chosen.length}. ${lastError}` });
    } else {
      setNotice({ ok: true, text: `Deleted ${done} campaign${done === 1 ? '' : 's'}.` });
    }

    router.refresh();
  }

  const bulkBar = (position: 'top' | 'bottom') => (
    <div className="wp-tablenav">
      <div className="wp-tablenav-actions">
        <label className="wp-screen-reader-text" htmlFor={`campaign-bulk-${position}`}>
          Select bulk action
        </label>
        <select
          id={`campaign-bulk-${position}`}
          value={bulk}
          onChange={(e) => setBulk(e.target.value as '' | 'delete')}
          className="wp-select wp-w-auto"
        >
          <option value="">Bulk actions</option>
          <option value="delete">Delete permanently</option>
        </select>

        <button type="button" className="wp-button" onClick={runBulk} disabled={busy}>
          {busy ? 'Working…' : 'Apply'}
        </button>

        {selected.size > 0 && <span className="wp-displaying-num">{selected.size} selected</span>}
      </div>

      <span className="wp-displaying-num">
        {rows.length} {rows.length === 1 ? 'campaign' : 'campaigns'}
      </span>
    </div>
  );

  const headerCells = (
    <tr>
      <td className="check-column">
        <input
          type="checkbox"
          checked={allSelected}
          ref={(el) => {
            if (el) el.indeterminate = someSelected;
          }}
          onChange={toggleAll}
          aria-label="Select all campaigns"
        />
      </td>
      <th scope="col">Campaign</th>
      <th scope="col">Status</th>
      <th scope="col">Audience</th>
      <th scope="col">Sent</th>
      <th scope="col">Last edited</th>
    </tr>
  );

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

      {bulkBar('top')}

      <div className="overflow-x-auto">
        <table className="wp-list-table min-w-[60rem]">
          <thead>{headerCells}</thead>

          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="check-column">
                  <input
                    type="checkbox"
                    checked={selected.has(row.id)}
                    onChange={() => toggleOne(row.id)}
                    aria-label={`Select ${row.name}`}
                  />
                </td>

                <td>
                  <strong>
                    <Link href={`/admin/campaigns/${row.id}`}>{row.name}</Link>
                  </strong>
                  <div className="wp-muted text-[12px]">
                    {row.subject || <em>no subject yet</em>}
                  </div>
                  <div className="row-actions">
                    <span>
                      <Link href={`/admin/campaigns/${row.id}`}>
                        {row.status === 'SENT' ? 'View' : 'Edit'}
                      </Link>
                    </span>
                    <span className="delete">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => removeOne(row)}
                        className="cursor-pointer border-0 bg-transparent p-0 text-[13px] underline-offset-2 hover:underline"
                        style={{ color: 'var(--wp-error)' }}
                      >
                        Delete
                      </button>
                    </span>
                  </div>
                </td>

                <td>
                  <span
                    className="text-[11px] font-semibold uppercase"
                    style={{ color: STATUS_COLOUR[row.status] }}
                  >
                    {STATUS_LABEL[row.status]}
                  </span>
                </td>

                <td>
                  {row.segmentLabel}
                  <div className="wp-muted text-[11px]">
                    {/* A sent row shows the count it was sent to, not today's — the list moves. */}
                    {row.status === 'SENT' ? (
                      <>
                        <span className="wp-num">{row.recipientCount}</span> at the time
                      </>
                    ) : (
                      <>
                        <span className="wp-num">{row.audienceNow}</span> right now
                      </>
                    )}
                  </div>
                </td>

                <td className="wp-num">
                  {row.sentAt ? (
                    <>
                      {day(row.sentAt)}
                      <div className="wp-muted text-[11px]">
                        via {row.sentVia ?? '—'}
                        {row.sentBy && <> · {row.sentBy}</>}
                      </div>
                    </>
                  ) : (
                    '—'
                  )}
                </td>

                <td className="wp-num">{day(row.updatedAt)}</td>
              </tr>
            ))}

            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="py-10 text-center">
                  <p className="m-0 font-semibold">No campaigns here.</p>
                  <p className="m-0 mt-1 wp-muted">
                    Write one with Add New. It is drafted and its audience counted here; sending
                    happens in your mailing platform, and you record it afterwards.
                  </p>
                </td>
              </tr>
            )}
          </tbody>

          {rows.length > 8 && <tfoot>{headerCells}</tfoot>}
        </table>
      </div>

      {bulkBar('bottom')}
    </div>
  );
}
