'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Check, AlertCircle, Loader2 } from 'lucide-react';
import { updateProduct, type ActionResult } from '@/app/admin/actions';
import { cn } from '@/lib/utils';

export type ProductFormValues = {
  id: string;
  name: string;
  price: string;
  compareAtPrice: string;
  description: string;
  longDescription: string;
  directions: string;
  shipping: string;
  returns: string;
  stockCount: number;
  inStock: boolean;
  isNew: boolean;
  isBestSeller: boolean;
  isTrending: boolean;
  isDeal: boolean;
};

function Field({
  label,
  name,
  defaultValue,
  type = 'text',
  hint,
  required,
}: {
  label: string;
  name: string;
  defaultValue?: string | number;
  type?: string;
  hint?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label htmlFor={name} className="wp-label">
        {label}
        {required && <span className="ml-1 text-[#d63638]">*</span>}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        defaultValue={defaultValue}
        required={required}
        inputMode={type === 'number' ? 'numeric' : undefined}
        className="wp-input mt-1"
      />
      {hint && <p className="wp-help">{hint}</p>}
    </div>
  );
}

function Area({
  label,
  name,
  defaultValue,
  rows = 4,
  required,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  rows?: number;
  required?: boolean;
}) {
  return (
    <div>
      <label htmlFor={name} className="wp-label">
        {label}
        {required && <span className="ml-1 text-[#d63638]">*</span>}
      </label>
      <textarea
        id={name}
        name={name}
        rows={rows}
        defaultValue={defaultValue}
        required={required}
        className="wp-textarea mt-1"
      />
    </div>
  );
}

function Toggle({
  label,
  name,
  defaultChecked,
  hint,
}: {
  label: string;
  name: string;
  defaultChecked?: boolean;
  hint?: string;
}) {
  return (
    <label className="flex items-start gap-3 border border-[#dcdcde] p-3.5">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="mt-0.5 h-4 w-4 shrink-0 accent-[#2271b1]"
      />
      <span>
        <span className="wp-label">{label}</span>
        {hint && <span className="mt-0.5 block text-xs wp-muted">{hint}</span>}
      </span>
    </label>
  );
}

export function ProductForm({ product }: { product: ProductFormValues }) {
  const router = useRouter();
  const [state, setState] = React.useState<ActionResult | null>(null);
  const [busy, setBusy] = React.useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setState(null);

    const form = new FormData(event.currentTarget);
    const result = await updateProduct(product.id, form);

    setState(result);
    setBusy(false);
    /* Pull the server's version back so the form reflects what was actually stored. */
    if (result.ok) router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-10">
      <section className="space-y-5">
        <h2 className="text-lg font-semibold">Listing</h2>
        <Field label="Name" name="name" defaultValue={product.name} required />
        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            label="Price"
            name="price"
            defaultValue={product.price}
            hint="Up to two decimal places, no currency symbol."
            required
          />
          <Field
            label="Compare-at price"
            name="compareAtPrice"
            defaultValue={product.compareAtPrice}
            hint="Leave blank for no strike-through price."
          />
        </div>
        <Area
          label="Short description"
          name="description"
          defaultValue={product.description}
          rows={3}
          required
        />
      </section>

      <section className="space-y-5">
        <h2 className="text-lg font-semibold">Stock</h2>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            label="Units on hand"
            name="stockCount"
            type="number"
            defaultValue={product.stockCount}
            hint="5 or fewer shows the low-stock warning."
          />
          <Toggle
            label="Available to buy"
            name="inStock"
            defaultChecked={product.inStock}
            hint="Forced off when units reach zero."
          />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">
          Collections
        </h2>
        <p className="text-sm wp-muted">
          These decide which home rows and shop filters the product appears in.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Toggle label="Best seller" name="isBestSeller" defaultChecked={product.isBestSeller} />
          <Toggle label="Newly floated" name="isNew" defaultChecked={product.isNew} />
          <Toggle label="Moving this week" name="isTrending" defaultChecked={product.isTrending} />
          <Toggle label="On offer" name="isDeal" defaultChecked={product.isDeal} />
        </div>
      </section>

      <section className="space-y-5">
        <h2 className="text-lg font-semibold">Copy</h2>
        <Area label="Full description" name="longDescription" defaultValue={product.longDescription} rows={6} />
        <Area label="Directions" name="directions" defaultValue={product.directions} rows={3} />
        <Area label="Shipping" name="shipping" defaultValue={product.shipping} rows={3} />
        <Area label="Returns" name="returns" defaultValue={product.returns} rows={3} />
      </section>

      <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center gap-4 border-t border-[#dcdcde] bg-white px-4 py-4 sm:mx-0 sm:px-0">
        <button
          type="submit"
          disabled={busy}
          className="wp-button wp-button-primary"
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />}
          {busy ? 'Saving…' : 'Save changes'}
        </button>

        {state?.ok && (
          <p className={cn('flex items-center gap-2 text-sm text-[#00a32a]')}>
            <Check className="h-4 w-4" strokeWidth={2} />
            Saved. The live site updates immediately.
          </p>
        )}

        {state && !state.ok && (
          <p role="alert" className="flex items-center gap-2 text-sm text-[#d63638]">
            <AlertCircle className="h-4 w-4" strokeWidth={1.75} />
            {state.error}
          </p>
        )}
      </div>
    </form>
  );
}
