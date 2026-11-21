'use client';

import * as React from 'react';
import { fridayWindowContaining, nextFridayWindow } from '@/lib/offers/friday';

/*
  Whether to show Friday 5%, in the browser.

  `gateOnClock` (the banner, the cart): the visitor's own clock decides first. Only when it says
  the window is open is the server asked (/api/offer), for the kill switch. So a page cached
  hours ago cannot show the offer at the wrong time, and the other six days cost no request.

  Without it (the checkout): the server alone decides, because the checkout's total must be the
  total createOrder stores, whatever the visitor's clock says.

  The answer is re-checked when the window opens or closes, and every ten minutes while open.
  One request serves every component on the page.
*/

type ServerState = { active: boolean; endsAt: string | null };

let shared: { at: number; value: Promise<ServerState> } | null = null;

function serverState(): Promise<ServerState> {
  if (shared && Date.now() - shared.at < 60_000) return shared.value;
  const value = fetch('/api/offer', { cache: 'no-store' })
    .then((r) => (r.ok ? r.json() : { active: false, endsAt: null }))
    .then((d: Partial<ServerState>) => ({ active: Boolean(d.active), endsAt: d.endsAt ?? null }))
    .catch(() => ({ active: false, endsAt: null }));
  shared = { at: Date.now(), value };
  return value;
}

export type WeeklyOffer = {
  /** Show it: the offer is running. */
  active: boolean;
  /** When the running window ends. */
  endsAt: Date | null;
  /** The server has answered (or the clock ruled it out). */
  ready: boolean;
  /** Ask the server again now (the checkout, after the server refused an order). */
  refresh: () => void;
};

const MAX_TIMER = 10 * 60 * 1000;

type OfferState = Omit<WeeklyOffer, 'refresh'>;

export function useWeeklyOffer({ gateOnClock }: { gateOnClock: boolean }): WeeklyOffer {
  const [state, setState] = React.useState<OfferState>({ active: false, endsAt: null, ready: false });
  const [nonce, setNonce] = React.useState(0);
  const refresh = React.useCallback(() => {
    shared = null;
    setNonce((n) => n + 1);
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const schedule = (at: number) => {
      const wait = Math.max(1_000, Math.min(MAX_TIMER, at - Date.now() + 1_000));
      timer = setTimeout(run, wait);
    };

    async function run() {
      const now = new Date();
      const window = fridayWindowContaining(now);
      if (gateOnClock && !window) {
        if (!cancelled) setState({ active: false, endsAt: null, ready: true });
        schedule(nextFridayWindow(now).start.getTime());
        return;
      }
      const server = await serverState();
      if (cancelled) return;
      const endsAt = server.endsAt ? new Date(server.endsAt) : null;
      setState({ active: server.active, endsAt, ready: true });
      schedule(endsAt ? endsAt.getTime() : window ? window.end.getTime() : nextFridayWindow(now).start.getTime());
    }

    void run();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [gateOnClock, nonce]);

  return { ...state, refresh };
}
