/*
  What the home page's photographic sections show, and how their samples are picked.

  NOT a client module, on purpose. The home page (a server component) picks the samples and
  passes them down; the sections (client components) draw them. A value exported from a
  'use client' file and imported into a server component is a client REFERENCE, not the value —
  the array arrives as a placeholder — so anything both sides read lives here.
*/

export const doors = [
  {
    title: 'By compound',
    slug: 'by-compound',
    body: 'You know the molecule and the ester. Go straight to the specification, the concentration, and the certificate.',
    href: '/categories',
    action: 'Open the index',
    /* The shelves somebody arrives at already knowing what they want. */
    categories: ['injectables', 'orals'],
  },
  {
    title: 'By goal',
    slug: 'by-goal',
    body: 'You know what you are training toward. Start from the outcome and read down to what supports it.',
    href: '/shop',
    action: 'Browse by outcome',
    /* The shelves somebody arrives at with an outcome rather than a molecule. */
    categories: ['fat-burners', 'peptides', 'post-cycle'],
  },
];

/** Photographs per door in FeaturedCollections. */
export const PER_DOOR = 3;
/** Category tiles in InstagramGallery, and photographs per tile. */
export const TILES = 6;
export const PER_TILE = 4;

/**
 * Evenly spaced picks, so a sample reads as the range rather than as one shelf's front row.
 * Products are ordered by group, so the first four in a category are often four versions of one
 * compound, which photographs as one product repeated.
 */
export function spread<T>(list: T[], count: number): T[] {
  if (list.length <= count) return list;
  const out: T[] = [];
  const step = list.length / count;
  for (let i = 0; i < count; i++) out.push(list[Math.floor(i * step)]);
  return out;
}
