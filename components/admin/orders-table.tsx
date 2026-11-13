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
  The orders list, in the same WP_List_Table shape as products and contacts — but every row is
  the whole order, so nobody has to open each one to pack it (the owner's request, November
  2026): who, where to, what, how much, how it is being paid, and the notes.

  It keeps the two behaviours that are correctness rather than style: selection is pruned when
  the visible rows change, so a bulk action can never reach a row that scrolled out of the
  filter, and delete names what it is about to remove.

  From 783px it is a table; below that each order is a card (the cells stack, each with its
  column name), the same switch wp-admin makes at the same width. The styles are the
  `.wp-orders-table` block in app/admin/wp-admin.css.

  Payment is shown as the method the customer chose and, for Cash App, whether a screenshot came
  in. Neither is a statement that money arrived: the order model has no such field.
*/

export type OrderRowItem = {
  id: string;
  name: string;
  quantity: number;
  unitPrice: string;
  lineTotal: string;
};

export type OrderRow = {
  id: string;
  reference: string;
  status: OrderStatus;
  /** "YYYY-MM-DD HH:MM", UTC, as on the order screen. */
  placedAt: string;
  contactId: string;
  contactName: string;
  contactEmail: string;
  phone: string | null;
  /** Name and street lines, empty parts already dropped (lib/orders/address.ts). */
  addressLines: string[];
  country: string;
  items: OrderRowItem[];
  subtotal: string;
  discountCode: string | null;
  discountTotal: string;
  shippingMethod: string | null;
  shipping: string;
  total: string;
  /** The method the customer chose at checkout; null for orders staff typed in. */
  paymentMethod: string | null;
  isCashApp: boolean;
  /** Cash App screenshots the customer uploaded. */
  proofCount: number;
  notes: string | null;
};

export type OrdersPager = {
  page: number;
  pages: number;
  /** Orders matching the tab and the search, across every page. */
  total: number;
  first: string | null;
  prev: string | null;
  next: string | null;
  last: string | null;
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

const money = (value: string) => formatPrice(Number(value));

/* A number a phone can dial: digits and a leading plus only. */
const telHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, '')}`;

export function OrdersTable({ rows, pager }: { rows: OrderRow[]; pager: OrdersPager }) {
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

  const pagination = (
    <span className="wp-pagination">
      <span className="wp-displaying-num">
        {pager.total} {pager.total === 1 ? 'order' : 'orders'}
      </span>
      {pager.pages > 1 && (
        <span className="wp-pagination-links">
          <PageLink href={pager.first} label="First page" text="«" />
          <PageLink href={pager.prev} label="Previous page" text="‹" />
          <span className="wp-displaying-num">
            {pager.page} of {pager.pages}
          </span>
          <PageLink href={pager.next} label="Next page" text="›" />
          <PageLink href={pager.last} label="Last page" text="»" />
        </span>
      )}
    </span>
  );

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

      {pagination}
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
          aria-label="Select all orders on this page"
        />
      </td>
      <th scope="col" className="wp-col-order">Order</th>
      <th scope="col" className="wp-col-customer">Customer</th>
      <th scope="col" className="wp-col-address">Deliver to</th>
      <th scope="col" className="wp-col-items">Items</th>
      <th scope="col" className="wp-col-money">Totals</th>
      <th scope="col" className="wp-col-payment">Payment and notes</th>
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

      <div className="wp-orders-scroll">
        <table className="wp-list-table wp-orders-table">
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

                {/* The card's heading on a phone, so it carries no column label. */}
                <td className="wp-col-order">
                  <strong className="wp-order-ref">
                    <Link href={`/admin/orders/${row.id}`}>{row.reference}</Link>
                  </strong>
                  <div className="wp-num">{row.placedAt}</div>
                  <div
                    className="wp-order-status"
                    style={{ color: STATUS_COLOUR[row.status] }}
                  >
                    {STATUS_LABEL[row.status]}
                  </div>
                  <div className="row-actions">
                    <span>
                      <Link href={`/admin/orders/${row.id}`}>Open order</Link>
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

                <td className="wp-col-customer" data-colname="Customer">
                  <Link href={`/admin/contacts/${row.contactId}`}>{row.contactName}</Link>
                  <div>
                    <a href={`mailto:${row.contactEmail}`}>{row.contactEmail}</a>
                  </div>
                  {row.phone ? (
                    <div>
                      <a href={telHref(row.phone)}>{row.phone}</a>
                    </div>
                  ) : (
                    <div className="wp-muted">No phone</div>
                  )}
                </td>

                <td className="wp-col-address" data-colname="Deliver to">
                  {row.addressLines.length === 0 && !row.country.trim() ? (
                    <span className="wp-muted">No address recorded</span>
                  ) : (
                    <>
                      <address className="not-italic">
                        {row.addressLines.map((line, i) => (
                          <React.Fragment key={i}>
                            {i > 0 && <br />}
                            {line}
                          </React.Fragment>
                        ))}
                      </address>
                      {row.country.trim() && <div className="wp-order-country">{row.country}</div>}
                    </>
                  )}
                </td>

                <td className="wp-col-items" data-colname="Items">
                  {row.items.length === 0 ? (
                    <span className="wp-muted">No lines recorded</span>
                  ) : (
                    <ul className="wp-order-lines">
                      {row.items.map((item) => (
                        <li key={item.id}>
                          {item.name}{' '}
                          <span className="wp-muted wp-num">
                            × {item.quantity} at {money(item.unitPrice)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </td>

                <td className="wp-col-money" data-colname="Totals">
                  <dl className="wp-order-money">
                    <div>
                      <dt>Subtotal</dt>
                      <dd>{money(row.subtotal)}</dd>
                    </div>
                    {(row.discountCode || Number(row.discountTotal) > 0) && (
                      <div>
                        <dt>
                          Discount
                          {row.discountCode && (
                            <span className="wp-order-sub">{row.discountCode}</span>
                          )}
                        </dt>
                        <dd>−{money(row.discountTotal)}</dd>
                      </div>
                    )}
                    <div>
                      <dt>
                        Shipping
                        {row.shippingMethod && (
                          <span className="wp-order-sub">{row.shippingMethod}</span>
                        )}
                      </dt>
                      <dd>{money(row.shipping)}</dd>
                    </div>
                    <div className="is-total">
                      <dt>Total</dt>
                      <dd>{money(row.total)}</dd>
                    </div>
                  </dl>
                </td>

                <td className="wp-col-payment" data-colname="Payment and notes">
                  <div>
                    {row.paymentMethod ?? <span className="wp-muted">Not recorded</span>}
                  </div>
                  {(row.isCashApp || row.proofCount > 0) && (
                    <div
                      className="wp-order-proof"
                      style={{
                        color: row.proofCount > 0 ? 'var(--wp-success)' : 'var(--wp-text-muted)',
                      }}
                    >
                      {row.proofCount > 0
                        ? `Cash App screenshot uploaded${row.proofCount > 1 ? ` (${row.proofCount})` : ''}`
                        : 'No Cash App screenshot yet'}
                    </div>
                  )}
                  {row.notes && <p className="wp-order-notes">{row.notes}</p>}
                </td>
              </tr>
            ))}

            {rows.length === 0 && (
              <tr className="wp-orders-empty">
                <td colSpan={7} className="py-10 text-center">
                  <p className="m-0 font-semibold">No orders here.</p>
                  <p className="m-0 mt-1 wp-muted">
                    Try another tab, or clear the search.
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

function PageLink({ href, label, text }: { href: string | null; label: string; text: string }) {
  if (!href) {
    return (
      <span className="wp-button wp-page-button" aria-hidden="true" data-disabled="true">
        {text}
      </span>
    );
  }
  return (
    <Link href={href} className="wp-button wp-page-button" aria-label={label}>
      {text}
    </Link>
  );
}
