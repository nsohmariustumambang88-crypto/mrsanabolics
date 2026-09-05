'use server';

import { revalidatePath } from 'next/cache';
import { Prisma, type DiscountStatus, type DiscountType } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { normaliseCode } from '@/lib/discounts';

/*
  Discount mutations.

  Every action calls requireAdmin() first, for the reason given in app/admin/actions.ts: a server
  action is a public HTTP endpoint with a generated URL, so being unreachable from the UI is not
  access control.

  Validation here is not politeness. A percentage over 100, a negative value, or an end date
  before the start are each a way to hand money away or to create a code that can never work, and
  neither the database nor the evaluator will stop them — `evaluateDiscount` caps the damage at
  the basket total, but a 300%-off code that quietly discounts everything to zero is still a
  live incident. The door is here.
*/

export type ActionResult = { ok: true; message?: string } | { ok: false; error: string };

const EXPIRED_SESSION = 'Your session has expired. Sign in again.';

function fail(error: string): ActionResult {
  return { ok: false, error };
}

async function admin(): Promise<boolean> {
  try {
    await requireAdmin();
    return true;
  } catch {
    return false;
  }
}

function refresh(id?: string) {
  revalidatePath('/admin/discounts');
  if (id) revalidatePath(`/admin/discounts/${id}`);
}

/* ------------------------------------------------------------------ parsing */

function text(form: FormData, key: string): string | null {
  const raw = form.get(key);
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  return trimmed.length ? trimmed : null;
}

const TYPES: DiscountType[] = ['PERCENTAGE', 'FIXED', 'FREE_SHIPPING'];
const STATUSES: DiscountStatus[] = ['ACTIVE', 'PAUSED', 'EXPIRED'];

/*
  Codes are typed by people, off a card or out of an email. Spaces are stripped rather than
  rejected, and the result is upper-cased, so "spring 24" and "SPRING24" become one code rather
  than two rows that look identical in a list.
*/
const CODE_SHAPE = /^[A-Z0-9_-]{2,64}$/;

type Parsed = {
  code: string;
  description: string | null;
  type: DiscountType;
  value: Prisma.Decimal;
  status: DiscountStatus;
  minSubtotal: Prisma.Decimal | null;
  startsAt: Date | null;
  endsAt: Date | null;
  usageLimit: number | null;
  perContactLimit: number | null;
  categoryId: string | null;
};

/** A money-shaped string: at most two decimal places, never negative. */
function money(raw: string): number | null {
  if (!/^\d+(\.\d{1,2})?$/.test(raw)) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function whole(raw: string): number | null {
  if (!/^\d+$/.test(raw)) return null;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) ? n : null;
}

/*
  Dates arrive as an ISO instant with an explicit Z, not as a bare datetime-local string.

  The form stamps the zone on before sending (see components/admin/discount-form.tsx). Parsing
  "2026-03-01T09:00" here instead would resolve it in whatever timezone the HOST happens to run
  in, so the same window would open at a different moment on a different deploy, and every edit
  would shift the row a little further. An instant is an instant everywhere.
*/
function instant(raw: string): Date | null {
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parse(form: FormData): Parsed | { error: string } {
  const rawCode = text(form, 'code');
  if (!rawCode) return { error: 'A code is required.' };

  const code = normaliseCode(rawCode);
  if (!CODE_SHAPE.test(code)) {
    return {
      error:
        'A code can use letters, numbers, hyphens and underscores only, and needs at least two characters.',
    };
  }

  const rawType = text(form, 'type');
  if (!rawType || !TYPES.includes(rawType as DiscountType)) {
    return { error: 'Choose what kind of discount this is.' };
  }
  const type = rawType as DiscountType;

  const rawStatus = text(form, 'status') ?? 'ACTIVE';
  if (!STATUSES.includes(rawStatus as DiscountStatus)) {
    return { error: 'Unknown status.' };
  }
  const status = rawStatus as DiscountStatus;

  /* Free shipping carries no value; the schema needs one, so it is recorded as zero. */
  let value = 0;
  if (type !== 'FREE_SHIPPING') {
    const rawValue = text(form, 'value');
    if (!rawValue) return { error: 'A discount needs a value.' };

    /* Caught explicitly rather than by the shape test, so the message names the real mistake. */
    if (rawValue.startsWith('-')) return { error: 'A discount value cannot be negative.' };

    const parsedValue = money(rawValue);
    if (parsedValue === null) {
      return { error: 'The value must be a number with up to two decimal places.' };
    }
    if (parsedValue <= 0) return { error: 'A discount of nothing is not a discount.' };
    if (type === 'PERCENTAGE' && parsedValue > 100) {
      return { error: 'A percentage discount cannot be more than 100%.' };
    }
    value = parsedValue;
  }

  let minSubtotal: number | null = null;
  const rawMin = text(form, 'minSubtotal');
  if (rawMin) {
    if (rawMin.startsWith('-')) return { error: 'A minimum basket cannot be negative.' };
    minSubtotal = money(rawMin);
    if (minSubtotal === null) {
      return { error: 'The minimum basket must be a number with up to two decimal places.' };
    }
  }

  let startsAt: Date | null = null;
  const rawStart = text(form, 'startsAt');
  if (rawStart) {
    startsAt = instant(rawStart);
    if (!startsAt) return { error: 'The start date could not be read.' };
  }

  let endsAt: Date | null = null;
  const rawEnd = text(form, 'endsAt');
  if (rawEnd) {
    endsAt = instant(rawEnd);
    if (!endsAt) return { error: 'The end date could not be read.' };
  }

  if (startsAt && endsAt && endsAt.getTime() <= startsAt.getTime()) {
    return { error: 'The end of the window has to come after its start.' };
  }

  let usageLimit: number | null = null;
  const rawUsage = text(form, 'usageLimit');
  if (rawUsage) {
    usageLimit = whole(rawUsage);
    if (usageLimit === null || usageLimit < 1) {
      return { error: 'A usage limit must be a whole number of at least one, or left blank.' };
    }
  }

  let perContactLimit: number | null = null;
  const rawPer = text(form, 'perContactLimit');
  if (rawPer) {
    perContactLimit = whole(rawPer);
    if (perContactLimit === null || perContactLimit < 1) {
      return {
        error: 'A per-customer limit must be a whole number of at least one, or left blank.',
      };
    }
  }

  return {
    code,
    description: text(form, 'description'),
    type,
    value: new Prisma.Decimal(value),
    status,
    minSubtotal: minSubtotal === null ? null : new Prisma.Decimal(minSubtotal),
    startsAt,
    endsAt,
    usageLimit,
    perContactLimit,
    categoryId: text(form, 'categoryId'),
  };
}

/**
 * Turn a duplicate-key rejection into a sentence.
 *
 * P2002 on this table can only mean the code, which is the one unique column — and "Unique
 * constraint failed on the fields: (`code`)" in a notice is a database error wearing a UI.
 */
function writeError(error: unknown, code: string): string {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') return `There is already a code called ${code}.`;
    if (error.code === 'P2025') return 'That discount no longer exists.';
    if (error.code === 'P2003') return 'That category no longer exists.';
  }
  return 'Could not save that discount.';
}

/* ------------------------------------------------------------------ create */

export type CreateDiscountResult =
  | { ok: true; id: string; message?: string }
  | { ok: false; error: string };

export async function createDiscount(form: FormData): Promise<CreateDiscountResult> {
  if (!(await admin())) return { ok: false, error: EXPIRED_SESSION };

  const parsed = parse(form);
  if ('error' in parsed) return { ok: false, error: parsed.error };

  try {
    const created = await prisma.discount.create({
      data: {
        code: parsed.code,
        description: parsed.description,
        type: parsed.type,
        value: parsed.value,
        status: parsed.status,
        minSubtotal: parsed.minSubtotal,
        startsAt: parsed.startsAt,
        endsAt: parsed.endsAt,
        usageLimit: parsed.usageLimit,
        perContactLimit: parsed.perContactLimit,
        categoryId: parsed.categoryId,
      },
      select: { id: true },
    });

    refresh(created.id);
    return { ok: true, id: created.id };
  } catch (error) {
    return { ok: false, error: writeError(error, parsed.code) };
  }
}

/* ------------------------------------------------------------------ update */

export async function updateDiscount(id: string, form: FormData): Promise<ActionResult> {
  if (!(await admin())) return fail(EXPIRED_SESSION);

  const parsed = parse(form);
  if ('error' in parsed) return fail(parsed.error);

  try {
    await prisma.discount.update({
      where: { id },
      data: {
        code: parsed.code,
        description: parsed.description,
        type: parsed.type,
        value: parsed.value,
        status: parsed.status,
        minSubtotal: parsed.minSubtotal,
        startsAt: parsed.startsAt,
        endsAt: parsed.endsAt,
        usageLimit: parsed.usageLimit,
        perContactLimit: parsed.perContactLimit,
        categoryId: parsed.categoryId,
        /*
          usageCount is not writable from this form, and should not become so. It is the count of
          redemptions that actually happened; editing it would let somebody free up a limited-use
          code without a redemption row ever explaining why.
        */
      },
    });
  } catch (error) {
    return fail(writeError(error, parsed.code));
  }

  refresh(id);
  return { ok: true };
}

/* ------------------------------------------------------------------ delete */

/**
 * Delete a code.
 *
 * Its redemption rows cascade away with it (see the schema). Orders are untouched: each one
 * snapshots the code it was given and the amount taken off, so the record of what a customer
 * actually paid survives the code being tidied up months later.
 */
export async function deleteDiscount(id: string): Promise<ActionResult> {
  if (!(await admin())) return fail(EXPIRED_SESSION);

  try {
    await prisma.discount.delete({ where: { id } });
  } catch (error) {
    return fail(writeError(error, ''));
  }

  refresh();
  return { ok: true };
}

/* ------------------------------------------------------------------ status */

export async function setDiscountStatus(
  id: string,
  status: DiscountStatus
): Promise<ActionResult> {
  if (!(await admin())) return fail(EXPIRED_SESSION);
  if (!STATUSES.includes(status)) return fail('Unknown status.');

  const existing = await prisma.discount.findUnique({
    where: { id },
    select: { endsAt: true },
  });
  if (!existing) return fail('That discount no longer exists.');

  /*
    Resuming a code whose window has already closed would look like it worked and then be refused
    at the till, because evaluateDiscount checks the clock rather than this column. Say so here
    instead of setting a status that means nothing.
  */
  if (
    status === 'ACTIVE' &&
    existing.endsAt &&
    existing.endsAt.getTime() <= Date.now()
  ) {
    return fail('That code’s window has already closed. Change its end date to resume it.');
  }

  try {
    await prisma.discount.update({ where: { id }, data: { status } });
  } catch (error) {
    return fail(writeError(error, ''));
  }

  refresh(id);
  return { ok: true };
}

/* -------------------------------------------------------------------- bulk */

export type DiscountBulkAction = 'pause' | 'resume' | 'delete';

export async function bulkDiscountAction(
  ids: string[],
  action: DiscountBulkAction
): Promise<ActionResult> {
  if (!(await admin())) return fail(EXPIRED_SESSION);
  if (ids.length === 0) return fail('Select at least one code.');

  try {
    if (action === 'delete') {
      const result = await prisma.discount.deleteMany({ where: { id: { in: ids } } });
      refresh();
      return { ok: true, message: `Deleted ${result.count}.` };
    }

    if (action === 'pause') {
      const result = await prisma.discount.updateMany({
        where: { id: { in: ids }, status: 'ACTIVE' },
        data: { status: 'PAUSED' },
      });
      refresh();
      return { ok: true, message: `Paused ${result.count}.` };
    }

    if (action === 'resume') {
      /*
        Rows whose window has closed are skipped rather than flipped — the same rule as
        setDiscountStatus, and the count reported back says how many actually moved so a
        silent partial does not read as a full success.
      */
      const result = await prisma.discount.updateMany({
        where: {
          id: { in: ids },
          status: { not: 'ACTIVE' },
          OR: [{ endsAt: null }, { endsAt: { gt: new Date() } }],
        },
        data: { status: 'ACTIVE' },
      });
      refresh();

      const skipped = ids.length - result.count;
      return {
        ok: true,
        message:
          skipped > 0
            ? `Resumed ${result.count}. ${skipped} left alone — already active, or past the end of their window.`
            : `Resumed ${result.count}.`,
      };
    }

    return fail('Unknown bulk action.');
  } catch (error) {
    return fail(writeError(error, ''));
  }
}
