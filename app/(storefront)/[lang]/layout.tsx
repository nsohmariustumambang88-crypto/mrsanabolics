import { notFound } from 'next/navigation';
import { INTL_LOCALES, isIntlLocale } from '@/lib/i18n/locales';

/*
  The translated storefront: /es, /fr, /de, /it.

  Every page under here is a translation of an English page listed in lib/i18n/routes.ts, at a
  fixed address, prerendered. `dynamicParams = false` makes that list the whole of it: an address
  that is not on it (/xx, /es/about) is a plain 404 without a render — so a crawler probing
  random paths costs nothing, and no English text is ever served under a language prefix.

  The storefront chrome (header, footer, cart) is the same component tree as English; it reads
  the language from the URL. <html lang> is set from the URL too (components/i18n/html-root.tsx).
*/

export const dynamicParams = false;

export function generateStaticParams() {
  return INTL_LOCALES.map((lang) => ({ lang }));
}

export default function TranslatedLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { lang: string };
}) {
  if (!isIntlLocale(params.lang)) notFound();
  return children;
}
