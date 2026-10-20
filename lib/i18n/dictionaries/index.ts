import type { Locale } from '@/lib/i18n/locales';
import { en, type Dictionary, type CategoryWords } from '@/lib/i18n/dictionaries/en';
import { es } from '@/lib/i18n/dictionaries/es';
import { fr } from '@/lib/i18n/dictionaries/fr';
import { de } from '@/lib/i18n/dictionaries/de';
import { it } from '@/lib/i18n/dictionaries/it';

export type { Dictionary, CategoryWords };

const DICTIONARIES: Record<Locale, Dictionary> = { en, es, fr, de, it };

export function dictionary(locale: Locale): Dictionary {
  return DICTIONARIES[locale] ?? en;
}

/** A category's name in a language, falling back to the database's English name. */
export function categoryName(locale: Locale, slug: string, fallback: string): string {
  return dictionary(locale).categories[slug]?.name ?? fallback;
}

export function categoryDescription(locale: Locale, slug: string, fallback: string): string {
  return dictionary(locale).categories[slug]?.description ?? fallback;
}
