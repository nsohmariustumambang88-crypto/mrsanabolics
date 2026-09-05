'use client';

import { setProductImage } from '@/app/admin/actions';
import { runAction } from '@/components/admin/run-action';

/*
  Upload a file to Cloudinary and attach the result to a product.

  Shared by the three places that can put a picture on a product — Add New, the dashboard's
  Quick Add widget, and the edit screen — so the ordering rule below is stated once.

  THE ORDER MATTERS, AND IT IS NOT THE OBVIOUS ONE. The public ID is the product slug, and
  uploads are `overwrite: true`, so uploading before the product exists means uploading under
  a *guessed* slug. If that guess collides with an existing product, the upload silently
  replaces that other product's image. So: create the product first, take the unique slug the
  server actually assigned, and only then upload under it. The extra round trip buys
  correctness that a client-side slug preview cannot.

  Two steps, and the failure between them is deliberate. If the upload succeeds and attaching
  fails, the asset still exists in Cloudinary and can be attached by hand — a better outcome
  than a product record pointing at nothing.
*/

export const IMAGE_ACCEPT = 'image/png,image/jpeg,image/webp,image/avif';
export const IMAGE_MAX_MB = 10;

export type AttachResult = { ok: true; publicId: string } | { ok: false; error: string };

export async function uploadAndAttach(
  file: File,
  /** The slug the server assigned. Not a client-side preview — see the note above. */
  slug: string,
  productId: string
): Promise<AttachResult> {
  if (file.size > IMAGE_MAX_MB * 1024 * 1024) {
    return { ok: false, error: `That file is over ${IMAGE_MAX_MB}MB.` };
  }

  const body = new FormData();
  body.append('file', file);
  body.append('folder', 'mranabolics/products');
  body.append('publicId', slug);

  let publicId: string;
  try {
    const res = await fetch('/api/upload', { method: 'POST', body });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: json.error ?? `Upload failed (HTTP ${res.status}).` };
    publicId = json.publicId;
    if (!publicId) return { ok: false, error: 'Upload succeeded but returned no public ID.' };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Upload failed.' };
  }

  /*
    Wrapped, like every other action call. The upload above has already succeeded by this point,
    so a rejection here — a Neon cold start is the usual one — must come back as a sentence the
    form can show, not as a thrown promise that freezes the caller mid-upload with the asset
    already sitting in Cloudinary and nothing on screen to say so.
  */
  const attached = await runAction(() => setProductImage(productId, publicId));
  if (!attached.ok) {
    return { ok: false, error: `Uploaded, but could not attach it: ${attached.error}` };
  }

  return { ok: true, publicId };
}
