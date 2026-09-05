'use client';

import * as React from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Upload, Check, AlertCircle, Loader2 } from 'lucide-react';
import { setProductImage } from '@/app/admin/actions';
import { runAction } from '@/components/admin/run-action';

/*
  Product image upload.

  Posts to /api/upload with the session cookie — no token in the bundle. The route accepts an
  admin session precisely so this component does not have to carry a credential; embedding
  ADMIN_UPLOAD_TOKEN in client JavaScript would ship it to every visitor.

  Two steps on purpose: upload to Cloudinary, then write the returned public ID to the
  product. If the second half fails the asset still exists and can be attached by hand, which
  is a better failure than a half-written record pointing at nothing.
*/

const ACCEPT = 'image/png,image/jpeg,image/webp,image/avif';
const MAX_MB = 10;

export function ImageUpload({
  productId,
  slug,
  current,
}: {
  productId: string;
  slug: string;
  current?: string;
}) {
  const router = useRouter();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState<{ ok: boolean; text: string } | null>(null);

  async function handleFile(file: File) {
    setBusy(true);
    setMessage(null);

    if (file.size > MAX_MB * 1024 * 1024) {
      setMessage({ ok: false, text: `That file is over ${MAX_MB}MB.` });
      setBusy(false);
      return;
    }

    const body = new FormData();
    body.append('file', file);
    body.append('folder', 'mranabolics/products');
    /* Deterministic ID: re-uploading replaces the asset instead of orphaning the old one. */
    body.append('publicId', slug);

    try {
      const res = await fetch('/api/upload', { method: 'POST', body });
      const json = await res.json();

      if (!res.ok) {
        setMessage({ ok: false, text: json.error ?? 'Upload failed.' });
        setBusy(false);
        return;
      }

      const attached = await runAction(() => setProductImage(productId, json.publicId));

      if (!attached.ok) {
        setMessage({
          ok: false,
          text: `Uploaded, but could not attach it: ${attached.error}`,
        });
        setBusy(false);
        return;
      }

      setMessage({ ok: true, text: 'Uploaded and attached.' });
      router.refresh();
    } catch (error) {
      setMessage({
        ok: false,
        text: error instanceof Error ? error.message : 'Upload failed.',
      });
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div className="space-y-4">
      <div className="relative aspect-[4/5] w-full max-w-[16rem] overflow-hidden border border-[#dcdcde] bg-[#f6f7f7]">
        {current ? (
          <Image
            src={current}
            alt="Current product image"
            fill
            sizes="256px"
            className="object-cover"
          />
        ) : (
          <p className="flex h-full items-center justify-center p-4 text-center text-xs wp-muted">
            No image attached. The site falls back to a drawn plate.
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor="product-image"
          className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-[#8c8f94] px-5 py-2.5 text-sm transition-colors hover:border-[#2271b1] hover:bg-[#f6f7f7]"
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
          ) : (
            <Upload className="h-4 w-4" strokeWidth={1.75} />
          )}
          {busy ? 'Uploading…' : current ? 'Replace image' : 'Upload image'}
        </label>
        <input
          ref={inputRef}
          id="product-image"
          type="file"
          accept={ACCEPT}
          className="sr-only"
          disabled={busy}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
          }}
        />
        <p className="mt-2 text-xs wp-muted">
          PNG, JPEG, WebP or AVIF, up to {MAX_MB}MB. Replacing clears the CDN cache.
        </p>
      </div>

      {message && (
        <p
          role={message.ok ? undefined : 'alert'}
          className={`flex items-start gap-2 text-sm ${
            message.ok ? 'text-[#00a32a]' : 'text-[#d63638]'
          }`}
        >
          {message.ok ? (
            <Check className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} />
          ) : (
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.75} />
          )}
          {message.text}
        </p>
      )}
    </div>
  );
}
