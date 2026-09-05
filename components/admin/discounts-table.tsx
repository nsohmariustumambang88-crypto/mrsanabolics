'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { DiscountStatus, DiscountType } from '@prisma/client';
import {
  bulkDiscountAction,
  deleteDiscount,
  setDiscountStatus,
  type DiscountBulkAction,
} from '@/app/admin/discount-actions';
import { formatPrice } from '@/lib/format';
import { cn } from '@/lib/utils';
import { runAction } from '@/components/admin/run-action';

/*
  The discount list, in the same WP_List_Table shape as products, orders and contacts.

  It keeps the two behaviours those tables call correctness rather than style: selection is
  pruned when the visible rows change, so a bulk action can never reach a row that scrolled out
  of the filter, and delete names the code it is about to remove.

  The "Used" column shows the count against the limit rather than a percentage, because the
  question anyone actually has is "how many are left".
*/

export type DiscountRow = {
  id: string;
  code: string;
  description: string | null;
  type: DiscountType;
  /** Decimal as a string — Decimals do not cross the RSC boundary. */
  value: string;
  status: DiscountStatus;
  usageCount: number;
  usageLimit: number | null;
  startsAt: string | null;
  endsAt: string | null;
};

const STATUS_LABEL: Record<DiscountStatus, string> = {
  ACTIVE: 'Active',
  PAUSED: 'Paused',
  EXPIRED: 'Expired',
};

const STATUS_COLOUR: Record<DiscountStatus, string> = {
  ACTIVE: 'var(--wp-success)',
  PAUSED: 'var(--wp-warning)',
  EXPIRED: 'var(--wp-text-muted)',
};

const TYPE_LABEL: Record<DiscountType, string> = {
  PERCENTAGE: 'Percentage',
  FIXED: 'Fixed amount',
  FREE_SHIPPING: 'Free shipping',
};

const BULK_OPTIONS: { value: DiscountBulkAction; label: string }[] = [
  { value: 'pause', label: 'Pause' },
  { value: 'resume', label: 'Resume' },
  { value: 'delete', label: 'Delete permanently' },
];

const day = (iso: string | null) => (iso ? iso.slice(0, 10) : null);

function valueLabel(row: DiscountRow): string {
  switch (row.type) {
    case 'PERCENTAGE':
      /* Trailing zeros off: "20%" reads as a discount, "20.00%" reads as an accountant. */
      return `${Number(row.value)}%`;
    case 'FIXED':
      return formatPrice(Number(row.value));
    case 'FREE_SHIPPING':
      return '—';
  }
}

function windowLabel(row: DiscountRow): string {
  const from = day(row.startsAt);
  const to = day(row.endsAt);
  if (!from && !to) return 'Always';
  if (from && !to) return `From ${from}`;
  if (!from && to) return `Until ${to}`;
  return `${from} – ${to}`;
}

export function DiscountsTable({ rows }: { rows: DiscountRow[] }) {
  const router = useRouter();
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [busy, setBusy] = React.useState(false);
  const [notice, setNotice] = React.useState<{ ok: boolean; text: string } | null>(null);
  const [bulk, setBulk] = React.useState<DiscountBulkAction | ''>('');

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
    if (!bulk) {
      setNotice({ ok: false, text: 'Choose a bulk action first.' });
      return;
    }
    if (selected.size === 0) {
      setNotice({ ok: false, text: 'Select at least one code.' });
      return;
    }

    const count = selected.size;

    if (bulk === 'delete') {
      const ok = window.confirm(
        `Delete ${count} discount code${count === 1 ? '' : 's'} permanently?\n\n` +
          'Their redemption history goes too. Orders keep the code and amount they were given. ' +
          'This cannot be undone.'
      );
      if (!ok) return;
    }

    setBusy(true);
    setNotice(null);
    const result = await runAction(() => bulkDiscountAction(Array.from(selected), bulk));
    setBusy(false);

    if (result.ok) {
      setNotice({
        ok: true,
        text: result.message ?? `${count} updated.`,
      });
      setSelected(new Set());
      setBulk('');
      router.refresh();
    } else {
      setNotice({ ok: false, text: result.error });
    }
  }

  async function changeStatus(row: DiscountRow, status: DiscountStatus) {
    setBusy(true);
    setNotice(null);
    const result = await runAction(() => setDiscountStatus(row.id, status));
    setBusy(false);

    if (result.ok) {
      setNotice({
        ok: true,
        text: `${row.code} is now ${STATUS_LABEL[status].toLowerCase()}.`,
      });
      router.refresh();
    } else {
      setNotice({ ok: false, text: result.error });
    }
  }

  async function removeOne(row: DiscountRow) {
    const ok = window.confirm(
      `Delete ${row.code} permanently?\n\n` +
        'Its redemption history goes too. Orders keep the code and amount they were given. ' +
        'This cannot be undone.'
    );
    if (!ok) return;

    setBusy(true);
    setNotice(null);
    const result = await runAction(() => deleteDiscount(row.id));
    setBusy(false);

    if (result.ok) {
      setNotice({ ok: true, text: `Deleted ${row.code}.` });
      router.refresh();
    } else {
      setNotice({ ok: false, text: result.error });
    }
  }

  const bulkBar = (position: 'top' | 'bottom') => (
    <div className="wp-tablenav">
      <div className="wp-tablenav-actions">
        <label className="wp-screen-reader-text" htmlFor={`discount-bulk-${position}`}>
          Select bulk action
        </label>
        <select
          id={`discount-bulk-${position}`}
          value={bulk}
          onChange={(e) => setBulk(e.target.value as DiscountBulkAction | '')}
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
        {rows.length} {rows.length === 1 ? 'code' : 'codes'}
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
          aria-label="Select all discount codes"
        />
      </td>
      <th scope="col">Code</th>
      <th scope="col">Type</th>
      <th scope="col">Value</th>
      <th scope="col">Used</th>
      <th scope="col">Status</th>
      <th scope="col">Window</th>
    </tr>
  );

  const now = Date.now();

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
            {rows.map((row) => {
              const scheduled =
                row.status === 'ACTIVE' &&
                row.startsAt !== null &&
                new Date(row.startsAt).getTime() > now;

              const exhausted =
                row.usageLimit !== null && row.usageCount >= row.usageLimit;

              return (
                <tr key={row.id}>
                  <td className="check-column">
                    <input
                      type="checkbox"
                      checked={selected.has(row.id)}
                      onChange={() => toggleOne(row.id)}
                      aria-label={`Select ${row.code}`}
                    />
                  </td>

                  <td>
                    <strong>
                      <Link href={`/admin/discounts/${row.id}`} className="row-title wp-num">
                        {row.code}
                      </Link>
                    </strong>
                    {row.description && (
                      <div className="wp-muted text-[12px]">{row.description}</div>
                    )}

                    <div className="row-actions">
                      <span>
                        <Link href={`/admin/discounts/${row.id}`}>Edit</Link>
                      </span>

                      {row.status === 'ACTIVE' ? (
                        <span>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => changeStatus(row, 'PAUSED')}
                            className="cursor-pointer border-0 bg-transparent p-0 text-[13px] underline-offset-2 hover:underline"
                            style={{ color: 'var(--wp-blue)' }}
                          >
                            Pause
                          </button>
                        </span>
                      ) : (
                        <span>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => changeStatus(row, 'ACTIVE')}
                            className="cursor-pointer border-0 bg-transparent p-0 text-[13px] underline-offset-2 hover:underline"
                            style={{ color: 'var(--wp-blue)' }}
                          >
                            Resume
                          </button>
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

                  <td className="wp-muted">{TYPE_LABEL[row.type]}</td>

                  <td className="wp-num">{valueLabel(row)}</td>

                  <td className="wp-num">
                    {row.usageCount}
                    {row.usageLimit === null ? (
                      <span className="wp-muted"> / ∞</span>
                    ) : (
                      <span style={{ color: exhausted ? 'var(--wp-error)' : undefined }}>
                        {' '}
                        / {row.usageLimit}
                      </span>
                    )}
                  </td>

                  <td>
                    <span
                      className="text-[11px] font-semibold uppercase"
                      style={{ color: STATUS_COLOUR[row.status] }}
                    >
                      {STATUS_LABEL[row.status]}
                    </span>
                    {/* Active but not yet open is a real and easily-missed state. */}
                    {scheduled && (
                      <div className="wp-muted text-[11px]">not started yet</div>
                    )}
                    {row.status === 'ACTIVE' && exhausted && (
                      <div className="text-[11px]" style={{ color: 'var(--wp-error)' }}>
                        limit used up
                      </div>
                    )}
                  </td>

                  <td className="wp-num text-[12px]">{windowLabel(row)}</td>
                </tr>
              );
            })}

            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="py-10 text-center">
                  <p className="m-0 font-semibold">No discount codes here.</p>
                  <p className="m-0 mt-1 wp-muted">
                    <Link href="/admin/discounts">Clear the filters</Link> or{' '}
                    <Link href="/admin/discounts/new">add a code</Link>.
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
