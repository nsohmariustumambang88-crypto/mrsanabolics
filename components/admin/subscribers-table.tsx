'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { unsubscribeSubscriber } from '@/app/admin/actions';
import { formatPrice } from '@/lib/format';

/*
  The subscriber list table.

  The consent sentence is shown in full under each address rather than summarised to a tick.
  A boolean "consented: yes" is worth nothing in a dispute; the wording, the moment and the
  page are the record, so they are the thing on screen.

  Removing someone is the only write action offered, and it is one-way. There is no "re-add"
  button: coming back has to be an act by the person, through a form, so that a fresh consent
  record exists. An admin re-adding an address would produce a row whose consent was nobody's.
*/

export type SubscriberRow = {
  id: string;
  email: string;
  status: 'SUBSCRIBED' | 'UNSUBSCRIBED';
  source: string;
  consentAt: string;
  consentText: string;
  consentPath: string | null;
  pageViews: number;
  lastSeenAt: string | null;
  lastSeenPath: string | null;
  abandonedValue: string | null;
};

const day = (iso: string | null) => (iso ? iso.slice(0, 10) : '—');

export function SubscribersTable({ rows }: { rows: SubscriberRow[] }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<{ ok: boolean; text: string } | null>(null);

  async function remove(row: SubscriberRow) {
    if (!window.confirm(`Remove ${row.email} from the mailing list?`)) return;

    setBusy(row.id);
    const result = await unsubscribeSubscriber(row.id);
    setBusy(null);

    if (result.ok) {
      setNotice({ ok: true, text: `${row.email} removed.` });
      router.refresh();
    } else {
      setNotice({ ok: false, text: result.error });
    }
  }

  return (
    <div>
      {notice && (
        <div
          className={`wp-notice ${notice.ok ? 'wp-notice-success' : 'wp-notice-error'}`}
          role={notice.ok ? 'status' : 'alert'}
        >
          <p>{notice.text}</p>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="wp-list-table min-w-[56rem]">
          <thead>
            <tr>
              <th scope="col">Address</th>
              <th scope="col">Status</th>
              <th scope="col">Source</th>
              <th scope="col">Consent given</th>
              <th scope="col">Activity</th>
              <th scope="col">Basket left</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>
                  <strong>{row.email}</strong>
                  <div className="row-actions">
                    {row.status === 'SUBSCRIBED' ? (
                      <span className="delete">
                        <button
                          type="button"
                          disabled={busy === row.id}
                          onClick={() => remove(row)}
                          className="cursor-pointer border-0 bg-transparent p-0 text-[13px] underline-offset-2 hover:underline"
                          style={{ color: 'var(--wp-error)' }}
                        >
                          {busy === row.id ? 'Removing…' : 'Unsubscribe'}
                        </button>
                      </span>
                    ) : (
                      <span className="wp-muted">Removed — only they can re-subscribe</span>
                    )}
                  </div>
                </td>

                <td>
                  <span
                    className="text-[11px] font-semibold uppercase"
                    style={{
                      color:
                        row.status === 'SUBSCRIBED' ? 'var(--wp-success)' : 'var(--wp-text-muted)',
                    }}
                  >
                    {row.status === 'SUBSCRIBED' ? 'Subscribed' : 'Unsubscribed'}
                  </span>
                </td>

                <td className="wp-muted">{row.source}</td>

                <td>
                  <span className="wp-num">{day(row.consentAt)}</span>
                  {row.consentPath && (
                    <div className="wp-muted text-[11px]">on {row.consentPath}</div>
                  )}
                  {/* The evidence itself, not a summary of it. */}
                  <details className="mt-1">
                    <summary className="cursor-pointer text-[11px]">wording</summary>
                    <p className="mt-1 max-w-[28rem] text-[11px] leading-snug wp-muted">
                      {row.consentText}
                    </p>
                  </details>
                </td>

                <td className="wp-muted">
                  <span className="wp-num">{row.pageViews}</span> views
                  <div className="text-[11px]">
                    last {day(row.lastSeenAt)}
                    {row.lastSeenPath ? ` · ${row.lastSeenPath}` : ''}
                  </div>
                </td>

                <td className="wp-num">
                  {row.abandonedValue ? formatPrice(Number(row.abandonedValue)) : '—'}
                </td>
              </tr>
            ))}

            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="py-10 text-center">
                  <p className="m-0 font-semibold">No subscribers yet.</p>
                  <p className="m-0 mt-1 wp-muted">
                    Addresses arrive from the newsletter band, the exit-intent card and the
                    consent box at checkout.
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
