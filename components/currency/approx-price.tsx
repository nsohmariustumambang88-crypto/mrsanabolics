'use client';

import { useCountry } from '@/components/providers/country-provider';
import { useLocale } from '@/components/i18n/use-locale';
import { dictionary } from '@/lib/i18n/dictionaries';
import { NUMBER_LOCALE, type Locale } from '@/lib/i18n/locales';
import { COUNTRIES, type ApproxCurrency } from '@/lib/countries';
import { cn } from '@/lib/utils';

/*
  A USD price converted, approximately, into the visitor's currency — beside the real price,
  never instead of it.

  Renders nothing when there is nothing honest to show: no country yet (static pages fill it in
  after hydration), a USD country, or no rates (the ECB read failed — see lib/currency/rates.ts).
  Always says "approx." in the page's language; CurrencyNote says once per surface that checkout
  is charged in USD.
*/

function useApproxCurrency(override?: ApproxCurrency): { currency: ApproxCurrency; rate: number; date: string } | null {
  const { country, rates } = useCountry();
  if (!rates) return null;
  const currency = override ?? (country ? COUNTRIES[country].currency : 'USD');
  if (currency === 'USD') return null;
  return { currency, rate: rates.rates[currency], date: rates.date };
}

export function formatMoney(amount: number, currency: string, locale: Locale): string {
  return new Intl.NumberFormat(NUMBER_LOCALE[locale], {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function ApproxPrice({
  usd,
  currency: override,
  className,
}: {
  usd: number;
  /** Convert into this currency whatever the visitor's country (the delivery pages do). */
  currency?: ApproxCurrency;
  className?: string;
}) {
  const locale = useLocale();
  const approx = useApproxCurrency(override);
  if (!approx || !Number.isFinite(usd)) return null;
  const t = dictionary(locale);
  return (
    <span className={cn('tabular text-ink-faint', className)}>
      ≈ {formatMoney(usd * approx.rate, approx.currency, locale)} {t.currency.approx}
    </span>
  );
}

/** "Prices are in US dollars. EUR amounts are approximate, at the ECB rate of …; checkout is charged in USD." */
export function CurrencyNote({ currency: override, className }: { currency?: ApproxCurrency; className?: string }) {
  const locale = useLocale();
  const approx = useApproxCurrency(override);
  if (!approx) return null;
  const date = new Intl.DateTimeFormat(NUMBER_LOCALE[locale], {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${approx.date}T00:00:00Z`));
  return <p className={cn('text-xs leading-relaxed text-ink-faint', className)}>{dictionary(locale).currency.note(approx.currency, date)}</p>;
}
