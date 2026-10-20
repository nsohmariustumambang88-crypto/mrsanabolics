'use client';

import { usePathname } from 'next/navigation';
import { localeFromPath, type Locale } from '@/lib/i18n/locales';
import { dictionary, type Dictionary } from '@/lib/i18n/dictionaries';

/*
  The language of the page being shown, read from its address.

  Client components share the header, cards and cart across every language, so they ask the URL
  rather than taking a prop: /es/... is Spanish wherever in the tree the component sits. Server
  pages know their language from their own params and pass it down instead.
*/
export function useLocale(): Locale {
  return localeFromPath(usePathname());
}

export function useDictionary(): Dictionary {
  return dictionary(useLocale());
}
