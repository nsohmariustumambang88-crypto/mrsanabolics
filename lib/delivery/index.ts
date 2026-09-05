import 'server-only';

import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

/*
  Delivery zones and rates: what a basket going to a given country can actually be sent by.

  Two rules carry the whole model, and both are here rather than in the UI so the checkout, the
  public quote endpoint and the admin preview cannot disagree about what a customer is offered:

  1. A zone that names the country wins over the catch-all, regardless of position. Position only
     breaks ties between two zones that both name it — first one wins, so a specific zone can be
     placed above a broader one without inventing a precedence field.

  2. The catch-all is the zone with an EMPTY country list. There may be none, and that is a real
     and dangerous state rather than an empty result: it means anyone outside the named zones is
     offered no delivery at all and cannot check out. The admin screen raises it as a warning for
     exactly that reason; here it is simply `null`, which every caller must handle.

  Money crosses the Prisma boundary as Decimal and leaves here as plain numbers, the same
  conversion lib/orders/orders.ts makes, so nothing downstream has to know the difference.
*/

export type DeliveryRateRecord = {
  id: string;
  zoneId: string;
  name: string;
  price: number;
  minSubtotal: number | null;
  freeOverSubtotal: number | null;
  estimateMinDays: number | null;
  estimateMaxDays: number | null;
  active: boolean;
  position: number;
};

export type DeliveryZoneRecord = {
  id: string;
  name: string;
  countries: string[];
  active: boolean;
  position: number;
  rates: DeliveryRateRecord[];
};

/** One option as a customer would be shown it — the price already resolved, not a rule to apply. */
export type DeliveryOption = {
  rateId: string;
  zoneId: string;
  zoneName: string;
  name: string;
  /** What this delivery costs for the basket that was quoted. */
  price: number;
  /** The rate's ordinary price, kept so the UI can strike it through when the basket earned free. */
  basePrice: number;
  free: boolean;
  estimate: string;
};

export type DeliveryQuote = {
  /** The zone that matched, or null when nothing covers this country. */
  zone: { id: string; name: string; isCatchAll: boolean } | null;
  options: DeliveryOption[];
};

/** The largest basket this system will reason about. Anything above it is a typo or an attack. */
export const MAX_SUBTOTAL = 1_000_000;

/* ------------------------------------------------------------------ helpers */

const money = (value: unknown): number => Number(value);

/**
 * Normalise a country to the ISO alpha-2 form the zones are stored in.
 *
 * Returns null for anything that is not two letters, so a caller cannot accidentally match on
 * a stray "United Kingdom" or an empty string — and an empty string matching nothing is
 * important, because the catch-all zone is also expressed as an empty list.
 */
export function normaliseCountry(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const code = input.trim().toUpperCase();
  return /^[A-Z]{2}$/.test(code) ? code : null;
}

/** Clamp a basket value to something a delivery rule can be compared against. */
export function normaliseSubtotal(input: unknown): number {
  const value = typeof input === 'number' ? input : Number(input);
  if (!Number.isFinite(value) || value < 0) return 0;
  return Math.min(value, MAX_SUBTOTAL);
}

function toRecord(zone: {
  id: string;
  name: string;
  countries: string[];
  active: boolean;
  position: number;
  rates: {
    id: string;
    zoneId: string;
    name: string;
    price: unknown;
    minSubtotal: unknown;
    freeOverSubtotal: unknown;
    estimateMinDays: number | null;
    estimateMaxDays: number | null;
    active: boolean;
    position: number;
  }[];
}): DeliveryZoneRecord {
  return {
    id: zone.id,
    name: zone.name,
    countries: zone.countries,
    active: zone.active,
    position: zone.position,
    rates: zone.rates.map((rate) => ({
      id: rate.id,
      zoneId: rate.zoneId,
      name: rate.name,
      price: money(rate.price),
      minSubtotal: rate.minSubtotal === null ? null : money(rate.minSubtotal),
      freeOverSubtotal: rate.freeOverSubtotal === null ? null : money(rate.freeOverSubtotal),
      estimateMinDays: rate.estimateMinDays,
      estimateMaxDays: rate.estimateMaxDays,
      active: rate.active,
      position: rate.position,
    })),
  };
}

/*
  Position first, then age. Two zones (or two rates) sharing a position must not swap places
  between two renders of the same screen — a table that reorders itself when nothing changed is
  read as a bug in the rules rather than in the sort.
*/
const ZONE_ORDER: Prisma.DeliveryZoneOrderByWithRelationInput[] = [
  { position: 'asc' },
  { createdAt: 'asc' },
];

const RATE_ORDER: Prisma.DeliveryRateOrderByWithRelationInput[] = [
  { position: 'asc' },
  { createdAt: 'asc' },
];

/* ------------------------------------------------------------------ reading */

/** Every zone, active or not, in the order they are matched. For the admin screen. */
export async function listDeliveryZones(): Promise<DeliveryZoneRecord[]> {
  const zones = await prisma.deliveryZone.findMany({
    orderBy: ZONE_ORDER,
    include: { rates: { orderBy: RATE_ORDER } },
  });
  return zones.map(toRecord);
}

/**
 * The zone that serves a country.
 *
 * A named match wins; failing that the catch-all (empty country list) takes it; failing that
 * there is nowhere to send to and this returns null. Inactive zones are invisible to matching,
 * which is what "active" means — a zone switched off must not quietly keep claiming its
 * countries away from the catch-all.
 */
export async function zoneForCountry(code: unknown): Promise<DeliveryZoneRecord | null> {
  const country = normaliseCountry(code);
  if (!country) return null;

  const zones = await prisma.deliveryZone.findMany({
    where: { active: true },
    orderBy: ZONE_ORDER,
    include: { rates: { orderBy: RATE_ORDER } },
  });

  const named = zones.find((zone) => zone.countries.includes(country));
  if (named) return toRecord(named);

  const catchAll = zones.find((zone) => zone.countries.length === 0);
  return catchAll ? toRecord(catchAll) : null;
}

/** True when someone in an unnamed country would still be offered something. */
export async function hasActiveCatchAllZone(): Promise<boolean> {
  const count = await prisma.deliveryZone.count({
    where: { active: true, countries: { isEmpty: true } },
  });
  return count > 0;
}

/* ------------------------------------------------------------------ quoting */

/**
 * What a customer in `country` with a basket of `subtotal` is offered, cheapest first.
 *
 * Inactive rates are not offered. A rate with a `minSubtotal` above the basket is not offered at
 * all rather than shown greyed out — an option a person cannot take is noise at the one moment
 * they are trying to finish. A rate whose `freeOverSubtotal` the basket meets is offered at zero,
 * with its ordinary price kept alongside so the saving can be shown.
 */
export async function quoteDelivery({
  country,
  subtotal,
}: {
  country: unknown;
  subtotal: unknown;
}): Promise<DeliveryQuote> {
  const basket = normaliseSubtotal(subtotal);
  const zone = await zoneForCountry(country);
  if (!zone) return { zone: null, options: [] };

  const options: DeliveryOption[] = zone.rates
    .filter((rate) => rate.active)
    .filter((rate) => rate.minSubtotal === null || basket >= rate.minSubtotal)
    .map((rate) => {
      const free = rate.freeOverSubtotal !== null && basket >= rate.freeOverSubtotal;
      return {
        rateId: rate.id,
        zoneId: zone.id,
        zoneName: zone.name,
        name: rate.name,
        price: free ? 0 : rate.price,
        basePrice: rate.price,
        free,
        estimate: formatEstimate(rate),
      };
    })
    /* Cheapest first, then the order staff put them in — two free options must not shuffle. */
    .sort((a, b) => a.price - b.price || a.name.localeCompare(b.name));

  return {
    zone: { id: zone.id, name: zone.name, isCatchAll: zone.countries.length === 0 },
    options,
  };
}

/* --------------------------------------------------------------- estimates */

/**
 * "3–5 working days", "Next working day", or "" when no estimate is set.
 *
 * En dash, not a hyphen: it is a range, and the hyphen reads as a compound. An unset estimate
 * returns the empty string rather than "unknown" so the caller renders nothing at all — a
 * promise nobody made should not occupy a line.
 */
export function formatEstimate(rate: {
  estimateMinDays: number | null;
  estimateMaxDays: number | null;
}): string {
  const min = rate.estimateMinDays;
  const max = rate.estimateMaxDays;

  if (min === null && max === null) return '';

  /* Only one end filled in is a single figure, not half a range. */
  if (min === null || max === null || min === max) {
    const single = (min ?? max) as number;
    return single === 1 ? 'Next working day' : `${single} working days`;
  }

  const lo = Math.min(min, max);
  const hi = Math.max(min, max);
  return `${lo}–${hi} working days`;
}
