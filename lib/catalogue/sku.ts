/*
  The product's SKU in its structured data.

  It is the slug, a readable code that never changes, except where the slug is longer than
  Google allows. Google's merchant listings refuse an sku over 50 characters ("Invalid string
  length in field 'sku'", first reported on 7 November 2026 for six Beligas listings, the longest
  62 characters). A long slug keeps its first 41 characters and gains a hash of the whole slug,
  so the code stays readable, the same on every render, and different for every product.
*/

export const SKU_MAX_LENGTH = 50;

/** FNV-1a, 32-bit, as 8 hex digits. Deterministic, with no dependency and no runtime cost. */
function hash8(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

export function productSku(slug: string): string {
  if (slug.length <= SKU_MAX_LENGTH) return slug;
  const stem = slug.slice(0, SKU_MAX_LENGTH - 9).replace(/-+$/, '');
  return `${stem}-${hash8(slug)}`;
}
