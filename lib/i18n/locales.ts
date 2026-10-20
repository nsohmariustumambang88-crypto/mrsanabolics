/*
  The languages the storefront is written in, and how a URL says which one a page is in.

  English lives at the bare address (/shop). A translation lives under its language code
  (/es/shop). The prefix is the only signal: no cookie, header or redirect decides a page's
  language, because a search engine has to be able to fetch every language at its own URL and
  get the same page a person does.

  Pure functions with no imports, so the header, the sitemap and server pages share them.
*/

export const LOCALES = ['en', 'es', 'fr', 'de', 'it'] as const;
export type Locale = (typeof LOCALES)[number];

/** The translated languages: everything with a URL prefix. */
export const INTL_LOCALES = ['es', 'fr', 'de', 'it'] as const;
export type IntlLocale = (typeof INTL_LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'en';

/** For openGraph.locale. */
export const OG_LOCALE: Record<Locale, string> = {
  en: 'en_US',
  es: 'es_ES',
  fr: 'fr_FR',
  de: 'de_DE',
  it: 'it_IT',
};

/** For Intl.NumberFormat and Intl.DateTimeFormat. */
export const NUMBER_LOCALE: Record<Locale, string> = {
  en: 'en-US',
  es: 'es-ES',
  fr: 'fr-FR',
  de: 'de-DE',
  it: 'it-IT',
};

/** Each language's name in that language, for the selector. */
export const LOCALE_NAME: Record<Locale, string> = {
  en: 'English',
  es: 'Español',
  fr: 'Français',
  de: 'Deutsch',
  it: 'Italiano',
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}

export function isIntlLocale(value: unknown): value is IntlLocale {
  return typeof value === 'string' && (INTL_LOCALES as readonly string[]).includes(value);
}

/** The language a path is in: its first segment when that is a language code, else English. */
export function localeFromPath(pathname: string | null | undefined): Locale {
  const first = (pathname ?? '/').split('/')[1] ?? '';
  return isIntlLocale(first) ? first : 'en';
}

/** '/es/shop' → '/shop', '/es' → '/', '/shop' → '/shop'. */
export function stripLocale(pathname: string): string {
  const parts = pathname.split('/');
  if (isIntlLocale(parts[1])) {
    const rest = parts.slice(2).join('/');
    return rest ? `/${rest}` : '/';
  }
  return pathname || '/';
}

/** The address of an English path in a language. Does not check that a translation exists. */
export function withLocale(locale: Locale, enPath: string): string {
  if (locale === 'en') return enPath;
  return enPath === '/' ? `/${locale}` : `/${locale}${enPath}`;
}
