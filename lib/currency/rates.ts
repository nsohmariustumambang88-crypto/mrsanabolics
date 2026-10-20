import 'server-only';

import { APPROX_CURRENCIES, type ApproxCurrency } from '@/lib/countries';

/*
  Exchange rates for the approximate local prices, from the European Central Bank.

  Frankfurter (frankfurter.dev) republishes the ECB's daily reference rates as JSON, free and
  without a key. Read through fetch with a one-day revalidate, so Next's data cache holds one copy
  for the whole site and the ECB's once-a-day publication is asked for about once a day.

  Failure is silent and total: if the request fails, times out, or answers with anything that is
  not a positive number for every currency, this returns null and the storefront shows USD
  alone. There is deliberately no hard-coded fallback table. A stale guess shown as a price is
  worse than no conversion, because the visitor cannot tell it is a guess.
*/

export type Rates = {
  /** The ECB publication date the rates are from, YYYY-MM-DD. */
  date: string;
  /** 1 USD in each currency. */
  rates: Record<ApproxCurrency, number>;
};

const SOURCE = `https://api.frankfurter.dev/v1/latest?base=USD&symbols=${APPROX_CURRENCIES.join(',')}`;

export async function getRates(): Promise<Rates | null> {
  try {
    const response = await fetch(SOURCE, {
      next: { revalidate: 86400 },
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return null;
    const body = (await response.json()) as { date?: unknown; rates?: Record<string, unknown> };
    if (typeof body.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(body.date) || !body.rates) return null;

    const rates = {} as Record<ApproxCurrency, number>;
    for (const code of APPROX_CURRENCIES) {
      const value = body.rates[code];
      if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return null;
      rates[code] = value;
    }
    return { date: body.date, rates };
  } catch {
    return null;
  }
}
