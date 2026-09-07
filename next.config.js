/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    /*
      All image transformation is delegated to Cloudinary via lib/cloudinary-loader.ts.

      This replaces `unoptimized: true`, which was here because images were hot-linked from a
      remote host and Next could not process them. With a custom loader, next/image still
      generates a responsive srcset — but every candidate URL is a Cloudinary transformation,
      so the origin never resizes anything and the host's image optimiser is never invoked —
      which on Vercel, where this deploys, is a metered function.

      The loader falls back to the untouched source URL when NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
      is unset, so the site still renders without Cloudinary configured.
    */
    loader: 'custom',
    loaderFile: './lib/cloudinary-loader.ts',
  },
  /*
    Next allows a page 60 seconds to statically generate before it restarts the worker, and
    three restarts fail the build. That default assumes a page's data is close by. Ours is a
    Neon endpoint a second away that suspends when idle, so a page that happens to be first
    after a cold start can spend most of that budget just waking the database — and the
    /admin routes, which are `force-dynamic` and still evaluated at build, hit it routinely.

    Three minutes is not a fix for slow data; it is headroom so a cold start is not a failed
    deployment. The real defence is that the catalogue retries connection errors and product
    pages are no longer prerendered at all.
  */
  staticPageGenerationTimeout: 180,

  experimental: {
    /* Admin mutations are server actions: no hand-rolled API route per form. */
    serverActions: true,

    /*
      Static generation defaults to one worker per core. Each worker opens its own connection
      to Neon, and the pooler resets them under that load — the build failed with ECONNRESET
      on a third of the pages. One worker serializes prerendering, which costs a little build
      time and makes the database reads reliable.
    */
    cpus: 1,
    workerThreads: false,
  },
};

module.exports = nextConfig;
