'use client';

import * as React from 'react';
import { Upload, X } from 'lucide-react';
import { IMAGE_ACCEPT, IMAGE_MAX_MB } from '@/components/admin/attach-image';

/*
  A file picker for a product that does not exist yet.

  It deliberately does NOT upload on selection. The public ID is the product slug and uploads
  overwrite, so anything sent before the server has assigned a unique slug risks landing on
  another product's asset. This holds the File in memory, shows a local preview, and hands it
  back to the form to upload once the row exists — see attach-image.ts.

  The preview uses an object URL, which is a handle into browser memory rather than a copy of
  the image. It is revoked when the selection changes or the component goes away; without
  that, every file the user tries pins its full weight for the life of the page.
*/

export function ImageField({
  file,
  onChange,
  id = 'product-image',
  label = 'Product image',
}: {
  file: File | null;
  onChange: (file: File | null) => void;
  id?: string;
  label?: string;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [preview, setPreview] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function pick(next: File | undefined) {
    setError(null);
    if (!next) return;

    if (next.size > IMAGE_MAX_MB * 1024 * 1024) {
      setError(`That file is ${(next.size / 1024 / 1024).toFixed(1)}MB; the limit is ${IMAGE_MAX_MB}MB.`);
      if (inputRef.current) inputRef.current.value = '';
      return;
    }
    onChange(next);
  }

  function clear() {
    onChange(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = '';
  }

  return (
    <div>
      <span className="wp-label">{label}</span>

      <div className="flex items-start gap-3">
        <div className="relative h-[104px] w-[104px] shrink-0 overflow-hidden border border-[#dcdcde] bg-[#f6f7f7]">
          {preview ? (
            /* A blob: URL is not a remote asset, so next/image would only add work here. */
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="flex h-full items-center justify-center px-2 text-center text-[11px] wp-muted">
              No image
            </span>
          )}
        </div>

        <div className="min-w-0">
          <label htmlFor={id} className="wp-button cursor-pointer">
            <Upload className="h-4 w-4" strokeWidth={1.75} />
            {file ? 'Choose a different file' : 'Select image'}
          </label>
          <input
            ref={inputRef}
            id={id}
            type="file"
            accept={IMAGE_ACCEPT}
            className="wp-screen-reader-text"
            onChange={(e) => pick(e.target.files?.[0])}
          />

          {file ? (
            <p className="mt-2 text-[12px]">
              <span className="break-all">{file.name}</span>{' '}
              <span className="wp-muted wp-num">({(file.size / 1024).toFixed(0)}KB)</span>{' '}
              <button
                type="button"
                onClick={clear}
                className="inline-flex items-center gap-0.5 border-0 bg-transparent p-0 underline-offset-2 hover:underline"
                style={{ color: 'var(--wp-error)' }}
              >
                <X className="h-3 w-3" strokeWidth={2.2} />
                remove
              </button>
            </p>
          ) : (
            <p className="wp-help">
              PNG, JPEG, WebP or AVIF, up to {IMAGE_MAX_MB}MB. Uploaded to Cloudinary after the
              product is created, so it can never overwrite another product&rsquo;s image.
            </p>
          )}

          {error && (
            <p className="mt-1 text-[12px]" role="alert" style={{ color: 'var(--wp-error)' }}>
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
