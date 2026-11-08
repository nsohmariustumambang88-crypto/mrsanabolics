/*
  The rules for a payment screenshot, read by the upload box in the browser and by the route that
  stores it. A plain module (no server-only) for the same reason as lib/checkout/phone.ts.
*/

/*
  Vercel refuses a function request body over 4.5 MB before our code runs, so the browser shrinks
  anything bigger (components/checkout/cash-app-payment.tsx) and the route refuses the rest.
*/
export const PROOF_MAX_BYTES = 4 * 1024 * 1024;

/* What a phone produces for a screenshot or a photo of a screen. */
export const PROOF_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];

/* Enough for a retake or a second payment, not enough to use an order as free image hosting. */
export const MAX_PROOFS_PER_ORDER = 5;
