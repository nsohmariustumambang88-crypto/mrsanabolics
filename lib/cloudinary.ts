/*
  Cloudinary delivery.

  This module is safe on the client: the cloud name is public by design — it appears in every
  image URL. The API key and secret are NOT here and must never be, because anything reachable
  from a client component ends up in the browser bundle. Uploads (which need the secret) would
  live in a route handler instead.

  TWO DELIVERY TYPES, ONE HELPER:

  - `fetch`  — Cloudinary pulls a remote image, optimises it, and caches it at the edge. No
               upload and no credentials needed. This is how the journal photography is served
               today: the database still stores the origin URL, which keeps the records
               portable, and delivery is decided here rather than baked into the data.

  - `upload` — an asset already in the Cloudinary media library, addressed by public ID. When
               real product photography is uploaded, store the public ID in the database and
               this helper switches automatically.

  Detection is by shape: anything starting with http(s) is fetched, anything else is treated
  as a public ID. Nothing else in the codebase needs to know which is which.
*/

export const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? '';

/** Cloudinary is optional: without a cloud name every helper falls back to the origin URL. */
export const cloudinaryEnabled = CLOUD_NAME.length > 0;

export type CloudinaryOptions = {
  /** Target width in device pixels. Omitted for an untransformed original. */
  width?: number;
  /** 1–100, or 'auto' (default) to let Cloudinary choose per image. */
  quality?: number | 'auto';
  /** How the image fills the requested box. */
  crop?: 'fill' | 'fit' | 'scale' | 'limit';
  /** Where to anchor when cropping. */
  gravity?: 'auto' | 'center' | 'face';
};

function isRemote(src: string): boolean {
  return /^https?:\/\//i.test(src);
}

/**
 * Build a delivery URL.
 *
 * Returns `src` unchanged when Cloudinary is not configured, so the site renders correctly
 * with no cloud name set — a missing environment variable degrades quality, never the page.
 */
export function cloudinaryUrl(src: string, options: CloudinaryOptions = {}): string {
  if (!src) return src;
  if (!cloudinaryEnabled) return src;

  /* Already a Cloudinary URL — do not wrap it a second time. */
  if (src.includes('res.cloudinary.com')) return src;

  const { width, quality = 'auto', crop = 'limit', gravity } = options;

  const transforms = [
    /* f_auto negotiates AVIF/WebP from the browser's Accept header. */
    'f_auto',
    `q_${quality}`,
    width ? `w_${Math.round(width)}` : null,
    width ? `c_${crop}` : null,
    gravity ? `g_${gravity}` : null,
    /* Do not upscale past the source. */
    'dpr_auto',
  ]
    .filter(Boolean)
    .join(',');

  if (isRemote(src)) {
    /*
      The origin URL carries its own query string, so it is encoded whole. Cloudinary accepts
      both raw and encoded remote URLs; encoding is the form that survives a `?` safely.
    */
    return `https://res.cloudinary.com/${CLOUD_NAME}/image/fetch/${transforms}/${encodeURIComponent(src)}`;
  }

  const publicId = src.replace(/^\/+/, '');
  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/${transforms}/${publicId}`;
}
