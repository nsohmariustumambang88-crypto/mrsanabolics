'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import type { OrderStatus } from '@prisma/client';
import {
  addOrderNoteAction,
  deleteOrder,
  setOrderStatusAction,
} from '@/app/admin/order-actions';
import { runAction } from '@/components/admin/run-action';

/*
  The writable controls on an order.

  Each saves on its own and reports its own outcome, like the contact screen: these edits are
  independent, and batching them behind one Save means a failure in one silently discards the
  others.

  Forms here use onSubmit and new FormData, never <form action={clientFn}>. That is a React 19
  feature; on React 18 it fails silently — the button runs its busy state and no row is written.
*/

type Notice = { ok: boolean; text: string } | null;

function NoticeLine({ notice }: { notice: Notice }) {
  if (!notice) return null;
  return (
    <div
      className={`wp-notice ${notice.ok ? 'wp-notice-success' : 'wp-notice-error'}`}
      role={notice.ok ? 'status' : 'alert'}
    >
      <p>{notice.text}</p>
    </div>
  );
}

const STATUSES: { value: OrderStatus; label: string }[] = [
  { value: 'NEW', label: 'New' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'PACKED', label: 'Packed' },
  { value: 'SHIPPED', label: 'Shipped' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

export function OrderStatusPicker({
  orderId,
  status,
}: {
  orderId: string;
  status: OrderStatus;
}) {
  const router = useRouter();
  const [value, setValue] = React.useState(status);
  const [busy, setBusy] = React.useState(false);
  const [notice, setNotice] = React.useState<Notice>(null);

  async function change(next: OrderStatus) {
    const previous = value;
    setValue(next);
    setBusy(true);
    const result = await runAction(() => setOrderStatusAction(orderId, next));
    setBusy(false);

    if (result.ok) {
      setNotice({ ok: true, text: 'Status saved.' });
      router.refresh();
    } else {
      /* Snap back: a control showing a status that did not save is a lie. */
      setValue(previous);
      setNotice({ ok: false, text: result.error });
    }
  }

  return (
    <div>
      <NoticeLine notice={notice} />
      <label className="wp-label" htmlFor="order-status">
        Status
      </label>
      <select
        id="order-status"
        className="wp-select"
        value={value}
        disabled={busy}
        onChange={(e) => change(e.target.value as OrderStatus)}
      >
        {STATUSES.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>
      <p className="wp-muted mt-1.5 text-[12px]">
        Where the parcel has got to. Nothing here refers to payment — this build takes none.
      </p>
    </div>
  );
}

export function OrderNoteForm({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [body, setBody] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [notice, setNotice] = React.useState<Notice>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    const result = await runAction(() => addOrderNoteAction(orderId, body));
    setBusy(false);

    if (result.ok) {
      setBody('');
      setNotice({ ok: true, text: 'Note added.' });
      router.refresh();
    } else {
      setNotice({ ok: false, text: result.error });
    }
  }

  return (
    <form onSubmit={onSubmit}>
      <NoticeLine notice={notice} />
      <label className="wp-screen-reader-text" htmlFor="order-note">
        Note
      </label>
      <textarea
        id="order-note"
        className="wp-textarea"
        rows={3}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Carrier reference, packing detail, what was agreed."
      />
      <button
        type="submit"
        className="wp-button wp-button-primary wp-w-auto mt-2"
        disabled={busy || !body.trim()}
      >
        {busy ? 'Adding…' : 'Add note'}
      </button>
      <p className="wp-muted mt-1.5 text-[12px]">Internal. The customer never sees this.</p>
    </form>
  );
}

export function DeleteOrder({ orderId, reference }: { orderId: string; reference: string }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function remove() {
    const ok = window.confirm(
      `Delete order ${reference} permanently?\n\n` +
        'Its lines and history go too. The customer is kept, and their timeline keeps the record ' +
        'that the order existed.\n\nThis cannot be undone.'
    );
    if (!ok) return;

    setBusy(true);
    setError(null);
    const result = await runAction(() => deleteOrder(orderId));

    if (result.ok) {
      router.push('/admin/orders');
      router.refresh();
      return;
    }

    setBusy(false);
    setError(result.error);
  }

  return (
    <div>
      {error && (
        <div className="wp-notice wp-notice-error" role="alert">
          <p>{error}</p>
        </div>
      )}

      <button
        type="button"
        className="wp-button wp-button-danger wp-w-auto"
        onClick={remove}
        disabled={busy}
      >
        {busy ? 'Deleting…' : 'Delete order'}
      </button>

      <p className="wp-muted mt-2 text-[12px]">
        Cancelling is usually right instead — it keeps the record of what was asked for.
      </p>
    </div>
  );
}
