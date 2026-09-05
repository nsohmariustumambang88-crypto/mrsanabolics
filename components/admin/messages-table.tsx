'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { deleteMessage } from '@/app/admin/message-actions';
import { runAction } from '@/components/admin/run-action';
import { cn } from '@/lib/utils';

/*
  The log of one-to-one correspondence.

  Everything in here happened somewhere else — in somebody's mail client, or on the phone — and
  was written down afterwards. There is no reply box and no send control, because this build has
  no way to deliver anything and a box that looks like it does is worse than no box.

  The body is shown in full behind a disclosure rather than truncated to a preview. What was
  actually said is the entire value of the record; a first line is not a record of anything.

  Same two correctness behaviours as the other list tables: selection is pruned whenever the
  visible rows change, and delete names what it is removing.
*/

export type MessageRow = {
  id: string;
  contactId: string;
  contactName: string;
  contactEmail: string;
  channel: 'EMAIL' | 'PHONE' | 'OTHER';
  subject: string | null;
  body: string;
  sentAt: string;
  recordedBy: string;
};

const CHANNEL_LABEL: Record<MessageRow['channel'], string> = {
  EMAIL: 'Email',
  PHONE: 'Phone',
  OTHER: 'Other',
};

const stamp = (iso: string) => `${iso.slice(0, 10)} ${iso.slice(11, 16)}`;

export function MessagesTable({ rows }: { rows: MessageRow[] }) {
  const router = useRouter();
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [busy, setBusy] = React.useState(false);
  const [notice, setNotice] = React.useState<{ ok: boolean; text: string } | null>(null);
  const [bulk, setBulk] = React.useState<'' | 'delete'>('');

  const visibleIds = React.useMemo(() => rows.map((r) => r.id), [rows]);

  /* A selection carried across a filter change is how a bulk action hits rows nobody saw. */
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

  const warning = (count: number, who: string) =>
    [
      count === 1
        ? `Delete the message recorded against ${who}?`
        : `Delete ${count} recorded messages?`,
      'The line on the contact’s timeline stays — that history is append-only. This removes the logged copy of what was said.',
      'This cannot be undone.',
    ].join('\n\n');

  async function removeOne(row: MessageRow) {
    if (!window.confirm(warning(1, row.contactName))) return;

    setBusy(true);
    setNotice(null);
    const result = await runAction(() => deleteMessage(row.id));
    setBusy(false);

    if (result.ok) {
      setNotice({ ok: true, text: 'Message deleted.' });
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
      setNotice({ ok: false, text: 'Select at least one message.' });
      return;
    }

    const chosen = rows.filter((r) => selected.has(r.id));
    if (!window.confirm(warning(chosen.length, chosen[0]?.contactName ?? 'this contact'))) return;

    setBusy(true);
    setNotice(null);

    let done = 0;
    let lastError: string | null = null;
    for (const row of chosen) {
      const result = await runAction(() => deleteMessage(row.id));
      if (result.ok) done += 1;
      else lastError = result.error;
    }

    setBusy(false);
    setSelected(new Set());
    setBulk('');

    if (lastError && done === 0) setNotice({ ok: false, text: lastError });
    else if (lastError) {
      setNotice({ ok: false, text: `Deleted ${done} of ${chosen.length}. ${lastError}` });
    } else setNotice({ ok: true, text: `Deleted ${done} message${done === 1 ? '' : 's'}.` });

    router.refresh();
  }

  const bulkBar = (position: 'top' | 'bottom') => (
    <div className="wp-tablenav">
      <div className="wp-tablenav-actions">
        <label className="wp-screen-reader-text" htmlFor={`message-bulk-${position}`}>
          Select bulk action
        </label>
        <select
          id={`message-bulk-${position}`}
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
        {rows.length} {rows.length === 1 ? 'message' : 'messages'}
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
          aria-label="Select all messages"
        />
      </td>
      <th scope="col">Contact</th>
      <th scope="col">Channel</th>
      <th scope="col">Subject</th>
      <th scope="col">Sent</th>
      <th scope="col">Recorded by</th>
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
        <table className="wp-list-table min-w-[58rem]">
          <thead>{headerCells}</thead>

          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="check-column">
                  <input
                    type="checkbox"
                    checked={selected.has(row.id)}
                    onChange={() => toggleOne(row.id)}
                    aria-label={`Select the message to ${row.contactEmail}`}
                  />
                </td>

                <td>
                  <strong>
                    <Link href={`/admin/contacts/${row.contactId}`}>{row.contactName}</Link>
                  </strong>
                  <div className="wp-muted text-[12px]">{row.contactEmail}</div>
                  <div className="row-actions">
                    <span>
                      <Link href={`/admin/contacts/${row.contactId}`}>View contact</Link>
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

                <td>{CHANNEL_LABEL[row.channel]}</td>

                <td>
                  {row.subject ? <span>{row.subject}</span> : <span className="wp-muted">—</span>}
                  {/* The whole of what was said, not a preview of it. */}
                  <details className="mt-1">
                    <summary className="cursor-pointer text-[11px]">what was said</summary>
                    <p className="wp-muted mt-1 max-w-[32rem] whitespace-pre-wrap text-[11px] leading-snug">
                      {row.body}
                    </p>
                  </details>
                </td>

                <td className="wp-num">{stamp(row.sentAt)}</td>

                <td className="wp-muted text-[12px]">{row.recordedBy}</td>
              </tr>
            ))}

            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="py-10 text-center">
                  <p className="m-0 font-semibold">Nothing recorded here yet.</p>
                  <p className="m-0 mt-1 wp-muted">
                    Reply from your own mail client or pick up the phone, then write down what you
                    said with the form above.
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
