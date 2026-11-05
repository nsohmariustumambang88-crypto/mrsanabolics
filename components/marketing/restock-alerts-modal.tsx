'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import { X, Tag } from 'lucide-react';
import { useSubscribe } from './use-subscribe';
import { CONSENT } from '@/lib/marketing/consent';
import { BullMark } from '@/components/brand/bull-mark';
import { claimPopupSlot } from './popup-slot';

/*
  The restock sign-up.

  When it asks (the owner's decision of 5 November 2026, replacing "one second after landing,
  and again ten seconds after every close"):
  - at most once a visit. Closing it is an answer; it does not come back until the next visit.
  - only once the visitor has shown some interest: scrolled a fair way down a page (two screens,
    or half the page if that is shorter) or spent 30 seconds on the site, whichever comes first.
    The 30 seconds run across pages, from the first page of the visit.
  - never on the screens where someone is paying or signing in (the same list as ExitCapture),
    never on top of another open dialog (the cart, search, the menu), and never in a visit that
    another popup already claimed (popup-slot.ts).
  - after a sign-up, not again for 7 days on this browser.

  It is a real dialog: announced as one, labelled by its heading, focus moves into it, and
  Escape and a click outside close it the same way the X does.

  Every storage access is wrapped: private windows throw on storage, and a popup that cannot
  remember is better than a component that throws during render.
*/

const SILENT_PATHS = ['/checkout', '/auth', '/account', '/basket', '/unsubscribe', '/admin'];

/** sessionStorage: it has opened this visit (and so stays closed once closed). */
const SHOWN_KEY = 'restock-alerts-shown';
/** sessionStorage: when this visit began, so the 30 seconds carry across pages. */
const VISIT_START_KEY = 'restock-alerts-visit-start';
/** sessionStorage: subscribed this visit (the key the earlier version wrote; still honoured). */
const SUBSCRIBED_SESSION_KEY = 'restock-alerts-subscribed';
/** localStorage: subscribed; quiet until this time (ms). */
const SUBSCRIBED_UNTIL_KEY = 'restock-alerts-subscribed-until';

const DWELL_MS = 30_000;
const SUBSCRIBED_QUIET_MS = 7 * 24 * 60 * 60 * 1000;
/** Never open the instant a page lands, even when the 30 seconds are already used up. */
const LANDING_GRACE_MS = 1500;
/** How long to wait before looking again when another dialog is open. */
const OVERLAY_RETRY_MS = 3000;

type Store = 'localStorage' | 'sessionStorage';

function read(store: Store, key: string): string | null {
  try {
    return window[store].getItem(key);
  } catch {
    return null;
  }
}

function write(store: Store, key: string, value: string): void {
  try {
    window[store].setItem(key, value);
  } catch {
    /* Cannot remember; the in-page state still keeps it closed for this page. */
  }
}

function suppressed(): boolean {
  if (read('sessionStorage', SHOWN_KEY) || read('sessionStorage', SUBSCRIBED_SESSION_KEY)) return true;
  const until = Number(read('localStorage', SUBSCRIBED_UNTIL_KEY));
  return Number.isFinite(until) && until > Date.now();
}

function visitStart(): number {
  const stored = Number(read('sessionStorage', VISIT_START_KEY));
  if (Number.isFinite(stored) && stored > 0) return stored;
  const now = Date.now();
  write('sessionStorage', VISIT_START_KEY, String(now));
  return now;
}

/** The cart, search, the menu or another popup is open: wait rather than stack on it. */
function overlayOpen(): boolean {
  return document.querySelector('[role="dialog"], [role="alertdialog"]') !== null;
}

export function RestockAlertsModal() {
  const pathname = usePathname() ?? '';
  const silent = SILENT_PATHS.some((p) => pathname.startsWith(p));
  const [isOpen, setIsOpen] = React.useState(false);
  const { email, setEmail, consent, setConsent, submit, done, error } = useSubscribe('newsletter');
  const inputRef = React.useRef<HTMLInputElement>(null);

  /* Subscribed: quiet for a week on this browser. The card shows "Subscribed!" briefly first. */
  React.useEffect(() => {
    if (!done) return;
    write('sessionStorage', SUBSCRIBED_SESSION_KEY, 'true');
    write('localStorage', SUBSCRIBED_UNTIL_KEY, String(Date.now() + SUBSCRIBED_QUIET_MS));
    const timer = window.setTimeout(() => setIsOpen(false), 2000);
    return () => window.clearTimeout(timer);
  }, [done]);

  /* Wait for interest on each page of the visit until it has opened once. */
  React.useEffect(() => {
    if (done || silent || suppressed()) return;

    const start = visitStart();
    let fired = false;
    let retry: number | undefined;

    const open = () => {
      if (fired || retry !== undefined) return;
      if (suppressed()) {
        fired = true;
        return;
      }
      if (overlayOpen()) {
        retry = window.setTimeout(() => {
          retry = undefined;
          open();
        }, OVERLAY_RETRY_MS);
        return;
      }
      fired = true;
      /* Stand down when another popup (the promotion, the exit card) already has this visit. */
      if (!claimPopupSlot('restock')) return;
      write('sessionStorage', SHOWN_KEY, '1');
      setIsOpen(true);
    };

    const onScroll = () => {
      const fairWay = Math.min(
        2 * window.innerHeight,
        0.5 * document.documentElement.scrollHeight
      );
      if (window.scrollY >= fairWay) open();
    };

    const dwellLeft = Math.max(LANDING_GRACE_MS, DWELL_MS - (Date.now() - start));
    const timer = window.setTimeout(open, dwellLeft);
    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      window.clearTimeout(timer);
      if (retry !== undefined) window.clearTimeout(retry);
      window.removeEventListener('scroll', onScroll);
    };
  }, [done, silent, pathname]);

  /* Moving on to checkout closes it. */
  React.useEffect(() => {
    if (silent) setIsOpen(false);
  }, [silent]);

  /* Closed is closed for the rest of the visit: SHOWN_KEY was written when it opened. */
  const handleClose = React.useCallback(() => {
    setIsOpen(false);
  }, []);

  /* Escape closes it; focus goes to the address field when it opens. */
  React.useEffect(() => {
    if (!isOpen) return;
    inputRef.current?.focus({ preventScroll: true });
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') handleClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, handleClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (consent && email) {
      await submit();
    }
  };

  if (!isOpen || silent) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) handleClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="restock-alerts-title"
        className="relative w-full max-w-md rounded-lg bg-white p-8"
      >
        <button
          type="button"
          onClick={handleClose}
          aria-label="Close"
          className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center text-gray-500 hover:text-gray-700"
        >
          <X className="h-6 w-6" aria-hidden="true" />
        </button>

        <div className="mb-6 flex justify-center">
          <BullMark title="MrsAnabolics" className="w-16" />
        </div>

        <h2 id="restock-alerts-title" className="mb-2 text-center text-2xl font-bold">
          Restock Alerts
        </h2>
        <p className="mb-4 text-center text-sm text-gray-600">
          Be first to hear when something is back in stock, and when new flavours and drops land. One email, only when there&apos;s something worth saying.
        </p>
        <div className="mb-6 rounded-lg bg-blue-50 p-3">
          <p className="flex items-center justify-center gap-2 text-center text-sm font-medium text-blue-900">
            <Tag className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
            <span>
              Get <span className="font-bold">15% off</span> your first order when you subscribe
            </span>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label htmlFor="restock-email" className="sr-only">
            Email address
          </label>
          <input
            ref={inputRef}
            id="restock-email"
            type="email"
            autoComplete="email"
            placeholder="you@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full rounded border border-gray-300 px-4 py-3 text-sm placeholder-gray-500 focus:border-black focus:outline-none"
          />

          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-1 h-4 w-4 cursor-pointer"
            />
            <span className="text-sm text-gray-600">{CONSENT.newsletter}</span>
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={!consent || !email || done}
            className="w-full rounded-full bg-black py-3 font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {done ? 'Subscribed!' : 'Subscribe'}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-gray-600">
          For adults 21 and over. We never sell your information.
        </p>
      </div>
    </div>
  );
}
