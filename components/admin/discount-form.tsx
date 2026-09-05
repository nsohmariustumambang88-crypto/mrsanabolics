'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import type { DiscountStatus, DiscountType } from '@prisma/client';
import { createDiscount, updateDiscount } from '@/app/admin/discount-actions';
import { cn } from '@/lib/utils';
import { runAction } from '@/components/admin/run-action';

/*
  One form, used by both /admin/discounts/new and /admin/discounts/[id].

  Two screens with two forms is how the create path ends up accepting something the edit path
  refuses — or worse, the other way round. The only difference between the two here is which
  action it calls and what happens afterwards.

  onSubmit + new FormData(event.currentTarget), never <form action={fn}>. This is React 18:
  passing a client function to `action` is a React 19 feature and here it fails SILENTLY — the
  button looks like it worked and no row is written.
*/

export type DiscountFormValues = {
  id: string;
  code: string;
  description: string;
  type: DiscountType;
  value: string;
  status: DiscountStatus;
  minSubtotal: string;
  /** Full ISO instants, or '' for none. */
  startsAt: string;
  endsAt: string;
  usageLimit: string;
  perContactLimit: string;
  categoryId: string;
};

export type CategoryOption = { id: string; name: string };

/*
  Windows are entered and shown in UTC, and the labels say so.

  The obvious alternative — a datetime-local field carrying the administrator's own wall time —
  formats differently on the server than in the browser, so it hydrates with a mismatch, and it
  round-trips through a host in a different timezone as a shifted date. A stated timezone that is
  the same everywhere beats a convenient one that quietly moves.
*/
const toInput = (iso: string) => (iso ? iso.slice(0, 16) : '');

function toInstant(raw: string): string {
  /* datetime-local gives "YYYY-MM-DDTHH:mm", or with seconds in some browsers. */
  const withSeconds = raw.length === 16 ? `${raw}:00` : raw;
  return `${withSeconds}Z`;
}

export function DiscountForm({
  categories,
  discount,
}: {
  categories: CategoryOption[];
  discount?: DiscountFormValues;
}) {
  const router = useRouter();
  const editing = Boolean(discount);

  const [type, setType] = React.useState<DiscountType>(discount?.type ?? 'PERCENTAGE');
  const [busy, setBusy] = React.useState(false);
  const [notice, setNotice] = React.useState<{ ok: boolean; text: string } | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = new FormData(event.currentTarget);

    /* Normalise the two date fields to real instants before they cross the wire. */
    for (const key of ['startsAt', 'endsAt'] as const) {
      const raw = form.get(key);
      if (typeof raw === 'string' && raw.trim()) form.set(key, toInstant(raw.trim()));
      else form.delete(key);
    }

    setBusy(true);
    setNotice(null);

    if (discount) {
      const result = await runAction(() => updateDiscount(discount.id, form));
      setBusy(false);

      if (result.ok) {
        setNotice({ ok: true, text: 'Saved.' });
        router.refresh();
      } else {
        setNotice({ ok: false, text: result.error });
      }
      return;
    }

    const result = await runAction(() => createDiscount(form));
    setBusy(false);

    if (result.ok) {
      router.push(`/admin/discounts/${result.id}`);
      router.refresh();
    } else {
      setNotice({ ok: false, text: result.error });
    }
  }

  const valueHint =
    type === 'PERCENTAGE'
      ? 'Percentage points, 1 to 100.'
      : type === 'FIXED'
        ? 'Money off the basket subtotal. Never more than the basket itself.'
        : 'Not used — free shipping takes its saving off the delivery line.';

  return (
    <form onSubmit={onSubmit} className="max-w-[46rem]">
      {notice && (
        <div
          className={cn('wp-notice', notice.ok ? 'wp-notice-success' : 'wp-notice-error')}
          role={notice.ok ? 'status' : 'alert'}
        >
          <p>{notice.text}</p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="wp-label" htmlFor="code">
            Code <span style={{ color: 'var(--wp-error)' }}>*</span>
          </label>
          <input
            id="code"
            name="code"
            required
            maxLength={64}
            defaultValue={discount?.code ?? ''}
            className="wp-input wp-num"
            placeholder="SPRING24"
            autoCapitalize="characters"
            spellCheck={false}
          />
          <p className="wp-help">
            Stored upper-case with spaces removed, and matched that way at the till — so
            &ldquo;spring 24&rdquo; and &ldquo;SPRING24&rdquo; are the same code, not two.
          </p>
        </div>

        <div>
          <label className="wp-label" htmlFor="status">
            Status
          </label>
          <select
            id="status"
            name="status"
            className="wp-select"
            defaultValue={discount?.status ?? 'ACTIVE'}
          >
            <option value="ACTIVE">Active</option>
            <option value="PAUSED">Paused</option>
            <option value="EXPIRED">Expired</option>
          </select>
          <p className="wp-help">
            A code past the end of its window is refused whatever this says. The window is the
            rule; this is the switch.
          </p>
        </div>
      </div>

      <label className="wp-label mt-4" htmlFor="description">
        What it is for
      </label>
      <input
        id="description"
        name="description"
        defaultValue={discount?.description ?? ''}
        className="wp-input"
        placeholder="Spring newsletter, sent 1 March"
      />
      <p className="wp-help">
        Internal only. In six months this is the only thing that explains why the code exists.
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label className="wp-label" htmlFor="type">
            Kind <span style={{ color: 'var(--wp-error)' }}>*</span>
          </label>
          <select
            id="type"
            name="type"
            className="wp-select"
            value={type}
            onChange={(e) => setType(e.target.value as DiscountType)}
          >
            <option value="PERCENTAGE">Percentage off</option>
            <option value="FIXED">Fixed amount off</option>
            <option value="FREE_SHIPPING">Free shipping</option>
          </select>
        </div>

        <div>
          <label className="wp-label" htmlFor="value">
            Value{' '}
            {type !== 'FREE_SHIPPING' && (
              <span style={{ color: 'var(--wp-error)' }}>*</span>
            )}
          </label>
          <input
            id="value"
            name="value"
            inputMode="decimal"
            /* Disabled rather than hidden: a value box that vanishes leaves people unsure
               whether the number they typed is still stored. Disabled inputs are not submitted,
               and the server records zero for free shipping. */
            disabled={type === 'FREE_SHIPPING'}
            required={type !== 'FREE_SHIPPING'}
            defaultValue={discount?.value ?? ''}
            className="wp-input wp-num"
            placeholder={type === 'PERCENTAGE' ? '20' : '10.00'}
          />
          <p className="wp-help">{valueHint}</p>
        </div>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label className="wp-label" htmlFor="minSubtotal">
            Minimum basket
          </label>
          <input
            id="minSubtotal"
            name="minSubtotal"
            inputMode="decimal"
            defaultValue={discount?.minSubtotal ?? ''}
            className="wp-input wp-num"
            placeholder="Leave blank for none"
          />
          <p className="wp-help">Measured against the subtotal, before delivery.</p>
        </div>

        <div>
          <label className="wp-label" htmlFor="categoryId">
            Limited to a category
          </label>
          <select
            id="categoryId"
            name="categoryId"
            className="wp-select"
            defaultValue={discount?.categoryId ?? ''}
          >
            <option value="">The whole catalogue</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <p className="wp-help">
            Recorded on the code and handed to whatever applies it, which is the only thing that
            can see which lines are in the basket.
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label className="wp-label" htmlFor="startsAt">
            Starts (UTC)
          </label>
          <input
            id="startsAt"
            name="startsAt"
            type="datetime-local"
            defaultValue={toInput(discount?.startsAt ?? '')}
            className="wp-input"
          />
          <p className="wp-help">Blank means it is live as soon as it is active.</p>
        </div>

        <div>
          <label className="wp-label" htmlFor="endsAt">
            Ends (UTC)
          </label>
          <input
            id="endsAt"
            name="endsAt"
            type="datetime-local"
            defaultValue={toInput(discount?.endsAt ?? '')}
            className="wp-input"
          />
          <p className="wp-help">Blank means it runs until somebody stops it.</p>
        </div>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label className="wp-label" htmlFor="usageLimit">
            Total uses allowed
          </label>
          <input
            id="usageLimit"
            name="usageLimit"
            inputMode="numeric"
            defaultValue={discount?.usageLimit ?? ''}
            className="wp-input wp-num"
            placeholder="Leave blank for unlimited"
          />
        </div>

        <div>
          <label className="wp-label" htmlFor="perContactLimit">
            Uses allowed per customer
          </label>
          <input
            id="perContactLimit"
            name="perContactLimit"
            inputMode="numeric"
            defaultValue={discount?.perContactLimit ?? ''}
            className="wp-input wp-num"
            placeholder="Leave blank for unlimited"
          />
          <p className="wp-help">
            Counted against the contact on the order. The public checker cannot enforce it —
            nobody is signed in there — so it is applied when the order is recorded.
          </p>
        </div>
      </div>

      <button
        type="submit"
        className={cn('wp-button wp-button-primary wp-w-auto mt-6')}
        disabled={busy}
      >
        {busy ? 'Saving…' : editing ? 'Save changes' : 'Add code'}
      </button>
    </form>
  );
}
