import { INTL_LOCALES, withLocale, type Locale } from '@/lib/i18n/locales';

/*
  Which English pages have translations.

  A fixed list, not "every page under /es": a translated page exists only once somebody has
  translated it, and an address that serves English text under /es would tell search engines
  the Spanish page is a copy of the English one. The country selector reads this list too, so it
  switches language only where there is a page to switch to.

  The compounds are the ones Search Console shows impressions for in Spain, France, Germany and
  Italy, plus the testosterone esters they sit beside. Adding one means adding its name and copy
  to lib/i18n/collections.ts; the routes, sitemap and hreflang follow from this list.
*/

export const TRANSLATED_CATEGORIES = ['injectables', 'orals'] as const;

/** `<category>/<group segment>`, as in lib/catalogue/collection-copy.ts. */
export const TRANSLATED_GROUPS = [
  'injectables/testosterone-enanthate',
  'injectables/testosterone-cypionate',
  'injectables/testosterone-blends',
  'injectables/nandrolone',
  'injectables/trenbolone',
  'injectables/winstrol-stanozolol',
  'orals/winstrol-stanozolol',
  'orals/anavar-oxandrolone',
  'orals/dianabol-methandienone',
  'orals/turinabol',
] as const;

export const TRANSLATED_PATHS: string[] = [
  '/',
  '/shop',
  ...TRANSLATED_CATEGORIES.map((c) => `/shop/${c}`),
  ...TRANSLATED_GROUPS.map((g) => `/shop/${g}`),
];

const TRANSLATED = new Set(TRANSLATED_PATHS);

export function hasTranslation(enPath: string): boolean {
  return TRANSLATED.has(enPath);
}

/**
 * Where a link to an English page should point from a page in `locale`: the translation when
 * there is one, the English page when there is not.
 */
export function localizedHref(locale: Locale, enPath: string): string {
  if (locale === 'en') return enPath;
  const [path, query] = enPath.split('?');
  if (!hasTranslation(path)) return enPath;
  const localized = withLocale(locale, path);
  return query ? `${localized}?${query}` : localized;
}

/**
 * hreflang alternates for a page: every language it exists in, plus x-default pointing at
 * English. Undefined for a page with no translation, which then declares only its canonical.
 */
export function languageAlternates(enPath: string): Record<string, string> | undefined {
  if (!hasTranslation(enPath)) return undefined;
  const languages: Record<string, string> = { en: enPath };
  for (const l of INTL_LOCALES) languages[l] = withLocale(l, enPath);
  languages['x-default'] = enPath;
  return languages;
}

/** The `alternates` block for a page's metadata: its own canonical, and its languages. */
export function alternatesFor(locale: Locale, enPath: string) {
  const languages = languageAlternates(enPath);
  return {
    canonical: withLocale(locale, enPath),
    ...(languages ? { languages } : {}),
  };
}
