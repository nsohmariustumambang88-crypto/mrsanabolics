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
      so the origin never resizes anything and Netlify's image function is never invoked.

      The loader falls back to the untouched source URL when NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
      is unset, so the site still renders without Cloudinary configured.
    */
    loader: 'custom',
    loaderFile: './lib/cloudinary-loader.ts',
  },
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
