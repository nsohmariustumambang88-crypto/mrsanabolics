'use server';

import { revalidatePath } from 'next/cache';
import type { OrderStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import {
  addOrderNote,
  createOrder,
  setOrderStatus,
  STATUS_LABEL,
  type CreateOrderInput,
} from '@/lib/orders/orders';

/*
  Order mutations.

  Every action calls requireAdmin() first, for the reason given in app/admin/actions.ts: a server
  action is a public HTTP endpoint with a generated URL, so being unreachable from the UI is not
  access control.

  Nothing here records a payment, and nothing here should ever be extended to. The Order model
  carries no payment fields; an action that marked an order "paid" would be asserting something
  no part of this system observed.
*/

export type ActionResult = { ok: true } | { ok: false; error: string };

function fail(error: string): ActionResult {
  return { ok: false, error };
}

async function admin(): Promise<{ email: string } | null> {
  try {
    const session = await requireAdmin();
    return { email: session.email };
  } catch {
    return null;
  }
}

function refresh(orderId?: string) {
  revalidatePath('/admin/orders');
  revalidatePath('/admin');
  if (orderId) revalidatePath(`/admin/orders/${orderId}`);
}

export type CreateOrderFormResult =
  | { ok: true; id: string; reference: string }
  | { ok: false; error: string };

/**
 * Record an order taken off-system — by phone, by email, in person.
 *
 * The public checkout does not create orders on this build, because it cannot take payment; this
 * is the back-office path for an order somebody placed another way. It records what was agreed,
 * not that anything was received.
 */
export async function createOrderAction(form: FormData): Promise<CreateOrderFormResult> {
  const who = await admin();
  if (!who) return { ok: false, error: 'Your session has expired. Sign in again.' };

  const text = (key: string) => {
    const raw = form.get(key);
    if (typeof raw !== 'string') return null;
    const trimmed = raw.trim();
    return trimmed.length ? trimmed : null;
  };

  const contactId = text('contactId');
  if (!contactId) return { ok: false, error: 'Choose which contact this order is for.' };

  const required = ['shipName', 'shipLine1', 'shipCity', 'shipPostcode', 'shipCountry'] as const;
  for (const key of required) {
    if (!text(key)) return { ok: false, error: 'A delivery address needs all of its parts.' };
  }

  /*
    Lines arrive as repeated productId/quantity pairs. Anything with a quantity of zero is simply
    not ordered — the form offers the whole catalogue, and most of it will be blank.
  */
  const productIds = form.getAll('productId').filter((v): v is string => typeof v === 'string');
  const quantities = form.getAll('quantity').filter((v): v is string => typeof v === 'string');

  const lines = productIds
    .map((productId, index) => ({
      productId,
      quantity: Number.parseInt(quantities[index] ?? '0', 10) || 0,
    }))
    .filter((line) => line.quantity > 0);

  if (lines.length === 0) return { ok: false, error: 'Set a quantity on at least one product.' };
  if (lines.some((l) => l.quantity > 1000)) {
    return { ok: false, error: 'That quantity looks like a typo.' };
  }

  const shippingRaw = text('shippingCost');
  if (shippingRaw && !/^\d+(\.\d{1,2})?$/.test(shippingRaw)) {
    return { ok: false, error: 'Shipping must be a number with up to two decimal places.' };
  }

  const input: CreateOrderInput = {
    contactId,
    lines,
    shipping: {
      name: text('shipName')!,
      line1: text('shipLine1')!,
      line2: text('shipLine2'),
      city: text('shipCity')!,
      postcode: text('shipPostcode')!,
      country: text('shipCountry')!,
    },
    shippingCost: shippingRaw ? Number(shippingRaw) : 0,
    shippingMethod: text('shippingMethod'),
    /*
      Passed as a CODE, never as an amount. createOrder re-evaluates it against the live
      discount table; anything the form could have said about what it is worth is ignored.
    */
    discountCode: text('discountCode'),
    notes: text('notes'),
    actorEmail: who.email,
  };

  const result = await createOrder(input);
  if (!result.ok) return { ok: false, error: result.error };

  refresh(result.id);
  revalidatePath(`/admin/contacts/${contactId}`);
  return { ok: true, id: result.id, reference: result.reference };
}

export async function setOrderStatusAction(
  orderId: string,
  status: OrderStatus
): Promise<ActionResult> {
  const who = await admin();
  if (!who) return fail('Your session has expired. Sign in again.');
  if (!STATUS_LABEL[status]) return fail('Unknown status.');

  const result = await setOrderStatus(orderId, status, who.email);
  if (!result.ok) return fail(result.error);

  refresh(orderId);
  revalidatePath('/admin/contacts');
  return { ok: true };
}

export async function addOrderNoteAction(orderId: string, body: string): Promise<ActionResult> {
  const who = await admin();
  if (!who) return fail('Your session has expired. Sign in again.');

  const result = await addOrderNote(orderId, body, who.email);
  if (!result.ok) return fail(result.error);

  refresh(orderId);
  return { ok: true };
}

export type OrderBulkAction =
  | 'delete'
  | 'status-CONFIRMED'
  | 'status-PACKED'
  | 'status-SHIPPED'
  | 'status-DELIVERED'
  | 'status-CANCELLED';

export async function bulkOrderAction(
  orderIds: string[],
  action: OrderBulkAction
): Promise<ActionResult> {
  const who = await admin();
  if (!who) return fail('Your session has expired. Sign in again.');

  if (orderIds.length === 0) return fail('Select at least one order.');
  if (orderIds.length > 500) return fail('That is more orders than one action should touch.');

  if (action === 'delete') {
    /* Items and events cascade from the order; the contact and their timeline are untouched. */
    await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
    refresh();
    revalidatePath('/admin/contacts');
    return { ok: true };
  }

  const status = action.slice('status-'.length) as OrderStatus;
  if (!STATUS_LABEL[status]) return fail('Unknown bulk action.');

  /*
    One at a time on purpose. Each move has to stamp its own milestone, write its own event and
    put a line on the right contact's timeline — an updateMany would change the status and record
    none of it.
  */
  for (const id of orderIds) {
    const result = await setOrderStatus(id, status, who.email);
    if (!result.ok) return fail(result.error);
  }

  refresh();
  revalidatePath('/admin/contacts');
  return { ok: true };
}

export async function deleteOrder(orderId: string): Promise<ActionResult> {
  const who = await admin();
  if (!who) return fail('Your session has expired. Sign in again.');

  const order = await prisma.order.findUnique({ where: { id: orderId }, select: { id: true } });
  if (!order) return fail('That order no longer exists.');

  await prisma.order.delete({ where: { id: orderId } });

  refresh();
  revalidatePath('/admin/contacts');
  return { ok: true };
}
