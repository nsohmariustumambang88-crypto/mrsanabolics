'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Star } from 'lucide-react';
import type { ReviewStatus } from '@prisma/client';
import {
  bulkReviewAction,
  deleteReviewAction,
  editReviewAction,
  moderateReviewAction,
  type ReviewBulkAction,
} from '@/app/admin/review-actions';
import { runAction } from '@/components/admin/run-action';
import { cn } from '@/lib/utils';

/*
  The moderation queue, as wp-admin's Comments screen: a checkbox column, bulk actions, and row
  actions that appear on hover.

  Reviews are shown in full rather than truncated. A queue where you must open each row to learn
  whether it is one line of praise or three paragraphs of medical claims is a queue people work
  in the wrong order — and on this catalogue the long ones are exactly the ones that need
  reading before anything is published under a product.

  Approve and Reject both write; neither publishes anything on its own beyond the review itself.
  Delete is offered for spam and abuse, not for tidying: REJECTED already keeps the row out of
  the storefront and out of the star average, while keeping the record that it was submitted.

  Selection is pruned when the visible rows change, the same rule every list table here holds:
  a bulk delete must never reach a row that scrolled out of the current filter.
*/

export type ReviewRow = {
  id: string;
  author: string;
  email: string | null;
  rating: number;
  title: string;
  body: string;
  status: ReviewStatus;
  createdAt: string;
  moderatedAt: string | null;
  moderatedBy: string | null;
  /** The displayed date (YYYY-MM-DD), as the product page prints it. createdAt is the real one. */
  date: string;
  /** What was first published, kept from the first change to each. Null if never changed. */
  originalTitle: string | null;
  originalBody: string | null;
  originalDate: string | null;
  /** The product's createdAt day: the earliest date a review of it may carry. */
  productListedOn: string;
  editedAt: string | null;
  editedBy: string | null;
  productId: string;
  productName: string;
  productSlug: string;
};

const stamp = (iso: string | null) => (iso ? `${iso.slice(0, 10)} ${iso.slice(11, 16)}` : '—');

/** Enough of the address to recognise a repeat submitter, not enough to harvest it. */
function maskEmail(email: string): string {
  const [name, domain] = email.split('@');
  if (!domain) return '•••';
  return `${name.slice(0, 2)}${'•'.repeat(Math.max(name.length - 2, 1))}@${domain}`;
}

const STATUS_LABEL: Record<ReviewStatus, string> = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
};

function Stars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="inline-flex" aria-hidden>
        {[1, 2, 3, 4, 5].map((i) => (
          <Star
            key={i}
            className="h-3.5 w-3.5"
            strokeWidth={1.5}
            style={
              i <= rating
                ? { fill: '#dba617', color: '#dba617' }
                : { fill: 'transparent', color: '#c3c4c7' }
            }
          />
        ))}
      </span>
      <span className="wp-screen-reader-text">{rating} out of 5</span>
    </span>
  );
}

/** The submission limits from lib/reviews, passed down because that module is server-only. */
export type ReviewLimits = { maxTitle: number; minBody: number; maxBody: number };

export function ReviewsTable({
  rows,
  limits,
  emptyHint,
}: {
  rows: ReviewRow[];
  limits: ReviewLimits;
  emptyHint: string;
}) {
  const router = useRouter();
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [busy, setBusy] = React.useState(false);
  const [notice, setNotice] = React.useState<{ ok: boolean; text: string } | null>(null);
  const [bulk, setBulk] = React.useState<'' | ReviewBulkAction>('');
  /* One review open for editing at a time; the others keep their row actions. */
  const [editingId, setEditingId] = React.useState<string | null>(null);

  async function saveEdit(row: ReviewRow, event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    /* Read before the await: event.currentTarget is null once the promise resolves. */
    const form = new FormData(event.currentTarget);

    setBusy(true);
    setNotice(null);
    const result = await runAction(() => editReviewAction(row.id, form));
    setBusy(false);

    if (result.ok) {
      setEditingId(null);
      setNotice({
        ok: true,
        text:
          row.status === 'APPROVED'
            ? `Saved your edit to the review by ${row.author}. The product page now shows it marked “Edited by MrAnabolics”.`
            : `Saved your edit to the review by ${row.author}.`,
      });
      router.refresh();
    } else {
      setNotice({ ok: false, text: result.error });
    }
  }

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

  async function moderate(row: ReviewRow, status: ReviewStatus) {
    setBusy(true);
    setNotice(null);
    const result = await runAction(() => moderateReviewAction(row.id, status));
    setBusy(false);

    if (result.ok) {
      setNotice({
        ok: true,
        text:
          status === 'APPROVED'
            ? `Approved “${row.title}”. It is live on ${row.productName} and now counts toward its rating.`
            : `Rejected “${row.title}”. It stays out of the storefront and out of the rating.`,
      });
      router.refresh();
    } else {
      setNotice({ ok: false, text: result.error });
    }
  }

  async function removeOne(row: ReviewRow) {
    const ok = window.confirm(
      `Delete the review “${row.title}” by ${row.author} permanently?\n\n` +
        'Rejecting it already keeps it off the storefront and out of the star rating, and keeps ' +
        'the record that it was submitted. Deleting cannot be undone.'
    );
    if (!ok) return;

    setBusy(true);
    setNotice(null);
    const result = await runAction(() => deleteReviewAction(row.id));
    setBusy(false);

    if (result.ok) {
      setNotice({ ok: true, text: `Deleted the review by ${row.author}.` });
      router.refresh();
    } else {
      setNotice({ ok: false, text: result.error });
    }
  }

  async function runBulk() {
    if (!bulk) {
      setNotice({ ok: false, text: 'Choose a bulk action first.' });
      return;
    }
    if (selected.size === 0) {
      setNotice({ ok: false, text: 'Select at least one review.' });
      return;
    }

    const count = selected.size;
    const plural = count === 1 ? 'review' : 'reviews';

    if (bulk === 'delete') {
      const ok = window.confirm(
        `Delete ${count} ${plural} permanently?\n\n` +
          'Rejecting keeps them off the storefront while keeping the record. This cannot be undone.'
      );
      if (!ok) return;
    }

    setBusy(true);
    setNotice(null);
    const result = await runAction(() => bulkReviewAction(Array.from(selected), bulk));
    setBusy(false);

    if (result.ok) {
      const verb = bulk === 'approve' ? 'Approved' : bulk === 'reject' ? 'Rejected' : 'Deleted';
      setNotice({ ok: true, text: `${verb} ${count} ${plural}.` });
      setSelected(new Set());
      setBulk('');
      router.refresh();
    } else {
      setNotice({ ok: false, text: result.error });
    }
  }

  const bulkBar = (position: 'top' | 'bottom') => (
    <div className="wp-tablenav">
      <div className="wp-tablenav-actions">
        <label className="wp-screen-reader-text" htmlFor={`review-bulk-${position}`}>
          Select bulk action
        </label>
        <select
          id={`review-bulk-${position}`}
          value={bulk}
          onChange={(e) => setBulk(e.target.value as '' | ReviewBulkAction)}
          className="wp-select wp-w-auto"
        >
          <option value="">Bulk actions</option>
          <option value="approve">Approve</option>
          <option value="reject">Reject</option>
          <option value="delete">Delete permanently</option>
        </select>

        <button type="button" className="wp-button" onClick={runBulk} disabled={busy}>
          {busy ? 'Working…' : 'Apply'}
        </button>

        {selected.size > 0 && <span className="wp-displaying-num">{selected.size} selected</span>}
      </div>

      <span className="wp-displaying-num">
        {rows.length} {rows.length === 1 ? 'review' : 'reviews'}
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
          aria-label="Select all reviews"
        />
      </td>
      <th scope="col">Author</th>
      <th scope="col">Rating</th>
      <th scope="col">Review</th>
      <th scope="col">Product</th>
      <th scope="col">Submitted</th>
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
                <td className="check-column align-top">
                  <input
                    type="checkbox"
                    checked={selected.has(row.id)}
                    onChange={() => toggleOne(row.id)}
                    aria-label={`Select the review by ${row.author}`}
                  />
                </td>

                <td className="align-top">
                  <strong>{row.author}</strong>
                  <div className="wp-muted text-[12px]">
                    {row.email ? maskEmail(row.email) : 'no address given'}
                  </div>

                  <div className="row-actions">
                    {row.status !== 'APPROVED' && (
                      <span>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => moderate(row, 'APPROVED')}
                          className="cursor-pointer border-0 bg-transparent p-0 text-[13px] underline-offset-2 hover:underline"
                          style={{ color: 'var(--wp-blue)' }}
                        >
                          Approve
                        </button>
                      </span>
                    )}
                    {row.status !== 'REJECTED' && (
                      <span>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => moderate(row, 'REJECTED')}
                          className="cursor-pointer border-0 bg-transparent p-0 text-[13px] underline-offset-2 hover:underline"
                          style={{ color: 'var(--wp-blue)' }}
                        >
                          Reject
                        </button>
                      </span>
                    )}
                    <span>
                      <button
                        type="button"
                        disabled={busy || editingId === row.id}
                        onClick={() => {
                          setNotice(null);
                          setEditingId(row.id);
                        }}
                        className="cursor-pointer border-0 bg-transparent p-0 text-[13px] underline-offset-2 hover:underline"
                        style={{ color: 'var(--wp-blue)' }}
                      >
                        Edit
                      </button>
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
                  <Stars rating={row.rating} />
                </td>

                <td className="align-top">
                  {editingId === row.id ? (
                    <form
                      onSubmit={(event) => saveEdit(row, event)}
                      className="max-w-[34rem] space-y-2"
                    >
                      <p className="wp-muted m-0 text-[12px]">
                        Moderation edit: fix typos, remove personal details or profanity, or
                        correct a wrong date. The rating and author stay as the customer submitted
                        them, the original wording and date are kept, and the product page marks
                        the review as edited.
                      </p>
                      <div>
                        <label className="wp-label" htmlFor={`review-title-${row.id}`}>
                          Headline
                        </label>
                        <input
                          id={`review-title-${row.id}`}
                          name="title"
                          required
                          maxLength={limits.maxTitle}
                          defaultValue={row.title}
                          className="wp-input"
                        />
                      </div>
                      <div>
                        <label className="wp-label" htmlFor={`review-body-${row.id}`}>
                          Message
                        </label>
                        <textarea
                          id={`review-body-${row.id}`}
                          name="body"
                          required
                          rows={6}
                          minLength={limits.minBody}
                          maxLength={limits.maxBody}
                          defaultValue={row.body}
                          className="wp-textarea"
                        />
                      </div>
                      <div>
                        <label className="wp-label" htmlFor={`review-date-${row.id}`}>
                          Review date
                        </label>
                        {/*
                          Bounds mirror the server's: not after today (UTC, as the server
                          compares) and not before the product was listed. They widen to include
                          the current date so an older review can be saved for a typo unchanged.
                        */}
                        <input
                          id={`review-date-${row.id}`}
                          name="date"
                          type="date"
                          required
                          defaultValue={row.date}
                          min={row.date < row.productListedOn ? row.date : row.productListedOn}
                          max={(() => {
                            const today = new Date().toISOString().slice(0, 10);
                            return row.date > today ? row.date : today;
                          })()}
                          className="wp-input wp-w-auto"
                        />
                      </div>
                      <p className="wp-muted m-0 text-[12px]">
                        Actually submitted {stamp(row.createdAt)} (not editable). Product listed{' '}
                        {row.productListedOn}.
                      </p>
                      <div className="flex items-center gap-2">
                        <button type="submit" className="wp-button wp-button-primary" disabled={busy}>
                          {busy ? 'Saving…' : 'Save'}
                        </button>
                        <button
                          type="button"
                          className="wp-button"
                          disabled={busy}
                          onClick={() => setEditingId(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <strong className="text-[13px]">{row.title}</strong>
                      <p className="m-0 mt-1 max-w-[34rem] whitespace-pre-wrap text-[13px] leading-relaxed">
                        {row.body}
                      </p>
                    </>
                  )}
                  <p className="wp-muted m-0 mt-1 text-[11px]">
                    {STATUS_LABEL[row.status]}
                    {row.moderatedAt && ` — ${stamp(row.moderatedAt)} by ${row.moderatedBy}`}
                  </p>
                  {row.editedAt && (
                    <div className="mt-1 max-w-[34rem] text-[11px]">
                      <p className="wp-muted m-0">
                        Edited by {row.editedBy ?? 'an administrator'} on {stamp(row.editedAt)}
                      </p>
                      {(row.originalTitle !== null ||
                        row.originalBody !== null ||
                        (row.originalDate !== null && row.originalDate !== row.date)) && (
                        <details className="mt-1">
                          <summary className="cursor-pointer" style={{ color: 'var(--wp-blue)' }}>
                            View the original review
                          </summary>
                          <div className="mt-1 border-l-4 border-[#c3c4c7] bg-[#f6f7f7] px-3 py-2 text-[13px]">
                            {row.originalDate !== null && row.originalDate !== row.date && (
                              <p className="m-0 mb-1">Originally dated {row.originalDate}</p>
                            )}
                            {row.originalTitle !== null && <strong>{row.originalTitle}</strong>}
                            {row.originalBody !== null && (
                              <p className="m-0 mt-1 whitespace-pre-wrap leading-relaxed">
                                {row.originalBody}
                              </p>
                            )}
                            {row.originalTitle === null && row.originalBody === null && (
                              <p className="wp-muted m-0">The headline and message are unchanged.</p>
                            )}
                          </div>
                        </details>
                      )}
                    </div>
                  )}
                </td>

                <td className="align-top">
                  <Link href={`/admin/products/${row.productId}`}>{row.productName}</Link>
                  {/*
                    Always visible, not a .row-actions link: .row-actions is visibility:hidden
                    until the row is hovered, and the live page is what a moderator opens to see
                    where this review would land — not a secondary action to go hunting for.
                  */}
                  <div className="mt-0.5 text-[12px]">
                    <a href={`/product/${row.productSlug}`} target="_blank" rel="noreferrer">
                      View live page
                    </a>
                  </div>
                </td>

                <td className="wp-num align-top">{stamp(row.createdAt)}</td>
              </tr>
            ))}

            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="py-10 text-center">
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
