'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { SETTINGS, writeSettings } from '@/lib/settings';
import { looksLikeEmail } from '@/lib/marketing/consent';

/*
  Settings and payment-method mutations.

  Like every other action file here, each export calls requireAdmin() before it touches
  anything: a server action is a public HTTP endpoint with a generated URL, so "no button
  points at it" is not access control and middleware does not reach Postgres.

  Two rules this file exists to hold:

  1. THE FORM DOES NOT DECIDE WHICH KEYS EXIST. lib/settings.ts declares them. This action
     iterates SETTINGS and pulls each declared key out of the FormData — it never iterates the
     FormData and writes what it finds. A posted `admin_password=...` is therefore not a key
     that is rejected, it is a key that is never looked at.

  2. A PARTIAL FORM MUST NOT BLANK WHAT IT DID NOT SHOW. /admin/email renders the email group
     and one General field; if absence meant empty string, saving that screen would wipe the
     announcement bar. So a form states which declared keys it rendered in a single hidden
     `__fields` input, and only those are considered. That also settles the checkbox problem:
     an unticked checkbox is simply absent from a FormData, which is indistinguishable from a
     field that was never on the page — the manifest tells the two apart.

  There is deliberately NO action here that writes a wallet address, a merchant id or an API
  key for a payment method, and the model has no column for one. See /admin/payments.
*/

export type ActionResult = { ok: true } | { ok: false; error: string };

const EXPIRED = 'Your session has expired. Sign in again.';

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

/* ------------------------------------------------------------------ settings */

/**
 * The hidden input a settings form uses to declare which declared keys it put on screen.
 *
 * Not exported — a 'use server' module may only export async functions — so the client form
 * carries the same literal. Both sides document the other.
 */
const FIELD_MANIFEST = '__fields';

export async function saveSettings(form: FormData): Promise<ActionResult> {
  const session = await admin();
  if (!session) return fail(EXPIRED);

  const rendered = new Set(
    String(form.get(FIELD_MANIFEST) ?? '')
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean)
  );

  const values: Record<string, string> = {};

  for (const def of SETTINGS) {
    if (!rendered.has(def.key)) continue;

    if (def.type === 'boolean') {
      /* Present in the manifest but absent from the body means the box was unticked. */
      values[def.key] = form.get(def.key) != null ? 'true' : 'false';
      continue;
    }

    values[def.key] = String(form.get(def.key) ?? '');
  }

  if (Object.keys(values).length === 0) return fail('Nothing to save.');

  /*
    Validate before writing, not during. writeSettings skips a bad value and reports it, but it
    has already written the good ones by then — so a form with one bad number would save half of
    itself and say it failed. Checking first makes the save all-or-nothing.
  */
  for (const def of SETTINGS) {
    const raw = values[def.key];
    if (raw === undefined) continue;
    const value = raw.trim();

    if (def.type === 'number') {
      const n = Number(value);
      if (value === '' || !Number.isFinite(n) || n < 0) {
        return fail(`${def.label} must be a whole number of zero or more.`);
      }
    }

    if (def.type === 'email' && value !== '' && !looksLikeEmail(value)) {
      return fail(`${def.label} does not look like an email address.`);
    }
  }

  const { rejected } = await writeSettings(values, session.email);
  if (rejected.length) return fail(`These could not be saved: ${rejected.join(', ')}.`);

  /*
    The storefront reads settings in the layout and on these routes. Settings' own memo is
    dropped inside writeSettings, so this is only about Next's render cache.
  */
  revalidatePath('/');
  revalidatePath('/shop');
  revalidatePath('/contact');
  revalidatePath('/admin/settings');
  revalidatePath('/admin/email');

  return { ok: true };
}

/* ---------------------------------------------------------- payment methods */

function refreshPayments() {
  revalidatePath('/admin/payments');
  revalidatePath('/checkout');
}

/**
 * List a method at checkout, or stop listing it.
 *
 * This is the whole extent of the control. `connected` is not writable from the admin and is
 * false on every row: a toggle that could flip it would let somebody mark a method as able to
 * take money on a build that has no rail behind it.
 */
export async function setPaymentMethodEnabled(
  id: string,
  enabled: boolean
): Promise<ActionResult> {
  const session = await admin();
  if (!session) return fail(EXPIRED);

  const method = await prisma.paymentMethod.findUnique({ where: { id } });
  if (!method) return fail('That payment method no longer exists.');

  if (enabled === false) {
    const others = await prisma.paymentMethod.count({
      where: { enabled: true, id: { not: id } },
    });
    /* Checkout has to offer something. Zero methods is a dead screen, not a configuration. */
    if (others === 0) {
      return fail(
        'At least one payment method has to be listed, or checkout offers no way to continue.'
      );
    }
  }

  await prisma.paymentMethod.update({ where: { id }, data: { enabled } });
  refreshPayments();
  return { ok: true };
}

/**
 * Edit the sentence shown in that method's panel at checkout.
 *
 * It cannot be emptied. That sentence is the thing telling a customer nothing is charged and
 * where their money would and would not go; a blank one removes the warning while leaving the
 * method on the page, which is the worst state this screen can produce.
 */
export async function updatePaymentMethodNotice(
  id: string,
  notice: string
): Promise<ActionResult> {
  const session = await admin();
  if (!session) return fail(EXPIRED);

  const text = notice.trim();
  if (text.length < 10) {
    return fail('The notice is what tells a customer nothing is charged — it cannot be empty.');
  }
  if (text.length > 400) {
    return fail('Keep the notice under 400 characters; it sits inside the payment panel.');
  }

  const method = await prisma.paymentMethod.findUnique({ where: { id } });
  if (!method) return fail('That payment method no longer exists.');

  await prisma.paymentMethod.update({ where: { id }, data: { notice: text } });
  refreshPayments();
  return { ok: true };
}
