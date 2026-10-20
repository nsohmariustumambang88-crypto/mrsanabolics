/*
  Which zone serves a country, over the summary the browser holds.

  The same rule as zoneForCountry in lib/delivery/index.ts — a zone that names the country wins,
  otherwise the catch-all (empty country list), otherwise nothing — so the header, the product
  page and the cart cannot disagree with the checkout. Pure, so client components can use it.
*/

export type MatchableZone = { countries: string[] };

export function matchZone<Z extends MatchableZone>(zones: Z[], country: string | null | undefined): Z | null {
  if (!country) return null;
  if (country === 'OTHER') return zones.find((z) => z.countries.length === 0) ?? null;
  return zones.find((z) => z.countries.includes(country)) ?? zones.find((z) => z.countries.length === 0) ?? null;
}
