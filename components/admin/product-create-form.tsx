'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, AlertCircle } from 'lucide-react';
import { createProduct } from '@/app/admin/actions';
import { ImageField } from '@/components/admin/image-field';
import { uploadAndAttach } from '@/components/admin/attach-image';
import { cn } from '@/lib/utils';

/*
  Create a product.

  Only the fields that cannot be guessed are required: name, price, short description,
  category and manufacturer. The long copy, directions, shipping and returns fall back to
  sensible defaults in the action rather than blocking the form, because an empty required
  field is a worse outcome than a default someone edits afterwards.

  The slug is derived server-side and made unique there — it is both the public URL and the
  Cloudinary public ID, so a collision would overwrite another product's image. That is not a
  decision to leave to a form field.
*/

type Option = { id: string; name: string };

export function ProductCreateForm({
  categories,
  brands,
}: {
  categories: Option[];
  brands: Option[];
}) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [name, setName] = React.useState('');
  const [image, setImage] = React.useState<File | null>(null);
  const [stage, setStage] = React.useState<string | null>(null);

  /* Preview of the address this will get, so the slug is not a surprise after saving. */
  const previewSlug =
    name
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'product';

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    setStage('Creating the product…');
    const result = await createProduct(new FormData(event.currentTarget));

    if (!result.ok) {
      setError(result.error);
      setStage(null);
      setBusy(false);
      return;
    }

    if (!result.id || !result.slug) {
      setError('Created, but could not open it.');
      setStage(null);
      setBusy(false);
      return;
    }

    /*
      Upload only now that the server has assigned a unique slug. Uploading earlier would mean
      guessing the public ID, and a guess that collided would overwrite another product's
      image — see attach-image.ts.
    */
    if (image) {
      setStage('Uploading the image…');
      const attached = await uploadAndAttach(image, result.slug, result.id);
      if (!attached.ok) {
        /* The row exists, so send them to it rather than losing the work; the edit screen can
           retry the image. */
        setError(`Product created, but the image did not attach: ${attached.error}`);
        setStage(null);
        setBusy(false);
        router.push(`/admin/products/${result.id}`);
        return;
      }
    }

    router.push(`/admin/products/${result.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="max-w-2xl space-y-10">
      <section className="space-y-5">
        <h2 className="text-lg font-semibold">Listing</h2>

        <div>
          <label htmlFor="name" className="wp-label">
            Name <span className="text-[#d63638]">*</span>
          </label>
          <input
            id="name"
            name="name"
            required
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Testosterone Enanthate 300"
            className="wp-input mt-1"
          />
          <p className="wp-help">
            /product/{previewSlug}
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="price" className="wp-label">
              Price <span className="text-[#d63638]">*</span>
            </label>
            <input
              id="price"
              name="price"
              required
              inputMode="decimal"
              placeholder="89.00"
              className="wp-input mt-1"
            />
            <p className="wp-help">
              Up to two decimal places, no currency symbol.
            </p>
          </div>

          <div>
            <label htmlFor="compareAtPrice" className="wp-label">
              Compare-at price
            </label>
            <input
              id="compareAtPrice"
              name="compareAtPrice"
              inputMode="decimal"
              placeholder="119.00"
              className="wp-input mt-1"
            />
            <p className="wp-help">
              Leave blank for no strike-through price.
            </p>
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="categoryId" className="wp-label">
              Category <span className="text-[#d63638]">*</span>
            </label>
            <select
              id="categoryId"
              name="categoryId"
              required
              defaultValue=""
              className="wp-select mt-1"
            >
              <option value="" disabled>
                Choose a category
              </option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <p className="wp-help">
              Decides the pigment used across the site.
            </p>
          </div>

          <div>
            <label htmlFor="brandId" className="wp-label">
              Manufacturer <span className="text-[#d63638]">*</span>
            </label>
            <select
              id="brandId"
              name="brandId"
              required
              defaultValue=""
              className="wp-select mt-1"
            >
              <option value="" disabled>
                Choose a manufacturer
              </option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="description" className="wp-label">
            Short description <span className="text-[#d63638]">*</span>
          </label>
          <textarea
            id="description"
            name="description"
            required
            rows={3}
            placeholder="One or two lines. Shown on cards and used as the meta description."
            className="wp-textarea mt-1"
          />
        </div>

        <ImageField file={image} onChange={setImage} />

        <div>
          <label htmlFor="stockCount" className="wp-label">
            Units on hand
          </label>
          <input
            id="stockCount"
            name="stockCount"
            type="number"
            min={0}
            defaultValue={0}
            className="wp-input wp-num mt-1 w-32"
          />
          <p className="wp-help">
            Zero marks it unavailable. 5 or fewer shows the low-stock warning.
          </p>
        </div>
      </section>

      <section className="space-y-5">
        <h2 className="text-lg font-semibold">
          Copy
          <span className="ml-2 font-sans text-xs font-normal wp-muted">
            optional — sensible defaults are used
          </span>
        </h2>

        <div>
          <label htmlFor="longDescription" className="wp-label">
            Full description
          </label>
          <textarea
            id="longDescription"
            name="longDescription"
            rows={5}
            placeholder="Defaults to the short description."
            className="wp-textarea mt-1"
          />
        </div>

        <div>
          <label htmlFor="directions" className="wp-label">
            Directions
          </label>
          <textarea
            id="directions"
            name="directions"
            rows={2}
            className="wp-textarea mt-1"
          />
        </div>
      </section>

      {error && (
        <p
          role="alert"
          className="flex items-start gap-2.5 border border-destructive/30 bg-destructive/5 p-3 text-sm text-[#d63638]"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.75} />
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-4 border-t border-[#dcdcde] pt-6">
        <button
          type="submit"
          disabled={busy}
          className={cn(
            'wp-button wp-button-primary'
          )}
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />}
          {busy ? (stage ?? 'Creating…') : 'Create product'}
        </button>

        <button
          type="button"
          onClick={() => router.push('/admin/products')}
          className="text-sm wp-muted underline underline-offset-4"
        >
          Cancel
        </button>

        <p className="text-xs wp-muted">
          You can attach an image on the next screen.
        </p>
      </div>
    </form>
  );
}
