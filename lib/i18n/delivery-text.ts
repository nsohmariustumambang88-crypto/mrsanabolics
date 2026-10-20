import { formatPrice } from '@/lib/format';
import { dictionary } from '@/lib/i18n/dictionaries';
import type { Locale } from '@/lib/i18n/locales';

/*
  Delivery rates in words, in any language. The rule for estimates is formatEstimate's in
  lib/delivery/index.ts (one figure, a range, or nothing), restated here because that module is
  server-only and this one is also used by the header and the cart.
*/

export type RateWords = {
  name: string;
  price: number;
  freeOver: number | null;
  minDays: number | null;
  maxDays: number | null;
};

export function estimateText(locale: Locale, min: number | null, max: number | null): string {
  const t = dictionary(locale).delivery;
  if (min === null && max === null) return '';
  if (min === null || max === null || min === max) {
    const single = (min ?? max) as number;
    return single === 1 ? t.nextDay : t.days(single);
  }
  return t.range(Math.min(min, max), Math.max(min, max));
}

export function rateName(locale: Locale, name: string): string {
  return dictionary(locale).delivery.rateNames[name] ?? name;
}

/** "Standard tracked: $14.00, 5–9 working days, free on orders of $200.00 or more" */
export function rateLine(locale: Locale, rate: RateWords): string {
  const t = dictionary(locale).delivery;
  const estimate = estimateText(locale, rate.minDays, rate.maxDays);
  const parts = [
    formatPrice(rate.price),
    estimate ? (locale === 'de' ? estimate : estimate.charAt(0).toLowerCase() + estimate.slice(1)) : '',
    rate.freeOver !== null ? t.freeOver(formatPrice(rate.freeOver)) : '',
  ].filter(Boolean);
  return `${rateName(locale, rate.name)}: ${parts.join(', ')}`;
}
