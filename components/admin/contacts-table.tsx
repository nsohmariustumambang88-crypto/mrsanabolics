'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  bulkContactAction,
  deleteContact,
  type ContactBulkAction,
} from '@/app/admin/crm-actions';
import { cn } from '@/lib/utils';
import { runAction } from '@/components/admin/run-action';

/*
  The contacts list table, in WordPress's WP_List_Table shape: a tablenav strip with bulk
  actions and a count, a checkbox column, and row actions under the name on hover.

  It keeps the two behaviours products-table.tsx calls out as correctness rather than style:

  - Selection is keyed by id and pruned whenever the visible rows change. A selection carried
    across a filter change is how "delete selected" silently hits rows nobody could see — and
    here the rows are people, so the cost of that is somebody's history disappearing.
  - Delete asks first and names what it is deleting, including what goes with it.

  Consent gets its own column rather than being folded into a status badge, because the two
  answer different questions. "Engaged" is a judgement staff made; "may we email them" is a fact
  the person decided, and reading one as the other is how an opted-out address ends up in a send.
*/

export type ContactRow = {
  id: string;
  email: string;
  name: string | null;
  stage: 'LEAD' | 'ENGAGED' | 'QUALIFIED' | 'DORMANT';
  tags: string[];
  firstSource: string;
  consent: 'SUBSCRIBED' | 'UNSUBSCRIBED' | null;
  openEnquiries: number;
  totalEnquiries: number;
  lastActivityAt: string;
};

const STAGE_LABEL: Record<ContactRow['stage'], string> = {
  LEAD: 'Lead',
  ENGAGED: 'Engaged',
  QUALIFIED: 'Qualified',
  DORMANT: 'Dormant',
};

const BULK_OPTIONS: { value: ContactBulkAction; label: string }[] = [
  { value: 'stage-LEAD', label: 'Move to Lead' },
  { value: 'stage-ENGAGED', label: 'Move to Engaged' },
  { value: 'stage-QUALIFIED', label: 'Move to Qualified' },
  { value: 'stage-DORMANT', label: 'Move to Dormant' },
  { value: 'delete', label: 'Delete permanently' },
];

const day = (iso: string | null) => (iso ? iso.slice(0, 10) : '—');

function ConsentCell({ consent }: { consent: ContactRow['consent'] }) {
  if (consent === 'SUBSCRIBED') {
    return (
      <span className="text-[11px] font-semibold uppercase" style={{ color: 'var(--wp-success)' }}>
        May email
      </span>
    );
  }

  if (consent === 'UNSUBSCRIBED') {
    return (
      <span className="text-[11px] font-semibold uppercase" style={{ color: 'var(--wp-error)' }}>
        Opted out
      </span>
    );
  }

  return <span className="wp-muted text-[11px]">No consent on file</span>;
}

export function ContactsTable({ rows }: { rows: ContactRow[] }) {
  const router = useRouter();
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [busy, setBusy] = React.useState(false);
  const [notice, setNotice] = React.useState<{ ok: boolean; text: string } | null>(null);
  const [bulk, setBulk] = React.useState<ContactBulkAction | ''>('');

  const visibleIds = React.useMemo(() => rows.map((r) => r.id), [rows]);

  /*
    Never keep a selection the user cannot see. When the filter or search changes, anything no
    longer on screen is dropped.
  */
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

  /*
    Spelled out rather than summarised as "this cannot be undone". What actually goes is the
    person's messages and their history, and — for anyone still subscribed — their consent is
    ended rather than left dangling on a person who no longer exists.
  */
  function deleteWarning(count: number, subscribedCount: number): string {
    const people = count === 1 ? 'this contact' : `${count} contacts`;
    const lines = [
      `Delete ${people} permanently? Their enquiries, notes and activity go too.`,
    ];

    if (subscribedCount > 0) {
      lines.push(
        subscribedCount === 1
          ? 'One of them still has marketing consent — they will be unsubscribed, and the consent record is kept as evidence of the opt-out.'
          : `${subscribedCount} of them still have marketing consent — they will be unsubscribed, and their consent records are kept as evidence of the opt-out.`
      );
    }

    lines.push('This cannot be undone.');
    return lines.join('\n\n');
  }

  async function runBulk() {
    if (!bulk) {
      setNotice({ ok: false, text: 'Choose a bulk action first.' });
      return;
    }
    if (selected.size === 0) {
      setNotice({ ok: false, text: 'Select at least one contact.' });
      return;
    }

    if (bulk === 'delete') {
      const subscribed = rows.filter(
        (r) => selected.has(r.id) && r.consent === 'SUBSCRIBED'
      ).length;
      if (!window.confirm(deleteWarning(selected.size, subscribed))) return;
    }

    setBusy(true);
    setNotice(null);
    const count = selected.size;
    const result = await runAction(() => bulkContactAction(Array.from(selected), bulk));
    setBusy(false);

    if (result.ok) {
      const label = BULK_OPTIONS.find((o) => o.value === bulk)?.label ?? 'Updated';
      setNotice({
        ok: true,
        text:
          bulk === 'delete'
            ? `Deleted ${count} contact${count === 1 ? '' : 's'}.`
            : `${label}: ${count} contact${count === 1 ? '' : 's'}.`,
      });
      setSelected(new Set());
      setBulk('');
      router.refresh();
    } else {
      setNotice({ ok: false, text: result.error });
    }
  }

  async function removeOne(row: ContactRow) {
    if (!window.confirm(`${row.name ?? row.email}\n\n${deleteWarning(1, row.consent === 'SUBSCRIBED' ? 1 : 0)}`)) {
      return;
    }

    setBusy(true);
    setNotice(null);
    const result = await runAction(() => deleteContact(row.id));
    setBusy(false);

    if (result.ok) {
      setNotice({ ok: true, text: `Deleted ${row.name ?? row.email}.` });
      router.refresh();
    } else {
      setNotice({ ok: false, text: result.error });
    }
  }

  const bulkBar = (position: 'top' | 'bottom') => (
    <div className="wp-tablenav">
      <div className="wp-tablenav-actions">
        <label className="wp-screen-reader-text" htmlFor={`contact-bulk-${position}`}>
          Select bulk action
        </label>
        <select
          id={`contact-bulk-${position}`}
          value={bulk}
          onChange={(e) => setBulk(e.target.value as ContactBulkAction | '')}
          className="wp-select wp-w-auto"
        >
          <option value="">Bulk actions</option>
          {BULK_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        <button type="button" className="wp-button" onClick={runBulk} disabled={busy}>
          {busy ? 'Working…' : 'Apply'}
        </button>

        {selected.size > 0 && <span className="wp-displaying-num">{selected.size} selected</span>}
      </div>

      <span className="wp-displaying-num">
        {rows.length} {rows.length === 1 ? 'contact' : 'contacts'}
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
          aria-label="Select all contacts"
        />
      </td>
      <th scope="col">Contact</th>
      <th scope="col">Stage</th>
      <th scope="col">Marketing</th>
      <th scope="col">Tags</th>
      <th scope="col">Enquiries</th>
      <th scope="col">First seen via</th>
      <th scope="col">Last activity</th>
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
        <table className="wp-list-table min-w-[64rem]">
          <thead>{headerCells}</thead>

          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="check-column">
                  <input
                    type="checkbox"
                    checked={selected.has(row.id)}
                    onChange={() => toggleOne(row.id)}
                    aria-label={`Select ${row.name ?? row.email}`}
                  />
                </td>

                <td>
                  <strong>
                    <Link href={`/admin/contacts/${row.id}`}>{row.name ?? row.email}</Link>
                  </strong>
                  {row.name && <div className="wp-muted text-[12px]">{row.email}</div>}
                  <div className="row-actions">
                    <span>
                      <Link href={`/admin/contacts/${row.id}`}>View</Link>
                    </span>
                    <span>
                      <a href={`mailto:${row.email}`}>Reply</a>
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

                <td>{STAGE_LABEL[row.stage]}</td>

                <td>
                  <ConsentCell consent={row.consent} />
                </td>

                <td className="wp-muted text-[12px]">
                  {row.tags.length ? row.tags.join(', ') : '—'}
                </td>

                <td className="wp-num">
                  {row.totalEnquiries}
                  {row.openEnquiries > 0 && (
                    <span className="wp-bubble ml-1.5">{row.openEnquiries}</span>
                  )}
                </td>

                <td className="wp-muted text-[12px]">{row.firstSource}</td>

                <td className="wp-num">{day(row.lastActivityAt)}</td>
              </tr>
            ))}

            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="py-10 text-center">
                  <p className="m-0 font-semibold">No contacts here.</p>
                  <p className="m-0 mt-1 wp-muted">
                    People arrive on their own when they write through the contact form or give an
                    address to the newsletter. You can also add one by hand with Add New.
                  </p>
                </td>
              </tr>
            )}
          </tbody>

          {/* A long table read from the bottom needs its labels there too. WordPress does this. */}
          {rows.length > 8 && <tfoot>{headerCells}</tfoot>}
        </table>
      </div>

      {bulkBar('bottom')}
    </div>
  );
}
