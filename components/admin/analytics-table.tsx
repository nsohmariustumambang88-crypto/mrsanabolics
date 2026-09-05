'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { deleteVisitor, deleteVisitors } from '@/app/admin/analytics-actions';
import { runAction } from '@/components/admin/run-action';
import { cn } from '@/lib/utils';

/*
  The visitor list table, in WP_List_Table shape.

  The Visitor column shows a token prefix, not a name and not a full token. That is the whole
  identity model of this feature made visible: a row here is a browser that has been to the
  site, and the interface should not imply it knows more than that.

  The Identity column is the one exception, and it is masked. A visitor becomes identified only
  when they hand over an address themselves — through the newsletter, an enquiry, an order — and
  even then the analytics screen shows only enough to recognise somebody you already know. The
  full address lives on the contact record, one click away, where looking it up is a deliberate
  act rather than something you do by scrolling past a traffic report.

  It keeps the two list-table behaviours this build treats as correctness rather than style:
  selection is pruned whenever the visible rows change, so "delete selected" can never reach a
  row a filter has hidden; and delete names what it is about to remove before it removes it.
*/

export type VisitorRow = {
  id: string;
  token: string;
  shortToken: string;
  views: number;
  lastPath: string | null;
  source: string;
  country: string | null;
  firstSeenAt: string;
  lastSeenAt: string;
  /** Already masked on the server. This component never sees a full address. */
  identity: string | null;
  contactId: string | null;
};

const stamp = (iso: string) => `${iso.slice(0, 10)} ${iso.slice(11, 16)}`;

export function AnalyticsTable({ rows }: { rows: VisitorRow[] }) {
  const router = useRouter();
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [busy, setBusy] = React.useState(false);
  const [notice, setNotice] = React.useState<{ ok: boolean; text: string } | null>(null);

  const visibleIds = React.useMemo(() => rows.map((r) => r.id), [rows]);

  /* Never keep a selection the person cannot see. A tab or search change drops anything that
     has left the screen. */
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

  /* Spelled out rather than "are you sure". What actually goes is the page-view history; what
     stays is the search terms, unlinked — and someone deciding whether to press this should
     know both. */
  function warning(count: number): string {
    const who = count === 1 ? 'this visitor' : `these ${count} visitors`;
    return [
      `Delete ${who} permanently? Every page view recorded against ${count === 1 ? 'them' : 'them'} goes too.`,
      'Anything they searched for is kept, but no longer linked to them.',
      'This cannot be undone.',
    ].join('\n\n');
  }

  async function removeSelected() {
    if (selected.size === 0) {
      setNotice({ ok: false, text: 'Select at least one visitor.' });
      return;
    }
    if (!window.confirm(warning(selected.size))) return;

    setBusy(true);
    setNotice(null);
    const count = selected.size;
    const result = await runAction(() => deleteVisitors(Array.from(selected)));
    setBusy(false);

    if (result.ok) {
      setNotice({ ok: true, text: `Deleted ${count} visitor${count === 1 ? '' : 's'}.` });
      setSelected(new Set());
      router.refresh();
    } else {
      setNotice({ ok: false, text: result.error });
    }
  }

  async function removeOne(row: VisitorRow) {
    if (!window.confirm(`Visitor ${row.shortToken}\n\n${warning(1)}`)) return;

    setBusy(true);
    setNotice(null);
    const result = await runAction(() => deleteVisitor(row.id));
    setBusy(false);

    if (result.ok) {
      setNotice({ ok: true, text: `Deleted visitor ${row.shortToken}.` });
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

      <div className="wp-tablenav">
        <div className="wp-tablenav-actions">
          <button
            type="button"
            className="wp-button wp-button-danger"
            onClick={removeSelected}
            disabled={busy || selected.size === 0}
          >
            {busy ? 'Working…' : 'Delete selected'}
          </button>
          {selected.size > 0 && (
            <span className="wp-displaying-num">{selected.size} selected</span>
          )}
        </div>

        <span className="wp-displaying-num">
          {rows.length} {rows.length === 1 ? 'visitor' : 'visitors'}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="wp-list-table min-w-[68rem]">
          <thead>
            <tr>
              <td className="check-column">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someSelected;
                  }}
                  onChange={toggleAll}
                  aria-label="Select all visitors"
                />
              </td>
              <th scope="col">Visitor</th>
              <th scope="col">Views</th>
              <th scope="col">Last page</th>
              <th scope="col">Source</th>
              <th scope="col">Country</th>
              <th scope="col">First seen</th>
              <th scope="col">Last seen</th>
              <th scope="col">Identity</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="check-column">
                  <input
                    type="checkbox"
                    checked={selected.has(row.id)}
                    onChange={() => toggleOne(row.id)}
                    aria-label={`Select visitor ${row.shortToken}`}
                  />
                </td>

                <td>
                  <strong>
                    <Link href={`/admin/analytics/${row.id}`} className="wp-num">
                      {row.shortToken}
                    </Link>
                  </strong>
                  <div className="row-actions">
                    <span>
                      <Link href={`/admin/analytics/${row.id}`}>View</Link>
                    </span>
                    {row.contactId && (
                      <span>
                        <Link href={`/admin/contacts/${row.contactId}`}>Contact</Link>
                      </span>
                    )}
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

                <td className="wp-num">{row.views}</td>

                <td className="wp-muted text-[12px]">
                  {row.lastPath ? (
                    <a href={row.lastPath} target="_blank" rel="noreferrer">
                      {row.lastPath}
                    </a>
                  ) : (
                    '—'
                  )}
                </td>

                <td className="wp-muted text-[12px]">{row.source}</td>

                <td className="wp-num">{row.country ?? '—'}</td>

                <td className="wp-num text-[12px]">{stamp(row.firstSeenAt)}</td>

                <td className="wp-num text-[12px]">{stamp(row.lastSeenAt)}</td>

                <td className="text-[12px]">
                  {row.identity && row.contactId ? (
                    <Link href={`/admin/contacts/${row.contactId}`}>{row.identity}</Link>
                  ) : (
                    <span className="wp-muted">—</span>
                  )}
                </td>
              </tr>
            ))}

            {rows.length === 0 && (
              <tr>
                <td colSpan={9} className="py-10 text-center">
                  <p className="m-0 font-semibold">No visits recorded.</p>
                  <p className="m-0 mt-1 wp-muted">
                    Views arrive once someone loads a storefront page. Admin screens are never
                    counted, and recording can be switched off entirely under Settings &rarr;
                    Privacy.
                  </p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
