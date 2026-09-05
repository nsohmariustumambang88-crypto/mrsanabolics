'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronUp, ChevronDown } from 'lucide-react';
import {
  bulkUpdateProducts,
  deleteProduct,
  setStock,
  type BulkAction,
} from '@/app/admin/actions';
import { formatPrice } from '@/lib/format';
import { cloudinaryUrl } from '@/lib/cloudinary';
import { cn } from '@/lib/utils';
import { runAction } from '@/components/admin/run-action';

/*
  The catalogue list table, built to WordPress's WP_List_Table shape.

  That shape is: a tablenav strip carrying bulk actions on the left and the item count on the
  right, a checkbox column, sortable headers that toggle direction, and row actions that
  appear under the title on hover. The <tfoot> repeats the header because a long table read
  from the bottom needs its labels there — WordPress does this and it is worth keeping.

  Two behaviours here are correctness rather than style, and both predate the reskin:

  - Selection is keyed by id and pruned whenever the visible rows change. Carrying a hidden
    selection across a filter change is how a bulk action silently hits rows nobody could see.
  - Delete asks first and names what it is deleting. Everything else here is reversible.

  Sorting and filtering live in the URL and are resolved by the server component, so a
  filtered view is a shareable address and the back button behaves.
*/

export type AdminProductRow = {
  id: string;
  slug: string;
  name: string;
  price: string;
  compareAtPrice: string | null;
  stockCount: number;
  inStock: boolean;
  isBestSeller: boolean;
  isNew: boolean;
  isTrending: boolean;
  isDeal: boolean;
  categoryName: string;
  categorySlug: string;
  brandName: string;
  /** The stored Cloudinary public ID, or null when nothing is attached yet. */
  image: string | null;
};

const BULK_OPTIONS: { value: BulkAction; label: string }[] = [
  { value: 'in-stock', label: 'Mark available' },
  { value: 'out-of-stock', label: 'Mark unavailable' },
  { value: 'mark-best-seller', label: 'Add to best sellers' },
  { value: 'clear-best-seller', label: 'Remove from best sellers' },
  { value: 'mark-deal', label: 'Add to offers' },
  { value: 'clear-deal', label: 'Remove from offers' },
  { value: 'delete', label: 'Delete permanently' },
];

/*
  Hrefs are built here, from a plain object.

  The first version took a `buildHref` callback from the server component, which the RSC
  boundary rejects at render time: functions cannot cross it. The build passed and the page
  threw in the browser — a green build says nothing about serialisability. Passing the query
  as data instead keeps the boundary clean.
*/
function sortHref(query: Record<string, string>, column: string, dir: string): string {
  const next = new URLSearchParams(query);
  next.set('sort', column);
  next.set('dir', dir);
  const qs = next.toString();
  return qs ? `/admin/products?${qs}` : '/admin/products';
}

function SortHeader({
  column,
  label,
  sort,
  dir,
  query,
  className,
}: {
  column: string;
  label: string;
  sort: string;
  dir: string;
  query: Record<string, string>;
  className?: string;
}) {
  const active = sort === column;
  const nextDir = active && dir === 'asc' ? 'desc' : 'asc';

  return (
    <th
      scope="col"
      className={cn(active ? 'sorted' : 'sortable', className)}
      aria-sort={active ? (dir === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      <Link href={sortHref(query, column, nextDir)}>
        {label}
        {/* WordPress shows the arrow only on the column actually in use. */}
        {active &&
          (dir === 'asc' ? (
            <ChevronUp className="h-3 w-3" strokeWidth={2.2} />
          ) : (
            <ChevronDown className="h-3 w-3" strokeWidth={2.2} />
          ))}
      </Link>
    </th>
  );
}

export function ProductsTable({
  rows,
  sort,
  dir,
  query,
}: {
  rows: AdminProductRow[];
  sort: string;
  dir: string;
  /** Current filters, minus sort/dir. Plain data so it crosses the RSC boundary. */
  query: Record<string, string>;
}) {
  const router = useRouter();
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [busy, setBusy] = React.useState(false);
  const [notice, setNotice] = React.useState<{ ok: boolean; text: string } | null>(null);
  const [bulk, setBulk] = React.useState<BulkAction | ''>('');

  const visibleIds = React.useMemo(() => rows.map((r) => r.id), [rows]);

  /*
    Never keep a selection the user cannot see. When the filter changes, anything no longer on
    screen is dropped — otherwise "delete selected" could hit rows scrolled out of existence.
  */
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
      setNotice({ ok: false, text: 'Select at least one product.' });
      return;
    }

    if (bulk === 'delete') {
      const ok = window.confirm(
        `Delete ${selected.size} product${selected.size === 1 ? '' : 's'} permanently? ` +
          'Their specifications, FAQs and reviews go too. This cannot be undone.'
      );
      if (!ok) return;
    }

    setBusy(true);
    setNotice(null);
    const result = await runAction(() => bulkUpdateProducts(Array.from(selected), bulk));
    setBusy(false);

    if (result.ok) {
      const n = selected.size;
      setSelected(new Set());
      setNotice({ ok: true, text: `${n} product${n === 1 ? '' : 's'} updated.` });
      router.refresh();
    } else {
      setNotice({ ok: false, text: result.error });
    }
  }

  async function removeOne(row: AdminProductRow) {
    const ok = window.confirm(
      `Delete “${row.name}” permanently? Its specifications, FAQs and reviews go too.`
    );
    if (!ok) return;

    setBusy(true);
    setNotice(null);
    const result = await runAction(() => deleteProduct(row.id));
    setBusy(false);

    if (result.ok) {
      setNotice({ ok: true, text: `Deleted ${row.name}.` });
      router.refresh();
    } else {
      setNotice({ ok: false, text: result.error });
    }
  }

  async function commitStock(row: AdminProductRow, raw: string) {
    const units = Number(raw);
    if (!Number.isFinite(units) || units < 0 || units === row.stockCount) return;

    setBusy(true);
    const result = await runAction(() => setStock(row.id, units));
    setBusy(false);

    if (result.ok) router.refresh();
    else setNotice({ ok: false, text: result.error });
  }

  const bulkBar = (position: 'top' | 'bottom') => (
    <div className="wp-tablenav">
      <div className="wp-tablenav-actions">
        <label className="wp-screen-reader-text" htmlFor={`bulk-action-${position}`}>
          Select bulk action
        </label>
        <select
          id={`bulk-action-${position}`}
          value={bulk}
          onChange={(e) => setBulk(e.target.value as BulkAction | '')}
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

        {selected.size > 0 && (
          <span className="wp-displaying-num">{selected.size} selected</span>
        )}
      </div>

      <span className="wp-displaying-num">
        {rows.length} {rows.length === 1 ? 'item' : 'items'}
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
          aria-label="Select all products"
        />
      </td>
      <th scope="col" className="w-[52px]">
        <span className="wp-screen-reader-text">Image</span>
      </th>
      <SortHeader column="name" label="Product" sort={sort} dir={dir} query={query} />
      <SortHeader column="category" label="Category" sort={sort} dir={dir} query={query} />
      <SortHeader column="brand" label="Manufacturer" sort={sort} dir={dir} query={query} />
      <SortHeader column="price" label="Price" sort={sort} dir={dir} query={query} />
      <SortHeader column="stock" label="Stock" sort={sort} dir={dir} query={query} />
      <th scope="col">Collections</th>
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
        <table className="wp-list-table min-w-[60rem]">
          <thead>{headerCells}</thead>

          <tbody>
            {rows.map((row) => {
              const isSelected = selected.has(row.id);
              const flags: string[] = [];
              if (row.isBestSeller) flags.push('Best seller');
              if (row.isNew) flags.push('New');
              if (row.isTrending) flags.push('Trending');
              if (row.isDeal) flags.push('Offer');

              return (
                <tr key={row.id}>
                  <th scope="row" className="check-column">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleOne(row.id)}
                      aria-label={`Select ${row.name}`}
                    />
                  </th>

                  <td>
                    <Link href={`/admin/products/${row.id}`} className="block">
                      {row.image ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={cloudinaryUrl(row.image, { width: 80, crop: 'fill' })}
                          alt=""
                          width={40}
                          height={40}
                          className="h-10 w-10 border border-[#dcdcde] bg-white object-cover"
                        />
                      ) : (
                        <span
                          className="flex h-10 w-10 items-center justify-center border border-dashed border-[#c3c4c7] bg-[#f6f7f7] text-[9px] leading-tight wp-muted"
                          title="No image attached"
                        >
                          none
                        </span>
                      )}
                    </Link>
                  </td>

                  {/* The title column: name as a link, then the actions WordPress reveals
                      under it on hover. */}
                  <td>
                    <strong>
                      <Link href={`/admin/products/${row.id}`} className="row-title">
                        {row.name}
                      </Link>
                    </strong>

                    <div className="row-actions">
                      <span>
                        <Link href={`/admin/products/${row.id}`}>Edit</Link>
                      </span>
                      <span>
                        <a href={`/product/${row.slug}`} target="_blank" rel="noreferrer">
                          View
                        </a>
                      </span>
                      <span className="delete">
                        <button
                          type="button"
                          onClick={() => removeOne(row)}
                          disabled={busy}
                          className="delete cursor-pointer border-0 bg-transparent p-0 text-[13px] underline-offset-2 hover:underline"
                          style={{ color: 'var(--wp-error)' }}
                        >
                          Delete permanently
                        </button>
                      </span>
                    </div>
                  </td>

                  {/* Category and manufacturer filter the list, the way WordPress taxonomy
                      columns do. */}
                  <td>
                    <Link href={`/admin/products?category=${row.categorySlug}`}>
                      {row.categoryName}
                    </Link>
                  </td>

                  <td className="wp-muted">{row.brandName}</td>

                  <td className="wp-num">
                    {formatPrice(Number(row.price))}
                    {row.compareAtPrice && (
                      <span className="ml-1.5 wp-muted line-through">
                        {formatPrice(Number(row.compareAtPrice))}
                      </span>
                    )}
                  </td>

                  {/* Inline stock: the change made most often, without a page change. */}
                  <td>
                    <label className="flex items-center gap-2">
                      <span className="wp-screen-reader-text">Units of {row.name}</span>
                      <input
                        type="number"
                        min={0}
                        defaultValue={row.stockCount}
                        disabled={busy}
                        onBlur={(e) => commitStock(row, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                        }}
                        className="wp-input wp-num wp-input-narrow"
                      />
                      <span
                        className="whitespace-nowrap text-[11px] font-semibold uppercase"
                        style={{
                          color: !row.inStock
                            ? 'var(--wp-error)'
                            : row.stockCount <= 5
                              ? 'var(--wp-warning)'
                              : 'var(--wp-success)',
                        }}
                      >
                        {!row.inStock ? 'Out' : row.stockCount <= 5 ? 'Low' : 'In stock'}
                      </span>
                    </label>
                  </td>

                  <td className="wp-muted">{flags.length > 0 ? flags.join(', ') : '—'}</td>
                </tr>
              );
            })}

            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="py-10 text-center">
                  <p className="m-0 font-semibold">No products match those filters.</p>
                  <p className="m-0 mt-1 wp-muted">
                    <Link href="/admin/products">Clear the filters</Link> or{' '}
                    <Link href="/admin/products/new">add a product</Link>.
                  </p>
                </td>
              </tr>
            )}
          </tbody>

          {/* WordPress repeats the header at the foot so a long table keeps its labels. */}
          {rows.length > 0 && <tfoot>{headerCells}</tfoot>}
        </table>
      </div>

      {bulkBar('bottom')}
    </div>
  );
}
