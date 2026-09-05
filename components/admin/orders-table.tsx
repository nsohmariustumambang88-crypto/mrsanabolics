'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { OrderStatus } from '@prisma/client';
import { bulkOrderAction, deleteOrder, type OrderBulkAction } from '@/app/admin/order-actions';
import { formatPrice } from '@/lib/format';
import { cn } from '@/lib/utils';
import { runAction } from '@/components/admin/run-action';

/*
  The orders list, in the same WP_List_Table shape as products and contacts.

  It keeps the two behaviours that are correctness rather than style: selection is pruned when
  the visible rows change, so a bulk action can never reach a row that scrolled out of the
  filter, and delete names what it is about to remove.

  There is no payment column, because there is no payment. The Order model carries no such field
  (see prisma/schema.prisma) and a column reading "unpaid" on every row would imply this system
  knows something about money that it does not.
*/

export type OrderRow = {
  id: string;
  reference: string;
  status: OrderStatus;
  contactId: string;
  contactName: string;
  contactEmail: string;
  itemCount: number;
  total: string;
  shipCity: string;
  shipCountry: string;
  createdAt: string;
};

const STATUS_LABEL: Record<OrderStatus, string> = {
  NEW: 'New',
  CONFIRMED: 'Confirmed',
  PACKED: 'Packed',
  SHIPPED: 'Shipped',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
};

const STATUS_COLOUR: Record<OrderStatus, string> = {
  NEW: 'var(--wp-blue)',
  CONFIRMED: 'var(--wp-blue)',
  PACKED: 'var(--wp-text-muted)',
  SHIPPED: 'var(--wp-success)',
  DELIVERED: 'var(--wp-success)',
  CANCELLED: 'var(--wp-error)',
};

const BULK_OPTIONS: { value: OrderBulkAction; label: string }[] = [
  { value: 'status-CONFIRMED', label: 'Mark confirmed' },
  { value: 'status-PACKED', label: 'Mark packed' },
  { value: 'status-SHIPPED', label: 'Mark shipped' },
  { value: 'status-DELIVERED', label: 'Mark delivered' },
  { value: 'status-CANCELLED', label: 'Cancel' },
  { value: 'delete', label: 'Delete permanently' },
];

const day = (iso: string) => iso.slice(0, 10);

export function OrdersTable({ rows }: { rows: OrderRow[] }) {
  const router = useRouter();
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [busy, setBusy] = React.useState(false);
  const [notice, setNotice] = React.useState<{ ok: boolean; text: string } | null>(null);
  const [bulk, setBulk] = React.useState<OrderBulkAction | ''>('');

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
      setNotice({ ok: false, text: 'Select at least one order.' });
      return;
    }

    const count = selected.size;

    if (bulk === 'delete') {
      const ok = window.confirm(
        `Delete ${count} order${count === 1 ? '' : 's'} permanently?\n\n` +
          'Their lines and history go too. The customers are kept. This cannot be undone.'
      );
      if (!ok) return;
    }

    setBusy(true);
    setNotice(null);
    const result = await runAction(() => bulkOrderAction(Array.from(selected), bulk));
    setBusy(false);

    if (result.ok) {
      const label = BULK_OPTIONS.find((o) => o.value === bulk)?.label ?? 'Updated';
      setNotice({
        ok: true,
        text:
          bulk === 'delete'
            ? `Deleted ${count} order${count === 1 ? '' : 's'}.`
            : `${label}: ${count} order${count === 1 ? '' : 's'}.`,
      });
      setSelected(new Set());
      setBulk('');
      router.refresh();
    } else {
      setNotice({ ok: false, text: result.error });
    }
  }

  async function removeOne(row: OrderRow) {
    const ok = window.confirm(
      `Delete order ${row.reference} permanently?\n\n` +
        'Its lines and history go too. The customer is kept. This cannot be undone.'
    );
    if (!ok) return;

    setBusy(true);
    setNotice(null);
    const result = await runAction(() => deleteOrder(row.id));
    setBusy(false);

    if (result.ok) {
      setNotice({ ok: true, text: `Deleted ${row.reference}.` });
      router.refresh();
    } else {
      setNotice({ ok: false, text: result.error });
    }
  }

  const bulkBar = (position: 'top' | 'bottom') => (
    <div className="wp-tablenav">
      <div className="wp-tablenav-actions">
        <label className="wp-screen-reader-text" htmlFor={`order-bulk-${position}`}>
          Select bulk action
        </label>
        <select
          id={`order-bulk-${position}`}
          value={bulk}
          onChange={(e) => setBulk(e.target.value as OrderBulkAction | '')}
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
        {rows.length} {rows.length === 1 ? 'order' : 'orders'}
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
          aria-label="Select all orders"
        />
      </td>
      <th scope="col">Order</th>
      <th scope="col">Customer</th>
      <th scope="col">Status</th>
      <th scope="col">Items</th>
      <th scope="col">Total</th>
      <th scope="col">Destination</th>
      <th scope="col">Placed</th>
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
        <table className="wp-list-table min-w-[62rem]">
          <thead>{headerCells}</thead>

          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="check-column">
                  <input
                    type="checkbox"
                    checked={selected.has(row.id)}
                    onChange={() => toggleOne(row.id)}
                    aria-label={`Select order ${row.reference}`}
                  />
                </td>

                <td>
                  <strong>
                    <Link href={`/admin/orders/${row.id}`}>{row.reference}</Link>
                  </strong>
                  <div className="row-actions">
                    <span>
                      <Link href={`/admin/orders/${row.id}`}>View</Link>
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
                  <Link href={`/admin/contacts/${row.contactId}`}>{row.contactName}</Link>
                  <div className="wp-muted text-[12px]">{row.contactEmail}</div>
                </td>

                <td>
                  <span
                    className="text-[11px] font-semibold uppercase"
                    style={{ color: STATUS_COLOUR[row.status] }}
                  >
                    {STATUS_LABEL[row.status]}
                  </span>
                </td>

                <td className="wp-num">{row.itemCount}</td>

                <td className="wp-num">{formatPrice(Number(row.total))}</td>

                <td className="wp-muted text-[12px]">
                  {row.shipCity}, {row.shipCountry}
                </td>

                <td className="wp-num">{day(row.createdAt)}</td>
              </tr>
            ))}

            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="py-10 text-center">
                  <p className="m-0 font-semibold">No orders here.</p>
                  <p className="m-0 mt-1 wp-muted">
                    Orders are recorded from the admin — the storefront checkout does not place
                    them, because this build takes no payment.
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
