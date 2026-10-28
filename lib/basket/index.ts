import 'server-only';

import { createHash, randomBytes } from 'crypto';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { isVisitorToken } from '@/lib/analytics/track';

/*
  The saved basket: a server-side copy of what a browser has in its cart.

  The cart itself still lives in localStorage (components/providers/store-provider.tsx). This copy
  exists for two things the browser cannot do: remind a subscriber about a basket they left, and
  put that same basket back on another device from a link.

  Rules it keeps:
  - THE BROWSER SENDS PRODUCT IDS AND QUANTITIES, NOTHING ELSE. Names, prices and pictures are
    read from the database here, so a tampered request cannot make a reminder quote a price.
  - KEYED ON THE ANALYTICS VISITOR (`mra_vid`), one live basket per browser. A browser without
    that cookie saves nothing.
  - AN EMPTY BASKET IS DELETED, so a row always means items somebody still has. A new basket
    after an order or a clear-out starts fresh and can be reminded about once.
  - Saving a basket is not consent to be emailed; lib/basket/reminders.ts mails only a visitor
    linked to a SUBSCRIBED contact.
*/

export type BasketLine = {
  productId: string;
  slug: string;
  name: string;
  brand: string;
  image: string;
  price: number;
  quantity: number;
};

const MAX_LINES = 50;
const MAX_QTY = 99;

export function hashRestoreToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function newRestoreToken(): string {
  return randomBytes(32).toString('base64url');
}

async function visitorFor(token: string | undefined) {
  if (!isVisitorToken(token)) return null;
  return prisma.visitor.findUnique({ where: { token }, select: { id: true } });
}

/** Price the requested lines from the database; unknown products and silly quantities drop out. */
export async function priceLines(raw: unknown): Promise<BasketLine[]> {
  if (!Array.isArray(raw)) return [];
  const wanted = new Map<string, number>();
  for (const entry of raw.slice(0, MAX_LINES)) {
    const id = typeof entry?.productId === 'string' ? entry.productId : '';
    const qty = Math.floor(Number(entry?.quantity));
    if (!id || !Number.isFinite(qty) || qty < 1) continue;
    wanted.set(id, Math.min(MAX_QTY, (wanted.get(id) ?? 0) + qty));
  }
  if (wanted.size === 0) return [];

  const products = await prisma.product.findMany({
    where: { id: { in: [...wanted.keys()] } },
    select: { id: true, slug: true, name: true, price: true, images: true, brand: { select: { name: true } } },
  });
  return products.map((p) => ({
    productId: p.id,
    slug: p.slug,
    name: p.name,
    brand: p.brand?.name ?? '',
    image: p.images[0] ?? '',
    price: Number(p.price),
    quantity: wanted.get(p.id) ?? 1,
  }));
}

/**
 * Save this browser's basket. `checkout` stamps that it reached the checkout with these items.
 * Returns quietly when there is no visitor to save against.
 */
export async function saveBasket(visitorToken: string | undefined, rawItems: unknown, opts: { checkout?: boolean } = {}) {
  const visitor = await visitorFor(visitorToken);
  if (!visitor) return;

  const lines = await priceLines(rawItems);
  if (lines.length === 0) {
    await prisma.basket.deleteMany({ where: { visitorId: visitor.id } });
    return;
  }

  const subtotal = lines.reduce((sum, l) => sum + l.price * l.quantity, 0);
  const itemCount = lines.reduce((sum, l) => sum + l.quantity, 0);
  const items = lines as unknown as Prisma.InputJsonValue;
  const checkoutAt = opts.checkout ? new Date() : undefined;

  await prisma.basket.upsert({
    where: { visitorId: visitor.id },
    create: { visitorId: visitor.id, items, itemCount, subtotal, checkoutAt },
    update: {
      items,
      itemCount,
      subtotal,
      ...(checkoutAt ? { checkoutAt } : {}),
      /* A basket an order already came from is a new basket once it has items again. */
      orderedAt: null,
      orderReference: null,
    },
  });
}

/** The order was placed from this browser: never remind about this basket. */
export async function markBasketOrdered(visitorToken: string | undefined, reference: string) {
  const visitor = await visitorFor(visitorToken);
  if (!visitor) return;
  await prisma.basket.updateMany({
    where: { visitorId: visitor.id },
    data: { orderedAt: new Date(), orderReference: reference },
  });
}

/** How long a reminder's "restore my basket" link works. */
export const RESTORE_DAYS = 30;

/**
 * The lines behind a restore link, re-read from the catalogue so the prices are today's and
 * products that are gone or out of stock are left out.
 */
export async function restoreBasket(token: unknown): Promise<BasketLine[] | null> {
  if (typeof token !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  const basket = await prisma.basket.findUnique({
    where: { restoreTokenHash: hashRestoreToken(token) },
    select: { items: true, remindedAt: true },
  });
  if (!basket?.remindedAt) return null;
  if (Date.now() - basket.remindedAt.getTime() > RESTORE_DAYS * 24 * 60 * 60 * 1000) return null;

  const saved = (basket.items as unknown as BasketLine[]) ?? [];
  const fresh = await priceLines(saved.map((l) => ({ productId: l.productId, quantity: l.quantity })));
  const inStock = new Set(
    (
      await prisma.product.findMany({
        where: { id: { in: fresh.map((l) => l.productId) }, inStock: true },
        select: { id: true },
      })
    ).map((p) => p.id)
  );
  return fresh.filter((l) => inStock.has(l.productId));
}
