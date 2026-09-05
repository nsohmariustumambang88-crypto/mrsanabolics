'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { clearSearchTerm } from '@/app/admin/analytics-actions';
import { runAction } from '@/components/admin/run-action';
import { cn } from '@/lib/utils';

/*
  Search terms, grouped.

  The row key is the normalised term, because that is what makes two people who typed the same
  thing with different capitalisation one signal instead of two. The term shown is one somebody
  actually typed, not the normalised form: "TB-500" reads as a product and "tb-500" reads as a
  slug, and the point of this screen is to hear the customer's own words.

  Rows with no results are marked, not sorted away. That marking is the whole value of the
  screen — see the help panel — so it is a colour and a word on the row rather than something
  you have to notice in a number.

  Clearing a term deletes every search recorded under it. There is no edit: a term you can
  rewrite is a record of what you wish somebody had typed.
*/

export type SearchTermRow = {
  normalized: string;
  term: string;
  searches: number;
  avgResults: number;
  lastSearchedAt: string;
  noResults: boolean;
};

const stamp = (iso: string) => `${iso.slice(0, 10)} ${iso.slice(11, 16)}`;

export function SearchTermsTable({ rows }: { rows: SearchTermRow[] }) {
  const router = useRouter();
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [busy, setBusy] = React.useState(false);
  const [notice, setNotice] = React.useState<{ ok: boolean; text: string } | null>(null);

  const visibleKeys = React.useMemo(() => rows.map((r) => r.normalized), [rows]);

  /* Pruned on every change of the visible rows, so a bulk clear can never reach a term that a
     tab or a search has hidden. */
  React.useEffect(() => {
    setSelected((prev) => {
      const next = new Set<string>();
      for (const key of visibleKeys) if (prev.has(key)) next.add(key);
      return next.size === prev.size ? prev : next;
    });
  }, [visibleKeys]);

  const allSelected = rows.length > 0 && selected.size === rows.length;
  const someSelected = selected.size > 0 && !allSelected;

  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(visibleKeys));

  const toggleOne = (key: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  async function clearOne(row: SearchTermRow) {
    const message = [
      `Clear “${row.term}”?`,
      `All ${row.searches} search${row.searches === 1 ? '' : 'es'} recorded under this term are deleted.`,
      'This cannot be undone.',
    ].join('\n\n');

    if (!window.confirm(message)) return;

    setBusy(true);
    setNotice(null);
    const result = await runAction(() => clearSearchTerm(row.normalized));
    setBusy(false);

    if (result.ok) {
      setNotice({ ok: true, text: `Cleared “${row.term}”.` });
      router.refresh();
    } else {
      setNotice({ ok: false, text: result.error });
    }
  }

  async function clearSelected() {
    if (selected.size === 0) {
      setNotice({ ok: false, text: 'Select at least one term.' });
      return;
    }

    const keys = Array.from(selected);
    const total = rows
      .filter((r) => selected.has(r.normalized))
      .reduce((sum, r) => sum + r.searches, 0);

    const message = [
      `Clear ${keys.length} term${keys.length === 1 ? '' : 's'}?`,
      `That deletes ${total} recorded search${total === 1 ? '' : 'es'}.`,
      'This cannot be undone.',
    ].join('\n\n');

    if (!window.confirm(message)) return;

    setBusy(true);
    setNotice(null);

    /* One action per term rather than a bulk endpoint: the counts here are small, and stopping
       at the first refusal is the honest behaviour when a session has expired mid-way. */
    let cleared = 0;
    for (const key of keys) {
      const result = await runAction(() => clearSearchTerm(key));
      if (!result.ok) {
        setBusy(false);
        setNotice({
          ok: false,
          text: `${result.error} ${cleared} term${cleared === 1 ? '' : 's'} were cleared before it stopped.`,
        });
        router.refresh();
        return;
      }
      cleared += 1;
    }

    setBusy(false);
    setSelected(new Set());
    setNotice({ ok: true, text: `Cleared ${cleared} term${cleared === 1 ? '' : 's'}.` });
    router.refresh();
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
            onClick={clearSelected}
            disabled={busy || selected.size === 0}
          >
            {busy ? 'Working…' : 'Clear selected'}
          </button>
          {selected.size > 0 && (
            <span className="wp-displaying-num">{selected.size} selected</span>
          )}
        </div>

        <span className="wp-displaying-num">
          {rows.length} {rows.length === 1 ? 'term' : 'terms'}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="wp-list-table min-w-[44rem]">
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
                  aria-label="Select all terms"
                />
              </td>
              <th scope="col">Term</th>
              <th scope="col">Searches</th>
              <th scope="col">Avg results</th>
              <th scope="col">Last searched</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((row) => (
              <tr key={row.normalized}>
                <td className="check-column">
                  <input
                    type="checkbox"
                    checked={selected.has(row.normalized)}
                    onChange={() => toggleOne(row.normalized)}
                    aria-label={`Select ${row.term}`}
                  />
                </td>

                <td>
                  <strong>{row.term}</strong>
                  {row.noResults && (
                    <span
                      className="ml-2 text-[11px] font-semibold uppercase"
                      style={{ color: 'var(--wp-error)' }}
                    >
                      No results
                    </span>
                  )}
                  <div className="row-actions">
                    <span>
                      <a
                        href={`/shop?q=${encodeURIComponent(row.term)}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Try it on the shop
                      </a>
                    </span>
                    <span className="delete">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => clearOne(row)}
                        className="cursor-pointer border-0 bg-transparent p-0 text-[13px] underline-offset-2 hover:underline"
                        style={{ color: 'var(--wp-error)' }}
                      >
                        Clear
                      </button>
                    </span>
                  </div>
                </td>

                <td className="wp-num">{row.searches}</td>

                <td className="wp-num">
                  {row.avgResults.toFixed(1)}
                </td>

                <td className="wp-num text-[12px]">{stamp(row.lastSearchedAt)}</td>
              </tr>
            ))}

            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="py-10 text-center">
                  <p className="m-0 font-semibold">Nothing searched for yet.</p>
                  <p className="m-0 mt-1 wp-muted">
                    Terms land here when someone uses the search box on the storefront.
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
