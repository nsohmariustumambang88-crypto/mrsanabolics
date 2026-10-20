'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CountryFlag } from '@/components/layout/country-flag';
import { useCountry } from '@/components/providers/country-provider';
import { useLocale } from '@/components/i18n/use-locale';
import { dictionary } from '@/lib/i18n/dictionaries';
import { localeFromPath, stripLocale, withLocale, type Locale } from '@/lib/i18n/locales';
import { hasTranslation } from '@/lib/i18n/routes';
import { COUNTRIES, COUNTRY_CODES, isCountryCode, type CountryCode } from '@/lib/countries';
import { cn } from '@/lib/utils';

/*
  The country selector, beside the theme toggle.

  A country decides three things: the delivery prices shown, the currency an approximate price is
  converted into, and — where the page being read has a translation — the language. Picking Spain
  on /shop/orals/anavar-oxandrolone goes to /es/shop/orals/anavar-oxandrolone; picking Spain on
  /about stays on /about, because there is no Spanish /about to go to. Picking an English-speaking
  country from a translated page goes back to the English one.

  It never moves anybody on its own. The geo guess only preselects, and every language stays at
  its own fixed address, so a crawler fetching /es/shop always gets /es/shop.

  Two shapes. In the header (from `sm`) it is a flag and a code. Phones get it inside the menu
  sheet, beside the theme toggle, because the 360px header row has no room left: an 80px bull,
  the name and three buttons fill it exactly (see CLAUDE.md, "The phone header").
*/

/** Where choosing `locale` should take the visitor, or null to stay on this page. */
function destination(pathname: string, search: string, locale: Locale | null): string | null {
  if (!locale) return null;
  if (locale === localeFromPath(pathname)) return null;
  const enPath = stripLocale(pathname);
  if (locale === 'en') return `${enPath}${search}`;
  return hasTranslation(enPath) ? `${withLocale(locale, enPath)}${search}` : null;
}

export function CountrySelector({ variant = 'header', className }: { variant?: 'header' | 'sheet'; className?: string }) {
  const locale = useLocale();
  const pathname = usePathname() ?? '/';
  const router = useRouter();
  const { country, setCountry } = useCountry();
  const t = dictionary(locale);
  const name = country ? t.country.names[country] : null;

  const choose = (value: string) => {
    if (!isCountryCode(value)) return;
    setCountry(value);
    const target = destination(pathname, window.location.search, COUNTRIES[value].locale);
    if (target) router.push(target);
  };

  const deliverySlug = country ? COUNTRIES[country].deliverySlug : undefined;

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger
        className={cn(
          'flex items-center gap-1.5 rounded-sm text-ink-soft transition-colors hover:bg-paper-sunk hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          variant === 'header' ? 'h-9 px-2' : 'h-9 border border-rule-strong px-3 text-sm',
          className
        )}
        aria-label={t.country.trigger(name ?? t.country.names.OTHER)}
      >
        <CountryFlag code={country} />
        {/*
          The code and chevron drop out between lg and xl: at 1024px the full nav and the icon row
          leave no room for them, so the button shrinks to the flag alone, the size of its neighbours.
        */}
        {variant === 'header' ? (
          <span className={cn('w-5 font-mono text-2xs uppercase tracking-[0.08em] tabular lg:hidden xl:inline', !country && 'invisible')}>
            {country ? COUNTRIES[country].short : 'US'}
          </span>
        ) : (
          <span>{name ?? t.nav.country}</span>
        )}
        <ChevronDown
          className={cn('h-3 w-3 text-ink-faint', variant === 'header' && 'lg:hidden xl:block')}
          strokeWidth={1.75}
          aria-hidden="true"
        />
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="!animate-none z-[60] w-60 rounded-sm border-rule bg-paper p-1 text-ink shadow-lift"
      >
        <DropdownMenuLabel className="font-mono text-2xs font-normal uppercase tracking-[0.16em] text-ink-faint">
          {t.country.heading}
        </DropdownMenuLabel>
        <DropdownMenuRadioGroup value={country ?? ''} onValueChange={choose}>
          {COUNTRY_CODES.map((code: CountryCode) => (
            <DropdownMenuRadioItem
              key={code}
              value={code}
              className="gap-2.5 rounded-sm text-sm focus:bg-paper-sunk focus:text-ink"
            >
              <CountryFlag code={code} />
              <span className="flex-1">{t.country.names[code]}</span>
              {COUNTRIES[code].currency !== 'USD' && (
                <span className="font-mono text-2xs text-ink-faint">{COUNTRIES[code].currency}</span>
              )}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator className="bg-rule" />
        <DropdownMenuItem asChild className="rounded-sm text-sm text-pigment-indigo focus:bg-paper-sunk focus:text-pigment-indigo">
          <Link href={deliverySlug ? `/delivery/${deliverySlug}` : '/delivery'}>
            {deliverySlug && country ? t.country.deliveryFor(t.country.names[country]) : t.country.allDelivery}
          </Link>
        </DropdownMenuItem>
        <p className="px-2 pb-1.5 pt-0.5 text-2xs leading-snug text-ink-faint">{t.country.charged}</p>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
