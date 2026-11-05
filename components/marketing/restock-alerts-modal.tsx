'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import { X, Tag } from 'lucide-react';
import { useSubscribe } from './use-subscribe';
import { CONSENT } from '@/lib/marketing/consent';
import { BullMark } from '@/components/brand/bull-mark';
import { claimPopupSlot } from './popup-slot';
import { cn } from '@/lib/utils';

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

  /* Subscribed: quiet for a week on this browser. The card shows "Subscribed" briefly first. */
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
      {/*
        A sheet of the house paper: opaque card, hairline rule, the lift shadow, square corners,
        an indigo hairline along the top as on the product cards, an underline input and the
        indigo pill. No blur, no emoji. The consent sentence is CONSENT.newsletter, unchanged:
        past subscribers agreed to exactly those words.
      */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="restock-alerts-title"
        className="relative w-full max-w-md border border-rule bg-card px-6 pb-6 pt-8 text-ink shadow-lift-strong sm:px-8 sm:pb-8"
      >
        <span className="absolute inset-x-0 top-0 h-px bg-pigment-indigo" aria-hidden="true" />

        <button
          type="button"
          onClick={handleClose}
          aria-label="Close"
          className="absolute right-2 top-2 flex h-10 w-10 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-paper-sunk hover:text-ink"
        >
          <X className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
        </button>

        <div className="flex justify-center">
          <BullMark title="MrsAnabolics" className="w-14" />
        </div>

        <h2
          id="restock-alerts-title"
          className="mt-4 text-center font-display text-2xl font-semibold tracking-[-0.03em]"
        >
          Restock alerts
        </h2>
        <p className="measure-tight mx-auto mt-2 text-center text-sm leading-relaxed text-ink-soft">
          Get an email when a product is back in stock or a new one arrives. We only write when
          there is something to tell you.
        </p>

        <p className="mt-5 flex items-center justify-center gap-2 border-y border-rule py-3 text-center text-sm">
          <Tag className="h-4 w-4 shrink-0 text-pigment-indigo" strokeWidth={1.75} aria-hidden="true" />
          <span>
            <span className="font-semibold text-pigment-indigo">15% off</span> your first order
            when you subscribe
          </span>
        </p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div className="border-b border-rule-strong transition-colors focus-within:border-pigment-indigo">
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
              className="w-full bg-transparent py-2.5 text-sm outline-none placeholder:text-ink-faint"
            />
          </div>

          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-pigment-indigo"
            />
            <span className="text-xs leading-relaxed text-ink-soft">{CONSENT.newsletter}</span>
          </label>

          {error && <p className="text-xs text-pigment-madder">{error}</p>}

          <button
            type="submit"
            disabled={!consent || !email || done}
            className={cn(
              'w-full rounded-full px-6 py-3 text-sm font-medium text-primary-foreground transition-colors disabled:cursor-not-allowed',
              done
                ? 'bg-pigment-verdigris'
                : 'bg-pigment-indigo hover:bg-pigment-indigo-lift disabled:opacity-50'
            )}
          >
            {done ? 'Subscribed' : 'Subscribe'}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-ink-faint">
          For adults 21 and over. We never sell your information.
        </p>
      </div>
    </div>
  );
}
