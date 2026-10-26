/*
  The product title test (SEO plan step 4, started 26 October 2026).

  Half the product pages keep their descriptive title ("Test-E 400: Testosterone enanthate
  400 mg/mL Injection"); the other half lead with the purchase ("Buy Test-E 400 by Nakon Medical:
  400 mg/mL vial, $60.00"), which is how the shops that outrank this one write theirs. Google
  shows the title as the blue link, so the click-through rate in Search Console is the measure.

  Assignment is a pure function of the slug — FNV-1a, odd hash = B — so it is stable across
  deploys, needs no storage, and splits the catalogue close to evenly without grouping by
  category. `npm run title-test:export` writes the two lists for comparing them in Search
  Console's Pages report. Read it after at least three weeks; then roll the winner out to every
  product and delete this file.
*/

export const TITLE_TEST_STARTED = '2026-10-26';

export type TitleGroup = 'A' | 'B';

export function titleTestGroup(slug: string): TitleGroup {
  let hash = 0x811c9dc5;
  for (let i = 0; i < slug.length; i++) {
    hash ^= slug.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash % 2 === 1 ? 'B' : 'A';
}
