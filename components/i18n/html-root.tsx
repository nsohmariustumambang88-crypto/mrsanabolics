'use client';

import { usePathname } from 'next/navigation';
import { localeFromPath } from '@/lib/i18n/locales';

/*
  The <html> element, with the language of the page it holds.

  The root layout is shared by every language, and a server layout cannot see the path beneath
  it without reading request headers, which would turn every static page on the site into a
  per-request render. A client component can: usePathname() is known during the server render
  of a static page, so /es pages leave the server as <html lang="es"> in their first byte, and
  client-side navigation between languages updates the attribute in place.
*/
export function HtmlRoot({ className, children }: { className: string; children: React.ReactNode }) {
  const lang = localeFromPath(usePathname());
  return (
    <html lang={lang} suppressHydrationWarning className={className}>
      {children}
    </html>
  );
}
