'use client';

import * as React from 'react';
import Link from 'next/link';
import { X } from 'lucide-react';
import { useWeeklyOffer } from '@/components/offers/use-weekly-offer';
import { useDictionary } from '@/components/i18n/use-locale';

/*
  The Friday 5% strip above the header.

  Rendered by nobody until the visitor's own clock says the window is open AND the server says
  the offer is on (useWeeklyOffer). The page HTML never contains it, so a page cached on a
  Thursday cannot show it, and the hourly-cached /es /fr /de /it pages show it in their own
  language from the dictionary. Dismissing hides it for the rest of the browser session.

  No "was" price, no countdown, no scarcity: a sentence and a link to the FAQ answer that states
  the conditions (the minimum and one discount per order).
*/

const DISMISS_KEY = 'mranabolics-friday5';

export function FridayBanner() {
  const offer = useWeeklyOffer({ gateOnClock: true });
  const t = useDictionary();
  const [dismissed, setDismissed] = React.useState(true);

  React.useEffect(() => {
    try {
      setDismissed(sessionStorage.getItem(DISMISS_KEY) === 'dismissed');
    } catch {
      setDismissed(false);
    }
  }, []);

  if (!offer.active || dismissed) return null;

  return (
    <div className="relative border-b border-rule bg-field-indigo text-field-foreground" data-friday-banner="">
      <div className="mx-auto flex max-w-[86rem] items-center justify-center px-10 py-2 text-center">
        <p className="text-xs leading-relaxed">
          {t.offer.banner}{' '}
          <Link
            href="/faq"
            className="underline decoration-field-foreground/40 underline-offset-4 transition-colors hover:decoration-field-foreground"
          >
            {t.offer.bannerLink}
          </Link>
        </p>
      </div>
      <button
        type="button"
        onClick={() => {
          setDismissed(true);
          try {
            sessionStorage.setItem(DISMISS_KEY, 'dismissed');
          } catch {
            /* Private mode: it stays dismissed for this page only. */
          }
        }}
        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-sm p-1 opacity-70 transition-opacity hover:opacity-100"
        aria-label={t.offer.dismiss}
      >
        <X className="h-3.5 w-3.5" strokeWidth={2} />
      </button>
    </div>
  );
}
