'use client';

import * as React from 'react';

/*
  The handful of site settings that client components need.

  Deliberately NOT the whole settings record. Most settings are read on the server and rendered
  into the page; only a few are needed by components that run in the browser — the stock badge
  on a product card, the free-delivery line in the cart. Shipping the rest to the browser would
  put the email footer and the from-address into every page's payload for no reason.

  Defaults are declared here as well as in lib/settings.ts, so a client component rendered
  outside the provider (a test, a stray import) still behaves rather than throwing. That is the
  opposite of `useStore`, which throws on purpose — a cart with no provider is a bug, a stock
  badge with a default threshold is fine.
*/

export type ClientSettings = {
  /** At or below this count a product reads "N left" rather than "In stock". */
  lowStockThreshold: number;
  /** Headline free-delivery figure. Zero means "do not mention it". */
  freeShippingOver: number;
  currency: string;
  /** Shown on the contact page. Empty hides the line rather than printing a placeholder. */
  supportEmail: string;
  supportPhone: string;
};

const DEFAULTS: ClientSettings = {
  lowStockThreshold: 5,
  freeShippingOver: 0,
  currency: 'USD',
  supportEmail: '',
  supportPhone: '',
};

const SettingsContext = React.createContext<ClientSettings>(DEFAULTS);

export function SettingsProvider({
  value,
  children,
}: {
  value: Partial<ClientSettings>;
  children: React.ReactNode;
}) {
  const merged = React.useMemo(
    () => ({ ...DEFAULTS, ...value }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      value.lowStockThreshold,
      value.freeShippingOver,
      value.currency,
      value.supportEmail,
      value.supportPhone,
    ]
  );

  return <SettingsContext.Provider value={merged}>{children}</SettingsContext.Provider>;
}

export function useSiteSettings(): ClientSettings {
  return React.useContext(SettingsContext);
}
