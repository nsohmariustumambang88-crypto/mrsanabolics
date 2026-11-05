'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import { X, Tag } from 'lucide-react';
import { useSubscribe } from './use-subscribe';
import { CONSENT } from '@/lib/marketing/consent';
import { BullMark } from '@/components/brand/bull-mark';
import { claimPopupSlot, popupSlotFree } from './popup-slot';

/*
  The restock sign-up. Its timing (one second after landing, back ten seconds after a close until
  the visitor subscribes) is the owner's choice and is unchanged.

  Two things are not timing:
  - It never opens on the screens where someone is paying or signing in. It used to open on
    /checkout and come back every ten seconds over the payment form. Same list as ExitCapture.
  - It is a real dialog: announced as one, labelled by its heading, focus moves into it, Escape
    and a click outside close it the same way the X does, and the X has a name.
*/

const SILENT_PATHS = ['/checkout', '/auth', '/account', '/basket', '/unsubscribe', '/admin'];

export function RestockAlertsModal() {
  const pathname = usePathname() ?? '';
  const silent = SILENT_PATHS.some((p) => pathname.startsWith(p));
  const [isOpen, setIsOpen] = React.useState(false);
  const { email, setEmail, consent, setConsent, submit, done, error } = useSubscribe('newsletter');
  const inputRef = React.useRef<HTMLInputElement>(null);
  const reopenTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const silentRef = React.useRef(silent);
  silentRef.current = silent;

  React.useEffect(() => {
    /* If already subscribed, never show again */
    if (done) {
      sessionStorage.setItem('restock-alerts-subscribed', 'true');
      setIsOpen(false);
      return;
    }

    /* Check if user already subscribed this session */
    if (sessionStorage.getItem('restock-alerts-subscribed')) {
      return;
    }

    if (silent) return;

    /* Show modal initially after 1 second */
    /* Stand down when another popup (the promotion) already has this visit. */
    const initialTimer = setTimeout(() => {
      if (claimPopupSlot('restock')) setIsOpen(true);
    }, 1000);

    return () => clearTimeout(initialTimer);
  }, [done, silent]);

  /* Moving on to checkout closes it and cancels a pending re-show. */
  React.useEffect(() => {
    if (!silent) return;
    setIsOpen(false);
    if (reopenTimer.current) clearTimeout(reopenTimer.current);
  }, [silent]);

  React.useEffect(() => () => {
    if (reopenTimer.current) clearTimeout(reopenTimer.current);
  }, []);

  const handleClose = React.useCallback(() => {
    setIsOpen(false);
    /* Show again in 10 seconds if not subscribed */
    if (reopenTimer.current) clearTimeout(reopenTimer.current);
    reopenTimer.current = setTimeout(() => {
      if (
        !silentRef.current &&
        !sessionStorage.getItem('restock-alerts-subscribed') &&
        popupSlotFree('restock')
      ) {
        setIsOpen(true);
      }
    }, 10000);
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
