/*
  What the shop's first, unfiltered page is, in one place.

  /api/catalogue answers every filtered page; the /shop pages also render the unfiltered first
  page into their HTML so products show (and are linked for crawlers) without waiting for that
  request. Both must agree on the page size and the price ceiling, so both read them from here.
  A plain module: the shop browser (a client component) imports the page size too.
*/

/** How many products arrive per request. The rest come on "Show more". */
export const SHOP_PAGE_SIZE = 24;

/** The ceiling follows the catalogue, so a price change in the database moves the slider. */
export function priceCeiling(list: { price: number }[]): number {
  return Math.ceil(list.reduce((max, p) => Math.max(max, p.price), 0) / 10) * 10;
}
