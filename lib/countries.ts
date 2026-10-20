import type { Locale } from '@/lib/i18n/locales';

/*
  The countries the selector offers.

  Chosen from Search Console: these are where the impressions come from. Each one says which
  language its visitors are switched to (when the page they are on has a translation), which
  currency an approximate price is shown in, and whether it has a delivery page of its own.

  "Other" is a real choice, not a placeholder: it means "none of these", which shows delivery for
  the rest-of-world zone and leaves the language and the currency alone.

  Pure data, no imports beyond a type, so the header, the provider and server pages share it.
*/

export const COUNTRY_CODES = ['US', 'GB', 'CA', 'AU', 'ES', 'FR', 'DE', 'IT', 'OTHER'] as const;
export type CountryCode = (typeof COUNTRY_CODES)[number];

/** The currencies an approximate price can be shown in. USD is the price itself. */
export const APPROX_CURRENCIES = ['EUR', 'GBP', 'CAD', 'AUD'] as const;
export type ApproxCurrency = (typeof APPROX_CURRENCIES)[number];

export type CountryInfo = {
  code: CountryCode;
  /** What the button shows: the ISO code, except the UK, which people call the UK. */
  short: string;
  currency: 'USD' | ApproxCurrency;
  /** The language its visitors get where a translation exists; null leaves it alone. */
  locale: Locale | null;
  /** /delivery/<slug>, for the countries that have a delivery page. */
  deliverySlug?: string;
};

export const COUNTRIES: Record<CountryCode, CountryInfo> = {
  US: { code: 'US', short: 'US', currency: 'USD', locale: 'en' },
  GB: { code: 'GB', short: 'UK', currency: 'GBP', locale: 'en', deliverySlug: 'united-kingdom' },
  CA: { code: 'CA', short: 'CA', currency: 'CAD', locale: 'en', deliverySlug: 'canada' },
  AU: { code: 'AU', short: 'AU', currency: 'AUD', locale: 'en', deliverySlug: 'australia' },
  ES: { code: 'ES', short: 'ES', currency: 'EUR', locale: 'es' },
  FR: { code: 'FR', short: 'FR', currency: 'EUR', locale: 'fr' },
  DE: { code: 'DE', short: 'DE', currency: 'EUR', locale: 'de' },
  IT: { code: 'IT', short: 'IT', currency: 'EUR', locale: 'it' },
  OTHER: { code: 'OTHER', short: '—', currency: 'USD', locale: null },
};

/** The countries with a delivery page, in the order the footer lists them. */
export const DELIVERY_PAGES: { code: CountryCode; slug: string }[] = [
  { code: 'GB', slug: 'united-kingdom' },
  { code: 'CA', slug: 'canada' },
  { code: 'AU', slug: 'australia' },
];

/** The cookie that holds the visitor's choice, readable on the server. */
export const COUNTRY_COOKIE = 'mra_country';

export function isCountryCode(value: unknown): value is CountryCode {
  return typeof value === 'string' && (COUNTRY_CODES as readonly string[]).includes(value);
}

/**
 * A two-letter code from a CDN geo header, mapped onto the selector's list. Anything not on it
 * becomes OTHER, so a visitor from Portugal is preselected as "Other" rather than as nothing.
 * The UK arrives from the CDN as GB, which is what the list uses.
 */
export function countryFromGeo(code: string | null | undefined): CountryCode | null {
  if (!code || !/^[A-Za-z]{2}$/.test(code)) return null;
  const upper = code.toUpperCase();
  return isCountryCode(upper) ? upper : 'OTHER';
}

/** The country a language's own pages are written for: the shipping answer on /es names Spain. */
export const HOME_COUNTRY: Record<Exclude<Locale, 'en'>, CountryCode> = {
  es: 'ES',
  fr: 'FR',
  de: 'DE',
  it: 'IT',
};
