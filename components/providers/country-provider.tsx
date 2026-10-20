'use client';

import * as React from 'react';
import { COUNTRY_COOKIE, countryFromGeo, isCountryCode, type CountryCode } from '@/lib/countries';
import type { ZoneSummary } from '@/lib/delivery/summary';
import type { ApproxCurrency } from '@/lib/countries';

/*
  The visitor's country: which delivery prices to show, and which currency an approximate price
  is converted into. It never changes what anybody is charged — checkout is in USD and quotes its
  own delivery from the server.

  Where the country comes from, in order:
    1. the `mra_country` cookie, which a choice in the selector writes (a cookie rather than
       localStorage so a server component can read it when one needs to);
    2. localStorage, in case the cookie was cleared or refused;
    3. the CDN's geo header, asked for once per tab through /api/geo — a preselection only, not
       written to the cookie, because the visitor did not choose it.
  None of these ever redirects. Static pages render without a country and fill it in after
  hydration, which is why every consumer renders nothing until `country` is set.

  Rates and zones come from the storefront layout, read on the server: the rates from the ECB
  (null when that read failed — then nothing is converted), the zones from the delivery tables.
*/

export type ClientRates = { date: string; rates: Record<ApproxCurrency, number> } | null;

type CountryState = {
  country: CountryCode | null;
  /** True when the country came from the geo header rather than from the visitor. */
  inferred: boolean;
  setCountry: (code: CountryCode) => void;
  rates: ClientRates;
  zones: ZoneSummary[];
};

const STORAGE_KEY = 'mra-country';
const GEO_KEY = 'mra-geo-country';
const ONE_YEAR = 60 * 60 * 24 * 365;

const CountryContext = React.createContext<CountryState>({
  country: null,
  inferred: false,
  setCountry: () => {},
  rates: null,
  zones: [],
});

function readCookie(): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${COUNTRY_COOKIE}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function writeCookie(code: CountryCode) {
  const secure = window.location.protocol === 'https:' ? '; secure' : '';
  document.cookie = `${COUNTRY_COOKIE}=${code}; path=/; max-age=${ONE_YEAR}; samesite=lax${secure}`;
}

function safeGet(storage: () => Storage, key: string): string | null {
  try {
    return storage().getItem(key);
  } catch {
    return null;
  }
}

function safeSet(storage: () => Storage, key: string, value: string) {
  try {
    storage().setItem(key, value);
  } catch {
    /* Storage refused (private mode, blocked site data): the cookie still carries the choice. */
  }
}

export function CountryProvider({
  rates,
  zones,
  children,
}: {
  rates: ClientRates;
  zones: ZoneSummary[];
  children: React.ReactNode;
}) {
  const [country, setCountryState] = React.useState<CountryCode | null>(null);
  const [inferred, setInferred] = React.useState(false);

  React.useEffect(() => {
    const chosen = readCookie() ?? safeGet(() => window.localStorage, STORAGE_KEY);
    if (isCountryCode(chosen)) {
      setCountryState(chosen);
      return;
    }

    const remembered = safeGet(() => window.sessionStorage, GEO_KEY);
    if (isCountryCode(remembered)) {
      setCountryState(remembered);
      setInferred(true);
      return;
    }

    let cancelled = false;
    fetch('/api/geo', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((body: { country?: string | null } | null) => {
        const guess = countryFromGeo(body?.country);
        if (cancelled || !guess) return;
        safeSet(() => window.sessionStorage, GEO_KEY, guess);
        setCountryState(guess);
        setInferred(true);
      })
      .catch(() => {
        /* No geo answer: the selector simply shows no country until one is chosen. */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const setCountry = React.useCallback((code: CountryCode) => {
    writeCookie(code);
    safeSet(() => window.localStorage, STORAGE_KEY, code);
    setCountryState(code);
    setInferred(false);
  }, []);

  const value = React.useMemo(
    () => ({ country, inferred, setCountry, rates, zones }),
    [country, inferred, setCountry, rates, zones]
  );

  return <CountryContext.Provider value={value}>{children}</CountryContext.Provider>;
}

export function useCountry(): CountryState {
  return React.useContext(CountryContext);
}
