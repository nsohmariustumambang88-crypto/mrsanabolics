/*
  Reference ("was") prices on the storefront.

  The selling prices are the store's real prices. The compare-at ("was") prices are a different
  matter: the seed set a group's third listing 15% above its price, and nobody was ever charged
  that figure. The owner has confirmed the selling prices, not these reference prices. A struck-through price, a "−15%"
  badge or a "save $8" line built on it states a saving that never existed, which is a misleading
  price claim (and, under the EU Omnibus rules, a reference price has to be the lowest actually
  charged in the previous 30 days). The store's standing rule is: no strikethrough prices.

  So the storefront reads compare-at prices only through this function, and it returns nothing
  while SHOW_REFERENCE_PRICES is false. The column and the admin editor are untouched: when real
  reference prices are recorded, flip the switch and every surface comes back at once.
*/
export const SHOW_REFERENCE_PRICES = false;

export function referencePrice(product: { price: number; compareAtPrice?: number | null }): number | null {
  if (!SHOW_REFERENCE_PRICES) return null;
  const was = product.compareAtPrice;
  return was != null && was > product.price ? was : null;
}
