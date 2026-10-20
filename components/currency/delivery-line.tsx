'use client';

import Link from 'next/link';
import { Truck } from 'lucide-react';
import { useCountry } from '@/components/providers/country-provider';
import { useLocale } from '@/components/i18n/use-locale';
import { dictionary } from '@/lib/i18n/dictionaries';
import { matchZone } from '@/lib/delivery/match';
import { rateLine } from '@/lib/i18n/delivery-text';
import { COUNTRIES } from '@/lib/countries';
import { cn } from '@/lib/utils';

/*
  What delivery to the visitor's country costs and how long it takes, from the delivery zones —
  the same zones and the same matching rule the checkout quotes from. Shown on product pages.

  Nothing until a country is known; a country with no zone says so rather than staying silent,
  because "we cannot send this to you" is the one thing a visitor most needs to learn early.
*/
export function DeliveryLine({ className }: { className?: string }) {
  const locale = useLocale();
  const { country, zones } = useCountry();
  if (!country || zones.length === 0) return null;

  const t = dictionary(locale);
  const name = country === 'OTHER' ? t.delivery.otherCountries : t.country.names[country];
  const zone = matchZone(zones, country);
  const slug = COUNTRIES[country].deliverySlug;

  return (
    <div className={cn('flex items-start gap-2.5 text-sm text-ink-soft', className)}>
      <Truck className="mt-0.5 h-4 w-4 shrink-0 text-ink-faint" strokeWidth={1.6} aria-hidden="true" />
      <div>
        <p className="font-medium text-ink">{t.delivery.to(name)}</p>
        {zone && zone.rates.length > 0 ? (
          <ul className="mt-1 space-y-0.5">
            {zone.rates.map((r) => (
              <li key={r.name} className="tabular">
                {rateLine(locale, r)}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-1">{t.delivery.none(name)}</p>
        )}
        <p className="mt-1 text-xs text-ink-faint">
          {t.country.charged}{' '}
          <Link
            href={slug ? `/delivery/${slug}` : '/delivery'}
            className="underline decoration-rule-strong underline-offset-[3px] transition-colors hover:text-pigment-indigo hover:decoration-pigment-indigo"
          >
            {slug ? t.country.deliveryFor(t.country.names[country]) : t.country.allDelivery}
          </Link>
        </p>
      </div>
    </div>
  );
}
