import 'server-only';

import type { Metadata } from 'next';
import { SITE } from '@/lib/site';
import { OG_LOCALE, withLocale, type IntlLocale } from '@/lib/i18n/locales';
import { alternatesFor } from '@/lib/i18n/routes';
import { dictionary } from '@/lib/i18n/dictionaries';
import { getCountryDelivery } from '@/lib/catalogue/seo';
import { HOME_COUNTRY } from '@/lib/countries';
import type { IntlDelivery } from '@/lib/i18n/collection-faq';

/*
  What every translated page's metadata shares: its own canonical, the hreflang set of the page
  it translates, and the language in openGraph. Built once here so no page can forget one.
*/
export function intlMetadata(
  locale: IntlLocale,
  enPath: string,
  title: string,
  description: string,
  { absoluteTitle = false }: { absoluteTitle?: boolean } = {}
): Metadata {
  const url = `${SITE.url}${withLocale(locale, enPath)}`;
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: alternatesFor(locale, enPath),
    openGraph: { type: 'website', url, title, description, locale: OG_LOCALE[locale], siteName: SITE.name },
    twitter: { card: 'summary_large_image', title, description },
  };
}

/** Delivery to the language's own country (Spain for /es), read from the delivery zones. */
export async function homeDelivery(locale: IntlLocale): Promise<IntlDelivery> {
  const code = HOME_COUNTRY[locale];
  const rates = await getCountryDelivery(code);
  if (!rates) return null;
  return {
    country: dictionary(locale).country.names[code],
    rates: rates.map((r) => ({ name: r.name, price: r.price, freeOver: r.freeOver, minDays: r.minDays, maxDays: r.maxDays })),
  };
}
