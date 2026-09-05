'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { createOrderAction } from '@/app/admin/order-actions';
import { formatPrice } from '@/lib/format';
import { runAction } from '@/components/admin/run-action';

/*
  Recording an order that was placed off-system.

  The running total is computed in the browser purely so the person typing can see what they are
  building. It is NOT what gets stored: the server re-reads every product and recalculates from
  today's catalogue price, because a total posted by a client is a number the client chose.

  onSubmit rather than <form action={fn}> — React 18 ignores a client function there, silently.
*/

export type ContactOption = { id: string; label: string };
export type ProductOption = { id: string; name: string; price: number; inStock: boolean };

export function OrderCreateForm({
  contacts,
  products,
}: {
  contacts: ContactOption[];
  products: ProductOption[];
}) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [quantities, setQuantities] = React.useState<Record<string, number>>({});
  const [productSearch, setProductSearch] = React.useState('');

  /*
    Which product rows are on the page.

    This form used to render the whole catalogue, which was reasonable at twelve products and is
    not at ~790: it put every product into the DOM of a form nobody scrolls, and every keystroke
    in a quantity box re-rendered all of them.

    Anything with a quantity set stays visible whatever the search says. Without that, filtering
    would unmount a row that has a quantity on it and quietly drop the line from the order — the
    server pairs `productId` and `quantity` by index across the rendered inputs, so a row that is
    not rendered is a line that was never ordered.
  */
  const PRODUCT_LIMIT = 40;
  const visibleProducts = React.useMemo(() => {
    const chosen = products.filter((p) => (quantities[p.id] ?? 0) > 0);
    const query = productSearch.trim().toLowerCase();
    if (!query) return [...chosen, ...products.filter((p) => !(quantities[p.id] ?? 0)).slice(0, PRODUCT_LIMIT)];

    const matches = products.filter(
      (p) => !(quantities[p.id] ?? 0) && p.name.toLowerCase().includes(query)
    );
    return [...chosen, ...matches.slice(0, PRODUCT_LIMIT)];
  }, [products, quantities, productSearch]);
  const [shippingCost, setShippingCost] = React.useState('0.00');

  const lines = products
    .map((p) => ({ product: p, quantity: quantities[p.id] ?? 0 }))
    .filter((l) => l.quantity > 0);

  const subtotal = lines.reduce((sum, l) => sum + l.product.price * l.quantity, 0);
  const shipping = Number.parseFloat(shippingCost) || 0;

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    const result = await runAction(() => createOrderAction(new FormData(event.currentTarget)));
    setBusy(false);

    if (result.ok) {
      router.push(`/admin/orders/${result.id}`);
      router.refresh();
    } else {
      setError(result.error);
    }
  }

  return (
    <form onSubmit={onSubmit} className="max-w-[52rem]">
      <div className="wp-notice wp-notice-info">
        <p>
          <strong>This records what was agreed, not that anything was paid.</strong> The order
          model has no payment field and this build collects no money, so an order here is a
          fulfilment record only.
        </p>
      </div>

      {error && (
        <div className="wp-notice wp-notice-error" role="alert">
          <p>{error}</p>
        </div>
      )}

      <label className="wp-label" htmlFor="contactId">
        Customer <span style={{ color: 'var(--wp-error)' }}>*</span>
      </label>
      <select id="contactId" name="contactId" className="wp-select" required defaultValue="">
        <option value="" disabled>
          Choose a contact…
        </option>
        {contacts.map((c) => (
          <option key={c.id} value={c.id}>
            {c.label}
          </option>
        ))}
      </select>
      <p className="wp-muted mt-1 text-[12px]">
        Only existing contacts. If they are not here yet, add them under Contacts first — an order
        needs somebody it belongs to.
      </p>

      {/* ------------------------------------------------------------------ lines */}

      <h2 className="mt-6 text-[14px] font-semibold">Items</h2>
      <div className="mt-2 overflow-x-auto">
        <div className="mb-2 flex flex-wrap items-center gap-3">
          <label className="wp-screen-reader-text" htmlFor="product-search">
            Search products
          </label>
          <input
            id="product-search"
            value={productSearch}
            onChange={(e) => setProductSearch(e.target.value)}
            placeholder="Search the catalogue"
            className="wp-input wp-input-search"
          />
          <p className="wp-help m-0">
            Showing {visibleProducts.length} of {products.length}. Anything with a quantity stays
            listed.
          </p>
        </div>

        <table className="wp-list-table min-w-[34rem]">
          <thead>
            <tr>
              <th scope="col">Product</th>
              <th scope="col">Price</th>
              <th scope="col">Quantity</th>
              <th scope="col">Line</th>
            </tr>
          </thead>
          <tbody>
            {visibleProducts.map((p) => {
              const quantity = quantities[p.id] ?? 0;
              return (
                <tr key={p.id}>
                  <td>
                    {/*
                      Every product posts its id, and the server pairs ids with quantities by
                      index. Rows left at zero are dropped there rather than here, so the two
                      arrays cannot fall out of step.
                    */}
                    <input type="hidden" name="productId" value={p.id} />
                    <strong>{p.name}</strong>
                    {!p.inStock && (
                      <span className="wp-muted ml-2 text-[11px] uppercase">out of stock</span>
                    )}
                  </td>
                  <td className="wp-num">{formatPrice(p.price)}</td>
                  <td>
                    <label className="wp-screen-reader-text" htmlFor={`qty-${p.id}`}>
                      Quantity of {p.name}
                    </label>
                    <input
                      id={`qty-${p.id}`}
                      name="quantity"
                      type="number"
                      min={0}
                      max={1000}
                      value={quantity === 0 ? '' : quantity}
                      placeholder="0"
                      className="wp-input wp-input-narrow wp-w-auto"
                      onChange={(e) =>
                        setQuantities((prev) => ({
                          ...prev,
                          [p.id]: Math.max(0, Number.parseInt(e.target.value, 10) || 0),
                        }))
                      }
                    />
                  </td>
                  <td className="wp-num">
                    {quantity > 0 ? formatPrice(p.price * quantity) : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="wp-label" htmlFor="shippingCost">
              Shipping
            </label>
            <input
              id="shippingCost"
              name="shippingCost"
              className="wp-input wp-input-narrow wp-w-auto"
              value={shippingCost}
              inputMode="decimal"
              onChange={(e) => setShippingCost(e.target.value)}
            />
          </div>

          <div>
            <label className="wp-label" htmlFor="shippingMethod">
              Delivery method
            </label>
            <input
              id="shippingMethod"
              name="shippingMethod"
              className="wp-input wp-w-auto"
              placeholder="e.g. Standard tracked"
            />
            <p className="wp-help">Recorded on the order as agreed.</p>
          </div>

          <div>
            <label className="wp-label" htmlFor="discountCode">
              Discount code
            </label>
            <input
              id="discountCode"
              name="discountCode"
              className="wp-input wp-input-narrow wp-w-auto uppercase"
              placeholder="Optional"
            />
            {/*
              Only the code is submitted. What it is worth is decided server-side when the order
              is written, so the total below cannot show it — and a code that has lapsed by then
              is simply not applied rather than failing the order.
            */}
            <p className="wp-help">Checked and applied when the order is saved.</p>
          </div>
        </div>

        <dl className="min-w-[14rem] text-[13px]">
          <div className="flex justify-between py-0.5">
            <dt className="wp-muted">Subtotal</dt>
            <dd className="wp-num">{formatPrice(subtotal)}</dd>
          </div>
          <div className="flex justify-between border-t border-[#c3c4c7] py-0.5 font-semibold">
            <dt>Total before any discount</dt>
            <dd className="wp-num">{formatPrice(subtotal + shipping)}</dd>
          </div>
        </dl>
      </div>

      {/* ---------------------------------------------------------------- address */}

      <h2 className="mt-6 text-[14px] font-semibold">Deliver to</h2>

      <div className="mt-2 grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="wp-label" htmlFor="shipName">
            Name <span style={{ color: 'var(--wp-error)' }}>*</span>
          </label>
          <input id="shipName" name="shipName" className="wp-input" required />
        </div>

        <div className="sm:col-span-2">
          <label className="wp-label" htmlFor="shipLine1">
            Address <span style={{ color: 'var(--wp-error)' }}>*</span>
          </label>
          <input id="shipLine1" name="shipLine1" className="wp-input" required />
        </div>

        <div className="sm:col-span-2">
          <label className="wp-label" htmlFor="shipLine2">
            Address line 2
          </label>
          <input id="shipLine2" name="shipLine2" className="wp-input" />
        </div>

        <div>
          <label className="wp-label" htmlFor="shipCity">
            City <span style={{ color: 'var(--wp-error)' }}>*</span>
          </label>
          <input id="shipCity" name="shipCity" className="wp-input" required />
        </div>

        <div>
          <label className="wp-label" htmlFor="shipPostcode">
            Postcode <span style={{ color: 'var(--wp-error)' }}>*</span>
          </label>
          <input id="shipPostcode" name="shipPostcode" className="wp-input" required />
        </div>

        <div className="sm:col-span-2">
          <label className="wp-label" htmlFor="shipCountry">
            Country <span style={{ color: 'var(--wp-error)' }}>*</span>
          </label>
          <input id="shipCountry" name="shipCountry" className="wp-input" required />
        </div>
      </div>

      <label className="wp-label mt-4" htmlFor="notes">
        Internal notes
      </label>
      <textarea id="notes" name="notes" rows={3} className="wp-textarea" />

      <button
        type="submit"
        className="wp-button wp-button-primary wp-w-auto mt-5"
        disabled={busy || lines.length === 0}
      >
        {busy ? 'Recording…' : 'Record order'}
      </button>

      {lines.length === 0 && (
        <p className="wp-muted mt-2 text-[12px]">Set a quantity on at least one product.</p>
      )}
    </form>
  );
}
