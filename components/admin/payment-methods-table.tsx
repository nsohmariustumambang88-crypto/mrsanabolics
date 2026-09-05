'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  setPaymentMethodEnabled,
  updatePaymentMethodNotice,
} from '@/app/admin/settings-actions';
import { runAction } from '@/components/admin/run-action';
import { cn } from '@/lib/utils';

/*
  The payment methods list.

  Two controls per row and no others: whether the method is LISTED at checkout, and the
  sentence shown inside its panel. There is no field for a wallet address, a $Cashtag, a
  merchant id or an API key, and the model has no column for one — see the notice on the page.

  The toggle writes immediately, because a checkbox that needs a separate Save is the control
  people forget to press. The notice does not: it is a sentence somebody is drafting, and
  saving it on every keystroke would write half-typed warnings to the storefront.

  On a failed toggle the checkbox snaps back to what is actually stored. Leaving it showing the
  attempted state would say a method is off at checkout when it is still being offered.
*/

export type PaymentMethodRow = {
  id: string;
  key: string;
  label: string;
  notice: string;
  enabled: boolean;
  connected: boolean;
};

export function PaymentMethodsTable({ rows }: { rows: PaymentMethodRow[] }) {
  const router = useRouter();

  const [enabled, setEnabled] = React.useState<Record<string, boolean>>(() =>
    Object.fromEntries(rows.map((r) => [r.id, r.enabled]))
  );
  const [drafts, setDrafts] = React.useState<Record<string, string>>(() =>
    Object.fromEntries(rows.map((r) => [r.id, r.notice]))
  );
  const [busy, setBusy] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<{ ok: boolean; text: string } | null>(null);

  /*
    The server is the authority. When a save or a revalidation brings new rows down, adopt them —
    otherwise this component keeps showing a stale draft after another administrator has changed
    the same sentence.
  */
  React.useEffect(() => {
    setEnabled(Object.fromEntries(rows.map((r) => [r.id, r.enabled])));
    setDrafts(Object.fromEntries(rows.map((r) => [r.id, r.notice])));
  }, [rows]);

  async function toggle(row: PaymentMethodRow, next: boolean) {
    const previous = enabled[row.id];
    setEnabled((s) => ({ ...s, [row.id]: next }));
    setBusy(row.id);
    setNotice(null);

    const result = await runAction(() => setPaymentMethodEnabled(row.id, next));
    setBusy(null);

    if (result.ok) {
      setNotice({
        ok: true,
        text: next
          ? `${row.label} is now listed at checkout.`
          : `${row.label} is no longer listed at checkout.`,
      });
      router.refresh();
    } else {
      setEnabled((s) => ({ ...s, [row.id]: previous }));
      setNotice({ ok: false, text: result.error });
    }
  }

  async function saveNotice(row: PaymentMethodRow) {
    setBusy(row.id);
    setNotice(null);

    const result = await runAction(() =>
      updatePaymentMethodNotice(row.id, drafts[row.id] ?? '')
    );
    setBusy(null);

    if (result.ok) {
      setNotice({ ok: true, text: `Saved the notice shown for ${row.label}.` });
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

      <div className="overflow-x-auto">
        <table className="wp-list-table min-w-[48rem]">
          <thead>
            <tr>
              <th scope="col" className="w-[14rem]">
                Method
              </th>
              <th scope="col" className="w-[9rem]">
                Listed at checkout
              </th>
              <th scope="col">Notice shown in its panel</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((row) => {
              const dirty = (drafts[row.id] ?? '') !== row.notice;
              const rowBusy = busy === row.id;

              return (
                <tr key={row.id}>
                  <td>
                    <strong>{row.label}</strong>
                    <div className="wp-muted mt-0.5 text-[12px]">
                      <span className="wp-num">{row.key}</span>
                      <br />
                      {row.connected ? 'Rail connected' : 'No rail connected'}
                    </div>
                  </td>

                  <td>
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={enabled[row.id] ?? false}
                        disabled={rowBusy}
                        onChange={(e) => toggle(row, e.target.checked)}
                      />
                      <span className="text-[13px]">
                        {enabled[row.id] ? 'Listed' : 'Hidden'}
                      </span>
                    </label>
                    <p className="wp-muted mb-0 mt-1 text-[12px]">
                      Listing it does not make it able to take money.
                    </p>
                  </td>

                  <td>
                    <label className="wp-screen-reader-text" htmlFor={`notice-${row.id}`}>
                      Notice shown for {row.label}
                    </label>
                    <textarea
                      id={`notice-${row.id}`}
                      className="wp-textarea"
                      rows={3}
                      value={drafts[row.id] ?? ''}
                      disabled={rowBusy}
                      onChange={(e) =>
                        setDrafts((s) => ({ ...s, [row.id]: e.target.value }))
                      }
                    />
                    <div className="mt-1.5 flex items-center gap-3">
                      <button
                        type="button"
                        className="wp-button"
                        disabled={rowBusy || !dirty}
                        onClick={() => saveNotice(row)}
                      >
                        {rowBusy ? 'Saving…' : 'Save notice'}
                      </button>
                      {dirty && !rowBusy && (
                        <button
                          type="button"
                          className="wp-button"
                          onClick={() =>
                            setDrafts((s) => ({ ...s, [row.id]: row.notice }))
                          }
                        >
                          Revert
                        </button>
                      )}
                      <span className="wp-muted text-[12px]">
                        Shown to the customer at the point they choose this method.
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
