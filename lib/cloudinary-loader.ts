'use client';

import { cloudinaryUrl } from '@/lib/cloudinary';
import type { ImageLoaderProps } from 'next/image';

/*
  The custom loader Next.js calls for every <Image>.

  Registered in next.config.js as images.loaderFile. Next calls this once per entry in the
  generated srcset, so the browser receives real responsive candidates — 400w, 800w, 1200w —
  each transformed by Cloudinary rather than by Next's own optimiser.

  That matters on any serverless host: the built-in optimiser runs as a function and is billed
  for it — Vercel, where this deploys, meters image optimisation per source image. Handing the
  work to Cloudinary's CDN means the origin never resizes an image at all, and the edge cache
  serves every subsequent request.

  Widths come from Next, so this file only decides the transformation — never the layout.
*/

export default function cloudinaryLoader({
  src,
  width,
  quality,
}: ImageLoaderProps): string {
  return cloudinaryUrl(src, {
    width,
    quality: quality ?? 'auto',
    crop: 'limit',
  });
}
