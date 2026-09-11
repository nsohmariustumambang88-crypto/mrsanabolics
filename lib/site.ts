/*
  One place for the canonical host and site-level copy. Previously this was duplicated across
  the root layout's metadataBase, robots.ts, and sitemap.ts, which is three chances to drift.
*/

export const SITE = {
  name: 'MrAnabolics',
  url: 'https://mranabolics.example.com',
  slogan: 'Every batch, floated and documented.',
  description:
    'Lab-tested performance compounds with full specifications, batch testing, and dosing on every product. Injectables, orals, SARMs, PCT, peptides, and support compounds.',
} as const;

/**
 * Each category is one drop of pigment in the same bath. The colour is a CSS custom property
 * so both substrates (paper and size) resolve it, and it is the same token everywhere the
 * category appears: navigation, filters, product cards, breadcrumbs.
 */
export function categoryPigment(slug: string): string {
  /*
    The tokens hold bare HSL triplets so Tailwind can compose them with an alpha channel, so
    they have to be wrapped before they are used as a colour. Returning the raw `var()` made
    every category pigment an invalid colour value that silently painted nothing.
  */
  return `hsl(var(--cat-${slug}, var(--pig-indigo)))`;
}

/**
 * Padding for a strip that sits directly under the header, such as the breadcrumb bar.
 *
 * The header's bull hangs past its bottom edge (components/layout/site-header.tsx), so text
 * starting at the usual gutter would sit under its folded arms. From `sm` the text starts just
 * right of the bull instead: the usual gutter, plus the bull's 8.25rem, plus a 1rem gap, so the
 * arms hang over the strip's empty left end. On phones the bull hangs only about 16px, so the
 * strip simply starts its text a little lower.
 *
 * It lives here rather than in the header because the header is a client module, and a string
 * imported from a 'use client' file into a server page is a client reference, not the string.
 * If the bull's size or the header's gutters change, change these with them.
 */
export const UNDER_HEADER_INSET =
  'px-4 pb-3 pt-5 sm:pl-[10.75rem] sm:pr-6 sm:pt-3 lg:pl-[11.75rem] lg:pr-10';

/** Deterministic per-slug seed, so a category's marbling is the same sheet on every visit. */
export function slugSeed(slug: string): number {
  let h = 2166136261;
  for (let i = 0; i < slug.length; i++) {
    h ^= slug.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h % 9973);
}
