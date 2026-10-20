import 'server-only';

import { cache } from 'react';
import { formatEstimate, zoneForCountry } from '@/lib/delivery';
import { CATEGORY_COPY } from '@/lib/catalogue/collection-copy';
import type { CollectionFacts } from '@/lib/db/collections';
import type { UsDeliveryOption } from '@/lib/catalogue/collection-faq';
import { formatPriceShort } from '@/lib/format';

/*
  The pieces every storefront page's title and description are built from.

  Pages are written for the searches they actually get ("winstrol for sale", "price of winstrol",
  "winstrol 50 mg price", "winstrol for sale usa"), and every figure in them is computed: prices,
  strengths and counts from the catalogue, shipping from the delivery zones. Nothing here is
  written by hand, so a page can never promise a price, strength or destination the data does
  not hold. Prices are the ones set in the admin.
*/

/** "Oral Winstrol (Stanozolol)": the compound with its route, where the category has one. */
export function titleFor(groupName: string, categorySlug: string): string {
  const qualifier = CATEGORY_COPY[categorySlug]?.qualifier;
  return qualifier ? `${qualifier} ${groupName}` : groupName;
}

/** "$45–$65", or "$45" when every listing costs the same. */
export function shortRange(facts: Pick<CollectionFacts, 'priceFrom' | 'priceTo'>): string | null {
  if (facts.priceFrom === null || facts.priceTo === null) return null;
  return facts.priceFrom === facts.priceTo
    ? formatPriceShort(facts.priceFrom)
    : `${formatPriceShort(facts.priceFrom)}–${formatPriceShort(facts.priceTo)}`;
}

/** "10 mg per tablet" → "10 mg", for titles and running text where the unit is already said. */
export function shortStrength(strength: string): string {
  return strength.replace(/\s+per\s+\w+$/i, '').trim();
}

/** "A, B and C". */
export function andList(values: string[]): string {
  if (values.length <= 1) return values.join('');
  return `${values.slice(0, -1).join(', ')} and ${values[values.length - 1]}`;
}

/** The commonest strengths, without the "per tablet" the title already implies. */
export function commonStrengths(facts: Pick<CollectionFacts, 'strengths'>, max = 3): string {
  return andList(Array.from(new Set(facts.strengths.map(shortStrength))).slice(0, max));
}

/** The first candidate that fits a search result snippet, else the shortest one cut to fit. */
export function fitDescription(candidates: string[], max = 160): string {
  const fits = candidates.find((c) => c.length <= max);
  if (fits) return fits;
  const shortest = [...candidates].sort((a, b) => a.length - b.length)[0] ?? '';
  return shortest.length <= max ? shortest : `${shortest.slice(0, max - 1).replace(/\s+\S*$/, '')}…`;
}

/*
  Delivery options to the United States, read from the delivery zones the admin edits — so a page
  says "we ship to the USA" only while a zone actually covers it. React's cache shares one read
  between a page and its metadata. It fails soft: an unreachable database drops the shipping line,
  it does not take the page down.
*/
export const getUsDelivery = cache(async (): Promise<UsDeliveryOption[] | null> => getCountryDelivery('US'));

/**
 * The same for any country — the translated pages ask about Spain, France, Germany and Italy.
 * Carries the raw day counts as well, so the estimate can be written in the page's language.
 */
export const getCountryDelivery = cache(
  async (
    country: string
  ): Promise<(UsDeliveryOption & { minDays: number | null; maxDays: number | null })[] | null> => {
    try {
      const zone = await zoneForCountry(country);
      if (!zone) return null;
      const options = zone.rates
        .filter((r) => r.active)
        .map((r) => ({
          name: r.name,
          price: r.price,
          freeOver: r.freeOverSubtotal,
          estimate: formatEstimate(r),
          minDays: r.estimateMinDays,
          maxDays: r.estimateMaxDays,
        }))
        .sort((a, b) => a.price - b.price);
      return options.length > 0 ? options : null;
    } catch {
      return null;
    }
  }
);

/** " Tracked US shipping from $9." or "" when the US is not covered. */
export function usShippingLine(options: UsDeliveryOption[] | null): string {
  return options ? ` Tracked US shipping from ${formatPriceShort(options[0].price)}.` : '';
}
