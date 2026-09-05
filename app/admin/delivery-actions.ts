'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import {
  MAX_SUBTOTAL,
  normaliseCountry,
  normaliseSubtotal,
  quoteDelivery,
  type DeliveryOption,
} from '@/lib/delivery';

/*
  Delivery zone and rate mutations.

  requireAdmin() runs first in every exported action, for the reason app/admin/actions.ts gives:
  a server action is a public HTTP endpoint with a generated URL, so not being linked from the
  UI is not access control.

  Validation lives here rather than only in the form because the form is not the only caller a
  server action can have. It is also strict about money — two decimal places, no exponent, no
  minus — because a delivery price is compared against basket values and written to an order
  line, and "1e3" quietly becoming a thousand-dollar postage charge is not a recoverable error.

  No interactive transactions anywhere in this file. Everything is a single write, for the reason
  the CRM section of CLAUDE.md sets out: prisma.$transaction(async tx => …) holds a connection
  open across round trips and deadlocks two admin writes against each other on Neon.
*/

export type ActionResult = { ok: true } | { ok: false; error: string };

const EXPIRED = 'Your session has expired. Sign in again.';

async function guard(): Promise<boolean> {
  try {
    await requireAdmin();
    return true;
  } catch {
    return false;
  }
}

function refresh() {
  revalidatePath('/admin/delivery');
  revalidatePath('/admin');
}

/* ---------------------------------------------------------------- parsing */

function text(form: FormData, key: string): string | null {
  const raw = form.get(key);
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  return trimmed.length ? trimmed : null;
}

/**
 * "gb, ie fr" → ["GB", "IE", "FR"].
 *
 * Commas, spaces and newlines all separate, because staff paste these from wherever they keep
 * them and a list that only accepts one separator produces a zone containing one long invalid
 * code. Duplicates collapse. An empty result is legitimate and meaningful: it is how the
 * catch-all zone is written.
 */
function parseCountries(raw: string | null): { ok: true; codes: string[] } | { ok: false; error: string } {
  if (!raw) return { ok: true, codes: [] };

  const tokens = raw.split(/[\s,;]+/).filter(Boolean);
  const codes: string[] = [];

  for (const token of tokens) {
    const code = normaliseCountry(token);
    if (!code) {
      return {
        ok: false,
        error: `“${token}” is not a two-letter country code. Use ISO codes such as US, GB, DE.`,
      };
    }
    if (!codes.includes(code)) codes.push(code);
  }

  return { ok: true, codes };
}

const MONEY = /^\d+(\.\d{1,2})?$/;

function parseMoney(
  raw: string | null,
  label: string,
  required: boolean
): { ok: true; value: number | null } | { ok: false; error: string } {
  if (!raw) {
    if (required) return { ok: false, error: `${label} is required.` };
    return { ok: true, value: null };
  }
  if (!MONEY.test(raw)) {
    return { ok: false, error: `${label} must be a number with up to two decimal places.` };
  }
  const value = Number(raw);
  if (value > MAX_SUBTOTAL) return { ok: false, error: `${label} looks like a typo.` };
  return { ok: true, value };
}

function parseDays(
  raw: string | null,
  label: string
): { ok: true; value: number | null } | { ok: false; error: string } {
  if (!raw) return { ok: true, value: null };
  if (!/^\d{1,3}$/.test(raw)) {
    return { ok: false, error: `${label} must be a whole number of days.` };
  }
  const value = Number(raw);
  if (value < 1 || value > 365) {
    return { ok: false, error: `${label} must be between 1 and 365 days.` };
  }
  return { ok: true, value };
}

function parsePosition(raw: string | null): number {
  if (!raw || !/^\d{1,4}$/.test(raw)) return 0;
  return Number(raw);
}

type ZoneInput = { name: string; countries: string[]; position: number };

function readZone(form: FormData): { ok: true; data: ZoneInput } | { ok: false; error: string } {
  const name = text(form, 'name');
  if (!name) return { ok: false, error: 'A zone needs a name.' };
  if (name.length > 80) return { ok: false, error: 'That zone name is too long.' };

  const countries = parseCountries(text(form, 'countries'));
  if (!countries.ok) return countries;

  return { ok: true, data: { name, countries: countries.codes, position: parsePosition(text(form, 'position')) } };
}

type RateInput = {
  name: string;
  price: number;
  minSubtotal: number | null;
  freeOverSubtotal: number | null;
  estimateMinDays: number | null;
  estimateMaxDays: number | null;
  position: number;
};

function readRate(form: FormData): { ok: true; data: RateInput } | { ok: false; error: string } {
  const name = text(form, 'name');
  if (!name) return { ok: false, error: 'A rate needs a name — what the customer will see.' };
  if (name.length > 80) return { ok: false, error: 'That rate name is too long.' };

  const price = parseMoney(text(form, 'price'), 'Price', true);
  if (!price.ok) return price;

  const min = parseMoney(text(form, 'minSubtotal'), 'Minimum basket', false);
  if (!min.ok) return min;

  const free = parseMoney(text(form, 'freeOverSubtotal'), 'Free over', false);
  if (!free.ok) return free;

  const minDays = parseDays(text(form, 'estimateMinDays'), 'The shortest estimate');
  if (!minDays.ok) return minDays;

  const maxDays = parseDays(text(form, 'estimateMaxDays'), 'The longest estimate');
  if (!maxDays.ok) return maxDays;

  if (minDays.value !== null && maxDays.value !== null && minDays.value > maxDays.value) {
    return { ok: false, error: 'The shortest estimate cannot be longer than the longest.' };
  }

  /*
    A free-over threshold at or below the minimum basket means the rate is free the moment it is
    offered at all, which is a free rate written the hard way. Say so rather than shipping a rule
    nobody can read off the table.
  */
  if (min.value !== null && free.value !== null && free.value <= min.value) {
    return {
      ok: false,
      error: 'Free over is at or below the minimum basket, so this rate would never be charged. Set the price to 0 instead.',
    };
  }

  return {
    ok: true,
    data: {
      name,
      price: price.value!,
      minSubtotal: min.value,
      freeOverSubtotal: free.value,
      estimateMinDays: minDays.value,
      estimateMaxDays: maxDays.value,
      position: parsePosition(text(form, 'position')),
    },
  };
}

/* ------------------------------------------------------------------ zones */

export async function createZone(form: FormData): Promise<ActionResult> {
  if (!(await guard())) return { ok: false, error: EXPIRED };

  const parsed = readZone(form);
  if (!parsed.ok) return parsed;

  await prisma.deliveryZone.create({ data: parsed.data });
  refresh();
  return { ok: true };
}

export async function updateZone(id: string, form: FormData): Promise<ActionResult> {
  if (!(await guard())) return { ok: false, error: EXPIRED };

  const parsed = readZone(form);
  if (!parsed.ok) return parsed;

  const existing = await prisma.deliveryZone.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return { ok: false, error: 'That zone no longer exists.' };

  await prisma.deliveryZone.update({ where: { id }, data: parsed.data });
  refresh();
  return { ok: true };
}

/**
 * Remove a zone and, by cascade, its rates.
 *
 * The confirmation naming the zone and its rate count is the caller's job — see
 * components/admin/delivery-manager.tsx. Nothing here can un-delete a rate table.
 */
export async function deleteZone(id: string): Promise<ActionResult> {
  if (!(await guard())) return { ok: false, error: EXPIRED };

  const existing = await prisma.deliveryZone.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return { ok: false, error: 'That zone has already been removed.' };

  await prisma.deliveryZone.delete({ where: { id } });
  refresh();
  return { ok: true };
}

export async function toggleZoneActive(id: string, active: boolean): Promise<ActionResult> {
  if (!(await guard())) return { ok: false, error: EXPIRED };

  const existing = await prisma.deliveryZone.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return { ok: false, error: 'That zone no longer exists.' };

  await prisma.deliveryZone.update({ where: { id }, data: { active } });
  refresh();
  return { ok: true };
}

/* ------------------------------------------------------------------ rates */

export async function createRate(zoneId: string, form: FormData): Promise<ActionResult> {
  if (!(await guard())) return { ok: false, error: EXPIRED };

  const parsed = readRate(form);
  if (!parsed.ok) return parsed;

  const zone = await prisma.deliveryZone.findUnique({ where: { id: zoneId }, select: { id: true } });
  if (!zone) return { ok: false, error: 'That zone no longer exists.' };

  await prisma.deliveryRate.create({ data: { ...parsed.data, zoneId } });
  refresh();
  return { ok: true };
}

export async function updateRate(id: string, form: FormData): Promise<ActionResult> {
  if (!(await guard())) return { ok: false, error: EXPIRED };

  const parsed = readRate(form);
  if (!parsed.ok) return parsed;

  const existing = await prisma.deliveryRate.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return { ok: false, error: 'That rate no longer exists.' };

  await prisma.deliveryRate.update({ where: { id }, data: parsed.data });
  refresh();
  return { ok: true };
}

export async function deleteRate(id: string): Promise<ActionResult> {
  if (!(await guard())) return { ok: false, error: EXPIRED };

  const existing = await prisma.deliveryRate.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return { ok: false, error: 'That rate has already been removed.' };

  await prisma.deliveryRate.delete({ where: { id } });
  refresh();
  return { ok: true };
}

export async function toggleRateActive(id: string, active: boolean): Promise<ActionResult> {
  if (!(await guard())) return { ok: false, error: EXPIRED };

  const existing = await prisma.deliveryRate.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return { ok: false, error: 'That rate no longer exists.' };

  await prisma.deliveryRate.update({ where: { id }, data: { active } });
  refresh();
  return { ok: true };
}

/* ---------------------------------------------------------------- preview */

export type PreviewResult =
  | {
      ok: true;
      country: string;
      subtotal: number;
      zone: { id: string; name: string; isCatchAll: boolean } | null;
      options: DeliveryOption[];
    }
  | { ok: false; error: string };

/**
 * Answer the only question a rates table cannot answer by being read: what would a customer
 * here, with this basket, actually be shown?
 *
 * It goes through `quoteDelivery` — the same function the public endpoint and the checkout call —
 * rather than re-deriving the rules for the admin. A preview that computes its own answer is
 * worse than no preview, because it agrees with the customer's experience only by coincidence.
 */
export async function previewDelivery(input: {
  country: unknown;
  subtotal: unknown;
}): Promise<PreviewResult> {
  if (!(await guard())) return { ok: false, error: EXPIRED };

  const country = normaliseCountry(input.country);
  if (!country) {
    return { ok: false, error: 'Give a two-letter country code, such as US or GB.' };
  }

  const subtotal = normaliseSubtotal(input.subtotal);
  const quote = await quoteDelivery({ country, subtotal });

  return { ok: true, country, subtotal, zone: quote.zone, options: quote.options };
}
