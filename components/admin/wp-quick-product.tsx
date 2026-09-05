'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { createProduct } from '@/app/admin/actions';
import { runAction } from '@/components/admin/run-action';
import { ImageField } from '@/components/admin/image-field';
import { uploadAndAttach } from '@/components/admin/attach-image';

/*
  The dashboard's Quick Draft widget, doing the job this store actually needs: adding a
  product without leaving the dashboard.

  It writes through the same createProduct server action as the full Add New screen, so there
  is one validation path and one place a rule can change. The difference is only which fields
  it asks for — the action fills long copy, directions, shipping and returns with the same
  defaults either way, so a product created here is a complete row rather than a stub that
  breaks its own product page.

  Category and manufacturer are real foreign keys, so they are selects over live rows rather
  than free text. That is what makes "add a product to any category" work end to end: the row
  lands in Neon with a valid categoryId, and the storefront picks it up on the next cache turn.
*/

type Option = { id: string; name: string };

export function WpQuickProduct({
  categories,
  brands,
}: {
  categories: Option[];
  brands: Option[];
}) {
  const router = useRouter();
  const formRef = React.useRef<HTMLFormElement>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [saved, setSaved] = React.useState<string | null>(null);
  const [image, setImage] = React.useState<File | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setSaved(null);

    const form = new FormData(event.currentTarget);
    const result = await runAction(() => createProduct(form));

    if (!result.ok) {
      setBusy(false);
      setError(result.error);
      return;
    }

    /* Upload only once the server has assigned a unique slug — see attach-image.ts. */
    if (image && result.id && result.slug) {
      const attached = await uploadAndAttach(image, result.slug, result.id);
      if (!attached.ok) {
        setBusy(false);
        setError(`Product created, but the image did not attach: ${attached.error}`);
        return;
      }
    }

    setBusy(false);
    /* Clear the form for the next one and refresh so every count on the page moves. */
    formRef.current?.reset();
    setImage(null);
    setSaved(result.slug ?? 'Product');
    router.refresh();
  }

  return (
    <form ref={formRef} onSubmit={onSubmit}>
      {error && (
        <div className="wp-notice wp-notice-error" role="alert">
          <p>{error}</p>
        </div>
      )}

      {saved && (
        <div className="wp-notice wp-notice-success" role="status">
          <p>
            Product created.{' '}
            <a href={`/product/${saved}`} target="_blank" rel="noreferrer">
              View it on the storefront
            </a>
            .
          </p>
        </div>
      )}

      <div className="mb-3">
        <label className="wp-label" htmlFor="qp-name">
          Title
        </label>
        <input
          id="qp-name"
          name="name"
          required
          className="wp-input"
          placeholder="Testosterone Enanthate 300"
        />
      </div>

      <div className="mb-3 grid grid-cols-2 gap-3">
        <div>
          <label className="wp-label" htmlFor="qp-price">
            Price
          </label>
          <input
            id="qp-price"
            name="price"
            required
            inputMode="decimal"
            className="wp-input"
            placeholder="89.00"
          />
        </div>
        <div>
          <label className="wp-label" htmlFor="qp-stock">
            Units on hand
          </label>
          <input
            id="qp-stock"
            name="stockCount"
            type="number"
            min={0}
            defaultValue={0}
            className="wp-input wp-num"
          />
        </div>
      </div>

      <div className="mb-3 grid grid-cols-2 gap-3">
        <div>
          <label className="wp-label" htmlFor="qp-category">
            Category
          </label>
          <select id="qp-category" name="categoryId" required defaultValue="" className="wp-select">
            <option value="" disabled>
              Choose…
            </option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="wp-label" htmlFor="qp-brand">
            Manufacturer
          </label>
          <select id="qp-brand" name="brandId" required defaultValue="" className="wp-select">
            <option value="" disabled>
              Choose…
            </option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mb-3">
        <label className="wp-label" htmlFor="qp-description">
          Short description
        </label>
        <textarea
          id="qp-description"
          name="description"
          required
          rows={3}
          className="wp-textarea"
          placeholder="One or two lines. Shown on cards and used as the meta description."
        />
      </div>

      <div className="mb-3">
        <ImageField file={image} onChange={setImage} id="qp-image" />
      </div>

      <button type="submit" className="wp-button wp-button-primary" disabled={busy}>
        {busy ? 'Saving…' : 'Save Product'}
      </button>

      <p className="wp-help">
        Full copy and specifications can be added afterwards from the product screen.
      </p>
    </form>
  );
}
