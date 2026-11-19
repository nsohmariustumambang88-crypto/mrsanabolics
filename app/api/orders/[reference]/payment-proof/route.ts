import { NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';
import { prisma } from '@/lib/prisma';
import { clientIp, hashIp } from '@/lib/ip-hash';
import { SITE } from '@/lib/site';
import { cashAppDetails, proofTokenMatches } from '@/lib/checkout/cashapp';
import { checkCashAppScreenshot } from '@/lib/checkout/screenshot-check';
import { setOrderStatus } from '@/lib/orders/orders';
import { UNPAID_CANCEL_EVENT } from '@/lib/orders/payment-deadline';
import { paymentMethodFromNotes } from '@/lib/checkout/order-notes';
import {
  MAX_PROOFS_PER_ORDER,
  PROOF_MAX_BYTES,
  PROOF_TYPES,
} from '@/lib/checkout/payment-proof-rules';
import { uploadPrivateImage, uploadsConfigured } from '@/lib/cloudinary-server';
import { sendPaymentProofNotification } from '@/lib/email/resend';

/*
  A customer's screenshot of their Cash App payment, for one order.

  Who may upload: whoever holds the order's upload token (lib/checkout/cashapp.ts), which only the
  checkout that placed the order carries (it opens the payment page with it). The reference alone
  is not enough. Only Cash App orders take one, at most MAX_PROOFS_PER_ORDER, images only — also
  on an order that was cancelled for time while that rule briefly existed (19 November 2026).

  The screenshot is read on arrival (lib/checkout/screenshot-check.ts). When it shows our Cash App
  name or tag and the order's exact amount, the order is confirmed and the customer gets their
  "Order Confirmed" email — the owner's rule since 18 November 2026. Otherwise the order waits
  for staff, as before. Either way the shop is emailed, and an automatic confirmation says plainly
  that a screenshot can be faked: staff check the Cash App balance before shipping.

  The image goes to Cloudinary as an authenticated asset (no public URL); the order keeps a
  PaymentProof row and a line in its history.
*/

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
/* Reading the picture takes several seconds, more on a cold start. */
export const maxDuration = 60;

const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 8;
const hits = new Map<string, { count: number; first: number }>();

function rateLimited(key: string): boolean {
  const now = Date.now();
  const entry = hits.get(key);
  if (!entry || now - entry.first > WINDOW_MS) {
    hits.set(key, { count: 1, first: now });
    return false;
  }
  entry.count += 1;
  return entry.count > MAX_PER_WINDOW;
}

const refuse = (error: string, status: number) => NextResponse.json({ error }, { status });

export async function POST(request: Request, { params }: { params: { reference: string } }) {
  const reference = decodeURIComponent(params.reference ?? '');
  const ip = clientIp(request);

  if (rateLimited(ip ?? 'local')) {
    return refuse('Too many uploads from this connection. Try again in a few minutes.', 429);
  }

  const form = await request.formData().catch(() => null);
  if (!form) return refuse('That upload could not be read. Try again.', 400);

  if (!proofTokenMatches(reference, form.get('token'))) {
    return refuse('This upload link does not match the order. Use the link in your order email.', 403);
  }

  const file = form.get('file');
  if (!file || typeof file === 'string' || file.size === 0) {
    return refuse('Choose a screenshot of your payment first.', 400);
  }
  if (!PROOF_TYPES.includes(file.type)) {
    return refuse('That file is not a picture. Upload a screenshot (JPG or PNG).', 400);
  }
  if (file.size > PROOF_MAX_BYTES) {
    return refuse('That picture is too large. Take a screenshot of the payment and upload that.', 413);
  }

  const order = await prisma.order.findUnique({
    where: { reference },
    select: {
      id: true,
      status: true,
      notes: true,
      total: true,
      contact: { select: { email: true } },
      events: { where: { summary: UNPAID_CANCEL_EVENT }, select: { id: true }, take: 1 },
      _count: { select: { paymentProofs: true } },
    },
  });
  if (!order) return refuse('We could not find that order.', 404);
  if (paymentMethodFromNotes(order.notes) !== 'cashapp') {
    return refuse('This order is not paid by Cash App.', 400);
  }
  /* Cancelled by a person: refused. Cancelled only because the time ran out: still accepted. */
  if (order.status === 'CANCELLED' && order.events.length === 0) {
    return refuse('This order was cancelled. If you have paid, contact us with your order number.', 409);
  }
  if (['CONFIRMED', 'PACKED', 'SHIPPED', 'DELIVERED'].includes(order.status)) {
    return refuse('This order is already confirmed. There is nothing more to send.', 409);
  }
  if (order._count.paymentProofs >= MAX_PROOFS_PER_ORDER) {
    return refuse(
      'We already have your screenshots for this order. To send another, reply to your order email.',
      409
    );
  }
  if (!uploadsConfigured) {
    return refuse('Uploads are not available right now. Reply to your order email with the screenshot.', 503);
  }

  let uploaded;
  const buffer = Buffer.from(await file.arrayBuffer());
  try {
    uploaded = await uploadPrivateImage(buffer, `${reference}-${randomBytes(6).toString('hex')}`);
  } catch (error) {
    console.error('[payment-proof] upload failed', error);
    return refuse('The screenshot could not be saved. Try again in a moment.', 502);
  }

  /* One nested write: the picture's row and the history line land together or not at all. */
  await prisma.order.update({
    where: { id: order.id },
    data: {
      paymentProofs: {
        create: {
          publicId: uploaded.publicId,
          format: uploaded.format,
          bytes: uploaded.bytes,
          width: uploaded.width ?? null,
          height: uploaded.height ?? null,
          ipHash: hashIp(ip),
        },
      },
      events: {
        create: {
          summary: 'Customer uploaded a screenshot of their Cash App payment.',
          detail: 'Check it against the Cash App account before confirming the order.',
        },
      },
    },
  });

  /* Read it, and confirm the order if it shows a payment to us of this order's amount. */
  const total = Number(order.total);
  const cashApp = await cashAppDetails();
  let verdict = cashApp
    ? await checkCashAppScreenshot(buffer, { name: cashApp.name, tag: cashApp.tag, total })
    : null;
  if (verdict?.passed) {
    /* The same picture sent for another order proves nothing about this one. */
    const reused = await prisma.orderEvent.findFirst({
      where: { detail: { contains: verdict.sha256 }, orderId: { not: order.id } },
      select: { order: { select: { reference: true } } },
    });
    if (reused) {
      verdict = {
        ...verdict,
        passed: false,
        findings: [...verdict.findings, `The same picture was sent for order ${reused.order.reference}.`],
      };
    }
  }
  if (verdict) {
    await prisma.orderEvent.create({
      data: {
        orderId: order.id,
        summary: verdict.passed
          ? 'Screenshot check passed: order confirmed automatically.'
          : 'Screenshot check did not pass: a person needs to check the payment.',
        detail: `${verdict.findings.join(' ')}
Image sha256: ${verdict.sha256}`,
      },
    });
  }

  let confirmed = false;
  if (verdict?.passed) {
    /* Sends the customer's "Order Confirmed" email (once). From NEW or a timed-out cancel only. */
    await setOrderStatus(order.id, 'CONFIRMED', null, { from: ['NEW', 'CANCELLED'] });
    const now = await prisma.order.findUnique({ where: { id: order.id }, select: { status: true } });
    confirmed = now?.status === 'CONFIRMED';
  }

  await sendPaymentProofNotification(
    reference,
    order.contact.email,
    total,
    `${SITE.url}/admin/orders/${order.id}`,
    { confirmed, findings: verdict?.findings ?? ['No $Cashtag is on file, so it was not checked.'] }
  ).catch((error) => {
    /* The screenshot is saved and on the order; a missed email must not fail the upload. */
    console.error('[payment-proof] admin email failed', error);
  });

  return NextResponse.json(
    { ok: true, count: order._count.paymentProofs + 1, confirmed },
    { status: 201 }
  );
}
