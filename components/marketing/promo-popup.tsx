'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { X, Copy, Check } from 'lucide-react';
import { BullMark } from '@/components/brand/bull-mark';
import type { AdvertisedDiscount } from '@/lib/types';
import { claimPopupSlot } from './popup-slot';
import { formatPrice } from '@/lib/format';
import { MINIMUM_ORDER } from '@/lib/orders/minimum';

/*
  The promotion popup: the code named in the `hero_promo_code` setting, announced once a visit.

  It is styled like the restock sign-up so the shop has one popup look, and it never opens in
  the same visit as that one or the exit capture (see popup-slot.ts).

  WHAT DECIDES IT IS SHOWN. The storefront layout passes `advertisedDiscount()`, which is null
  unless the code is active, inside its dates and not used up, so a paused or finished code is
  never announced. The layout is cached for up to an hour, so the end date is ALSO checked here
  against the visitor's clock: the popup disappears the moment the sale ends, not up to an hour
  later.

  Dismissing it is remembered per code for a day, so closing it is respected, and a later
  promotion with a different code is still shown.
*/

const DISMISS_PREFIX = 'mranabolics-promo-dismissed:';
const DISMISS_FOR_MS = 24 * 60 * 60 * 1000;
const DELAY_MS = 1500;

/* Never interrupt a purchase, an account action, or leaving the list. */
const SILENT_PATHS = ['/checkout', '/auth', '/account', '/unsubscribe'];

function dismissedRecently(code: string): boolean {
  try {
    const at = Number(window.localStorage.getItem(DISMISS_PREFIX + code));
    return Number.isFinite(at) && at > 0 && Date.now() - at < DISMISS_FOR_MS;
  } catch {
    return false;
  }
}

function rememberDismissal(code: string): void {
  try {
    window.localStorage.setItem(DISMISS_PREFIX + code, String(Date.now()));
  } catch {
    /* It may show once more on a later visit. */
  }
}

const SHOWN_KEY = 'mranabolics-promo-shown';

function shownThisVisit(): boolean {
  try {
    return window.sessionStorage.getItem(SHOWN_KEY) !== null;
  } catch {
    return false;
  }
}

function markShown(): void {
  try {
    window.sessionStorage.setItem(SHOWN_KEY, '1');
  } catch {
    /* It may show once more this visit. */
  }
}

function isLive(promo: AdvertisedDiscount): boolean {
  return !promo.endsAt || new Date(promo.endsAt).getTime() > Date.now();
}

/** "Sunday 25 October, 11:59pm ET". The sale is run on US Eastern time. */
function formatEnd(iso: string): string {
  const date = new Date(iso);
  const day = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    weekday: 'long',
  }).format(date);
  const dayMonth = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'America/New_York',
    day: 'numeric',
    month: 'long',
  }).format(date);
  const time = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
    .format(date)
    .replace(' ', '')
    .toLowerCase();
  return `${day} ${dayMonth}, ${time} ET`;
}

export function PromoPopup({ promo }: { promo: AdvertisedDiscount | null }) {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  const silent = SILENT_PATHS.some((p) => pathname.startsWith(p));
  const code = promo?.code ?? '';

  React.useEffect(() => {
    if (!promo || silent || !isLive(promo) || dismissedRecently(promo.code)) return;
    /* Once a visit. Marked when it actually opens, not when the slot is claimed: an effect that
       runs twice (React's dev mode, or a dependency change) must not count as a showing. */
    if (shownThisVisit()) return;
    /* Claimed now, before the restock popup's own timer fires, so the two never stack. */
    if (!claimPopupSlot('promo')) return;

    const timer = window.setTimeout(() => {
      if (!isLive(promo)) return;
      markShown();
      setOpen(true);
    }, DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [promo, silent]);

  /* Close it if the sale ends while the page is open. */
  React.useEffect(() => {
    if (!open || !promo?.endsAt) return;
    const remaining = new Date(promo.endsAt).getTime() - Date.now();
    if (remaining <= 0) {
      setOpen(false);
      return;
    }
    /* setTimeout overflows past ~24.8 days; a sale that long re-checks on the next visit. */
    if (remaining > 2_000_000_000) return;
    const timer = window.setTimeout(() => setOpen(false), remaining);
    return () => window.clearTimeout(timer);
  }, [open, promo]);

  const close = () => {
    rememberDismissal(code);
    setOpen(false);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* Clipboard refused (an insecure context or an old browser). The code is on screen and
         selectable, so nothing is lost. */
    }
  };

  if (!open || !promo) return null;

  const sentence = [promo.headline, promo.condition].filter(Boolean).join(' ');

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="promo-popup-title"
    >
      <button
        type="button"
        aria-hidden="true"
        tabIndex={-1}
        onClick={close}
        className="absolute inset-0 h-full w-full cursor-default"
      />

      <div className="relative w-full max-w-md rounded-lg bg-white p-8 text-gray-900">
        <button
          type="button"
          onClick={close}
          aria-label="Close"
          className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
        >
          <X className="h-6 w-6" />
        </button>

        <div className="mb-6 flex justify-center">
          <BullMark title="MrsAnabolics" className="w-16" />
        </div>

        <h2 id="promo-popup-title" className="mb-2 text-center text-2xl font-bold">
          {promo.sitewide ? `${promo.headline} everything` : promo.headline}
        </h2>
        <p className="mb-4 text-center text-sm text-gray-600">
          Use code {promo.code} at checkout for {sentence}
          {promo.includesShipping && ' your order total, including shipping'}.
          {' '}Your total after discount must be {formatPrice(MINIMUM_ORDER)} or more.
          {promo.endsAt && <> Ends {formatEnd(promo.endsAt)}.</>}
        </p>

        <div className="mb-6 flex items-center justify-between gap-3 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 px-4 py-3">
          <span className="select-all font-mono text-xl font-bold tracking-widest">
            {promo.code}
          </span>
          <button
            type="button"
            onClick={copy}
            className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium hover:bg-gray-100"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4" /> Copied
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" /> Copy code
              </>
            )}
          </button>
        </div>
        <p className="sr-only" aria-live="polite">
          {copied ? 'Code copied' : ''}
        </p>

        <Link
          href="/shop"
          onClick={close}
          className="block w-full rounded-lg bg-black py-3 text-center font-medium text-white hover:bg-gray-800"
        >
          Shop the sale
        </Link>
        <button
          type="button"
          onClick={close}
          className="mt-3 w-full text-center text-sm text-gray-500 hover:text-gray-700"
        >
          No thanks
        </button>
      </div>
    </div>
  );
}
