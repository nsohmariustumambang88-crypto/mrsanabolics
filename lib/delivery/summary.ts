import 'server-only';

import { prisma } from '@/lib/prisma';
import { formatEstimate } from '@/lib/delivery';

/*
  The delivery zones in a shape small enough to send to the browser, and to read on every
  product page's structured data.

  The header's country selector, the product page's delivery line and the cart's free-delivery
  line all need "what does sending to this country cost", and the answer must be the one the
  checkout will give. So it is read from the same tables quoteDelivery reads, with the same rule
  (a zone naming the country wins; otherwise the catch-all), applied in lib/delivery/match.ts.

  Memoised per process for a minute, like the catalogue: the storefront layout renders on every
  page regeneration, and the zones change a few times a year. It fails soft to an empty list —
  a missing delivery line costs a sentence, never the page.
*/

export type RateSummary = {
  name: string;
  price: number;
  freeOver: number | null;
  minDays: number | null;
  maxDays: number | null;
  /** formatEstimate's English text, for server-rendered English copy. */
  estimate: string;
};

export type ZoneSummary = {
  name: string;
  /** ISO alpha-2 codes. Empty means the catch-all ("rest of world"). */
  countries: string[];
  /** Active rates, cheapest first. */
  rates: RateSummary[];
};

const TTL_MS = 60_000;
let at = 0;
let inFlight: Promise<ZoneSummary[]> | null = null;

async function read(): Promise<ZoneSummary[]> {
  const zones = await prisma.deliveryZone.findMany({
    where: { active: true },
    orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
    include: { rates: { where: { active: true }, orderBy: [{ position: 'asc' }, { createdAt: 'asc' }] } },
  });
  return zones.map((z) => ({
    name: z.name,
    countries: z.countries,
    rates: z.rates
      .map((r) => ({
        name: r.name,
        price: Number(r.price),
        freeOver: r.freeOverSubtotal === null ? null : Number(r.freeOverSubtotal),
        minDays: r.estimateMinDays,
        maxDays: r.estimateMaxDays,
        estimate: formatEstimate(r),
      }))
      .sort((a, b) => a.price - b.price),
  }));
}

export function getDeliverySummary(): Promise<ZoneSummary[]> {
  if (inFlight && Date.now() - at < TTL_MS) return inFlight;
  at = Date.now();
  inFlight = read().catch(() => {
    inFlight = null;
    at = 0;
    return [];
  });
  return inFlight;
}
