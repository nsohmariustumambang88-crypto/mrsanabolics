import 'server-only';

import { asBoolean, getSettings } from '@/lib/settings';
import { fridayWindowContaining, nextFridayWindow } from '@/lib/offers/friday';

/*
  Whether Friday 5% is running, as the server decides it: the `friday_offer_enabled` setting
  (the kill switch, Admin → Settings → Commerce, on by default) and the server's own clock.

  A failed settings read counts as OFF. Money is never given away on a read that did not happen;
  the checkout's guard (lib/orders/orders.ts) then tells a shopper who was shown the discount
  that it was not applied, rather than charging them a different total silently.
*/

export async function weeklyOfferSwitchOn(): Promise<boolean> {
  try {
    const settings = await getSettings();
    return asBoolean(settings.friday_offer_enabled);
  } catch {
    return false;
  }
}

export type WeeklyOfferState = {
  active: boolean;
  /** When the running window ends; null when none is running. */
  endsAt: string | null;
  /** When the next window starts. */
  nextStartsAt: string;
};

export async function weeklyOfferState(now: Date = new Date()): Promise<WeeklyOfferState> {
  const window = fridayWindowContaining(now);
  const on = window ? await weeklyOfferSwitchOn() : false;
  return {
    active: Boolean(window) && on,
    endsAt: window && on ? window.end.toISOString() : null,
    nextStartsAt: nextFridayWindow(now).start.toISOString(),
  };
}

/** True when an order created at `now` gets Friday 5% (if its basket qualifies). */
export async function weeklyOfferActiveAt(now: Date = new Date()): Promise<boolean> {
  return (await weeklyOfferState(now)).active;
}
