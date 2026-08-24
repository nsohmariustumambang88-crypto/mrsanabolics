import 'server-only';

/*
  The app-facing entry point for Cloudinary uploads.

  Everything is implemented in lib/cloudinary-upload.ts, which build scripts import directly —
  `server-only` throws outside a React server context, so a CLI script cannot go through this
  file. Application code should always import from here, so an accidental client import fails
  at build time rather than at runtime.
*/

export * from './cloudinary-upload';
