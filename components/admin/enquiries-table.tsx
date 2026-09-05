'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { EnquiryStatus } from '@prisma/client';
import { bulkDeleteEnquiries, deleteEnquiry } from '@/app/admin/crm-actions';
import { EnquiryStatusPicker } from '@/components/admin/enquiry-status';
import { cn } from '@/lib/utils';
import { runAction } from '@/components/admin/run-action';

/*
  The message queue as a WP_List_Table: bulk actions, a checkbox column, row actions on hover.

  Messages are shown in full rather than truncated to a preview. A support queue where you must
  open each row to learn whether it takes ten seconds or ten minutes is a queue people work in the
  wrong order.

  Deleting is offered for spam and duplicates, not as queue hygiene — "Closed" is what finished
  work looks like, and it keeps the record of who asked what. Deleting a message does not delete
  the person: they still wrote to you, and their timeline keeps the line saying so.

  Selection is pruned when the visible rows change, for the same reason as every other list table
  here: a bulk delete must never reach a row that scrolled out of the filter.
*/

export type EnquiryRow = {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: EnquiryStatus;
  path: string | null;
  createdAt: string;
  handledAt: string | null;
  handledBy: string | null;
  contactId: string;
};

const stamp = (iso: string | null) => (iso ? `${iso.slice(0, 10)} ${iso.slice(11, 16)}` : '—');

export function EnquiriesTable({ rows, emptyHint }: { rows: EnquiryRow[]; emptyHint: string }) {
  const router = useRouter();
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [busy, setBusy] = React.useState(false);
  const [notice, setNotice] = React.useState<{ ok: boolean; text: string } | null>(null);
  const [bulk, setBulk] = React.useState<'' | 'delete'>('');

  const visibleIds = React.useMemo(() => rows.map((r) => r.id), [rows]);

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

  async function runBulk() {
    if (bulk !== 'delete') {
      setNotice({ ok: false, text: 'Choose a bulk action first.' });
      return;
    }
    if (selected.size === 0) {
      setNotice({ ok: false, text: 'Select at least one enquiry.' });
      return;
    }

    const count = selected.size;
    const ok = window.confirm(
      `Delete ${count} message${count === 1 ? '' : 's'} permanently?\n\n` +
        'The people who sent them are kept, and their timelines keep the record that they wrote ' +
        'in. This cannot be undone.'
    );
    if (!ok) return;

    setBusy(true);
    setNotice(null);
    const result = await runAction(() => bulkDeleteEnquiries(Array.from(selected)));
    setBusy(false);

    if (result.ok) {
      setNotice({ ok: true, text: `Deleted ${count} message${count === 1 ? '' : 's'}.` });
      setSelected(new Set());
      setBulk('');
      router.refresh();
    } else {
      setNotice({ ok: false, text: result.error });
    }
  }

  async function removeOne(row: EnquiryRow) {
    const ok = window.confirm(
      `Delete the message “${row.subject}” from ${row.name} permanently?\n\n` +
        'They are kept as a contact, and their timeline keeps the record that they wrote in.'
    );
    if (!ok) return;

    setBusy(true);
    setNotice(null);
    const result = await runAction(() => deleteEnquiry(row.id));
    setBusy(false);

    if (result.ok) {
      setNotice({ ok: true, text: `Deleted the message from ${row.name}.` });
      router.refresh();
    } else {
      setNotice({ ok: false, text: result.error });
    }
  }

  const bulkBar = (position: 'top' | 'bottom') => (
    <div className="wp-tablenav">
      <div className="wp-tablenav-actions">
        <label className="wp-screen-reader-text" htmlFor={`enquiry-bulk-${position}`}>
          Select bulk action
        </label>
        <select
          id={`enquiry-bulk-${position}`}
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
      <th scope="col">From</th>
      <th scope="col">Message</th>
      <th scope="col">Received</th>
      <th scope="col">Status</th>
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
        <table className="wp-list-table min-w-[56rem]">
          <thead>{headerCells}</thead>

          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="check-column align-top">
                  <input
                    type="checkbox"
                    checked={selected.has(row.id)}
                    onChange={() => toggleOne(row.id)}
                    aria-label={`Select the message from ${row.name}`}
                  />
                </td>

                <td className="align-top">
                  <strong>
                    <Link href={`/admin/contacts/${row.contactId}`}>{row.name}</Link>
                  </strong>
                  <div className="wp-muted text-[12px]">{row.email}</div>
                  <div className="row-actions">
                    <span>
                      <a
                        href={`mailto:${row.email}?subject=${encodeURIComponent(`Re: ${row.subject}`)}`}
                      >
                        Reply by email
                      </a>
                    </span>
                    <span>
                      <Link href={`/admin/contacts/${row.contactId}`}>Open contact</Link>
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

                <td className="align-top">
                  <strong className="text-[13px]">{row.subject}</strong>
                  <p className="m-0 mt-1 max-w-[38rem] whitespace-pre-wrap text-[13px] leading-relaxed">
                    {row.message}
                  </p>
                  {row.path && (
                    <p className="wp-muted m-0 mt-1 text-[11px]">sent from {row.path}</p>
                  )}
                </td>

                <td className="wp-num align-top">{stamp(row.createdAt)}</td>

                <td className="align-top">
                  <EnquiryStatusPicker enquiryId={row.id} status={row.status} />
                  {row.handledAt && (
                    <p className="wp-muted m-0 mt-1 text-[11px]">
                      {stamp(row.handledAt)}
                      <br />
                      {row.handledBy}
                    </p>
                  )}
                </td>
              </tr>
            ))}

            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="py-10 text-center">
                  <p className="m-0 font-semibold">Nothing here.</p>
                  <p className="m-0 mt-1 wp-muted">{emptyHint}</p>
                </td>
              </tr>
            )}
          </tbody>

          {rows.length > 6 && <tfoot>{headerCells}</tfoot>}
        </table>
      </div>

      {bulkBar('bottom')}
    </div>
  );
}
