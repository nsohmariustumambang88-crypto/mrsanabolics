import Link from 'next/link';
import { Truck } from 'lucide-react';
import { dictionary } from '@/lib/i18n/dictionaries';
import { rateLine } from '@/lib/i18n/delivery-text';
import type { IntlLocale } from '@/lib/i18n/locales';
import type { IntlDelivery } from '@/lib/i18n/collection-faq';

/*
  One ruled line under the translated home page's hero: what delivery to the language's own
  country costs and takes, read from the delivery zones. Server-rendered, so it is in the HTML a
  crawler gets, and it says nothing when no zone covers the country.
*/
export function DeliveryStrip({ locale, delivery }: { locale: IntlLocale; delivery: IntlDelivery }) {
  if (!delivery || delivery.rates.length === 0) return null;
  const t = dictionary(locale);
  return (
    <section className="border-b border-rule bg-paper-sunk" aria-label={t.home.deliveryTitle(delivery.country)}>
      <div className="mx-auto flex max-w-[86rem] flex-wrap items-baseline gap-x-6 gap-y-2 px-4 py-4 sm:px-6 lg:px-10">
        <p className="flex items-center gap-2 font-mono text-2xs uppercase tracking-[0.16em] text-ink-faint">
          <Truck className="h-3.5 w-3.5" strokeWidth={1.6} aria-hidden="true" />
          {t.home.deliveryTitle(delivery.country)}
        </p>
        {delivery.rates.map((r) => (
          <p key={r.name} className="text-sm text-ink-soft tabular">
            {rateLine(locale, r)}
          </p>
        ))}
        <p className="text-xs text-ink-faint">
          {t.country.charged}{' '}
          <Link
            href="/delivery"
            className="underline decoration-rule-strong underline-offset-[3px] transition-colors hover:text-pigment-indigo hover:decoration-pigment-indigo"
          >
            {t.home.deliveryLink}
          </Link>
        </p>
      </div>
    </section>
  );
}
