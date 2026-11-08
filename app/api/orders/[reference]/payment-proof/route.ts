import { NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';
import { prisma } from '@/lib/prisma';
import { clientIp, hashIp } from '@/lib/ip-hash';
import { SITE } from '@/lib/site';
import { proofTokenMatches } from '@/lib/checkout/cashapp';
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
  checkout that placed the order and the "Order Received" email carry. The reference alone is not
  enough. Only Cash App orders take one, at most MAX_PROOFS_PER_ORDER, images only.

  What it does NOT do is mark anything paid. A screenshot is the customer's claim; staff check the
  Cash App account and confirm the order themselves. The admin gets an email so it is not missed.

  The image goes to Cloudinary as an authenticated asset (no public URL); the order keeps a
  PaymentProof row and a line in its history.
*/

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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
      _count: { select: { paymentProofs: true } },
    },
  });
  if (!order) return refuse('We could not find that order.', 404);
  if (paymentMethodFromNotes(order.notes) !== 'cashapp') {
    return refuse('This order is not paid by Cash App.', 400);
  }
  if (order.status === 'CANCELLED') {
    return refuse('This order was cancelled. If you have paid, contact us with your order number.', 409);
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
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
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

  await sendPaymentProofNotification(
    reference,
    order.contact.email,
    Number(order.total),
    `${SITE.url}/admin/orders/${order.id}`
  ).catch((error) => {
    /* The screenshot is saved and on the order; a missed email must not fail the upload. */
    console.error('[payment-proof] admin email failed', error);
  });

  return NextResponse.json({ ok: true, count: order._count.paymentProofs + 1 }, { status: 201 });
}
