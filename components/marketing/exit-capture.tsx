'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import { X, Check } from 'lucide-react';
import { useSubscribe } from '@/components/marketing/use-subscribe';
import { CONSENT } from '@/lib/marketing/consent';
import { claimPopupSlot } from './popup-slot';

/*
  The last ask before someone leaves.

  This is the surface for the case that matters commercially: a visitor reads several pages,
  does not buy, and goes. It cannot read an address off a browser — nothing can — so it asks
  for one, once, at the moment attention is already leaving.

  Restraint here is not politeness, it is deliverability. A card that reappears on every page
  trains people to dismiss it, and addresses given to escape a nag bounce, complain, and take
  the sending domain's reputation with them. So: shown at most once per visitor, never on the
  screens where it would interrupt a purchase, and remembered across sessions.

  Two triggers because desktop and touch differ. Pointer devices have a real exit signal —
  the cursor leaving through the top of the viewport toward the tabs and address bar. Touch
  devices have none, so it waits for evidence of genuine interest instead: real time on the
  page plus real scrolling. Firing a phone modal on a timer alone catches people who opened a
  tab and walked away.
*/

const SEEN_KEY = 'mranabolics-exit-capture';
const DWELL_MS = 45_000;
const SCROLL_FRACTION = 0.45;

/* Never interrupt a purchase, an account action, or the admin. */
const SILENT_PATHS = ['/checkout', '/auth', '/account', '/admin', '/unsubscribe'];

function alreadySeen(): boolean {
  try {
    return window.localStorage.getItem(SEEN_KEY) !== null;
  } catch {
    /* Private windows throw on access. Treat that as "not seen" — showing a card once too
       often is a far smaller cost than a component that throws during render. */
    return false;
  }
}

function remember(value: 'dismissed' | 'subscribed'): void {
  try {
    window.localStorage.setItem(SEEN_KEY, value);
  } catch {
    /* Nothing to do; it may appear once more on a later visit. */
  }
}

export function ExitCapture() {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);
  const { email, setEmail, consent, setConsent, busy, done, error, submit } =
    useSubscribe('exit');

  const silent = SILENT_PATHS.some((p) => pathname.startsWith(p));

  React.useEffect(() => {
    if (silent || alreadySeen()) return;

    let fired = false;
    const show = () => {
      if (fired) return;
      fired = true;
      /* One popup per visit: if the promotion or restock card had it, stay closed. */
      if (claimPopupSlot('exit')) setOpen(true);
    };

    /* Pointer devices: the cursor leaving through the top of the window. */
    const onLeave = (event: MouseEvent) => {
      if (event.clientY <= 0 && !event.relatedTarget) show();
    };

    /* Touch devices: dwell plus scroll, so an abandoned tab does not qualify. */
    let scrolled = false;
    const onScroll = () => {
      const max = document.body.scrollHeight - window.innerHeight;
      if (max > 0 && window.scrollY / max >= SCROLL_FRACTION) scrolled = true;
    };
    const timer = window.setTimeout(() => {
      if (scrolled) show();
    }, DWELL_MS);

    document.addEventListener('mouseout', onLeave);
    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      document.removeEventListener('mouseout', onLeave);
      window.removeEventListener('scroll', onScroll);
      window.clearTimeout(timer);
    };
  }, [silent]);

  /* Record the outcome so it does not return, whichever way it ended. */
  React.useEffect(() => {
    if (done) remember('subscribed');
  }, [done]);

  const close = () => {
    remember('dismissed');
    setOpen(false);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-ink/40 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="exit-capture-title"
    >
      {/* A click on the ground behind counts as a dismissal, like every other overlay here. */}
      <button
        type="button"
        aria-hidden="true"
        tabIndex={-1}
        onClick={close}
        className="absolute inset-0 h-full w-full cursor-default"
      />

      <div className="relative w-full max-w-md border border-rule-strong bg-card p-6 shadow-lift-strong sm:p-8">
        <button
          type="button"
          onClick={close}
          aria-label="Close"
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center text-ink-faint transition-colors hover:text-ink"
        >
          <X className="h-4 w-4" strokeWidth={1.75} />
        </button>

        {done ? (
          <>
            <h2
              id="exit-capture-title"
              className="flex items-center gap-2 font-display text-lg font-semibold tracking-[-0.025em]"
            >
              <Check className="h-4 w-4 text-success" strokeWidth={2} />
              You are on the list
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-ink-soft">
              Release notes and restock alerts will go to that address. Every email carries an
              unsubscribe link.
            </p>
            <button
              type="button"
              onClick={close}
              className="mt-6 rounded-full border border-rule-strong px-5 py-2.5 text-sm font-medium transition-colors hover:border-pigment-indigo"
            >
              Close
            </button>
          </>
        ) : (
          <>
            <h2
              id="exit-capture-title"
              className="font-display text-lg font-semibold tracking-[-0.025em]"
            >
              Before you go
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-ink-soft">
              Batches change. Leave an address and we will send release notes when a
              certificate is published, and a note when something you looked at is back in
              stock.
            </p>

            <form onSubmit={submit} className="mt-5" noValidate>
              <label htmlFor="exit-email" className="sr-only">
                Email address
              </label>
              <input
                id="exit-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@domain.com"
                autoComplete="email"
                className="w-full border-b border-rule-strong bg-transparent py-2.5 text-sm outline-none focus:border-pigment-indigo"
              />

              <label className="mt-4 flex cursor-pointer items-start gap-2.5 text-xs leading-relaxed text-ink-soft">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-pigment-indigo"
                />
                {CONSENT.exit}
              </label>

              {error && (
                <p role="alert" className="mt-2 text-xs text-destructive">
                  {error}
                </p>
              )}

              <div className="mt-5 flex flex-wrap items-center gap-3">
                <button
                  type="submit"
                  disabled={busy}
                  className="rounded-full bg-pigment-indigo px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-pigment-indigo-lift disabled:opacity-60"
                >
                  {busy ? 'Adding…' : 'Keep me posted'}
                </button>
                <button
                  type="button"
                  onClick={close}
                  className="text-sm text-ink-faint underline underline-offset-4 transition-colors hover:text-ink"
                >
                  No thanks
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
