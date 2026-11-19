import { prisma } from '@/lib/prisma';
import { verifyNowpaymentsWebhook } from '@/lib/crypto/webhook-verify';
import { setOrderStatus } from '@/lib/orders/orders';
import { sendCryptoPaidNotification } from '@/lib/email/resend';
import { SITE } from '@/lib/site';
import { CRYPTO_DETECTED_EVENT } from '@/lib/orders/payment-deadline';
import { WebhookPayload } from '@/lib/crypto/nowpayments';
import { parseCryptoNote } from '@/lib/checkout/order-notes';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Get raw body for signature verification
    const body = await request.text();
    const signature = request.headers.get('x-nowpayments-sig');

    if (!signature) {
      console.error('[Webhook] Missing signature header');
      return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
    }

    // Verify webhook signature
    const isValid = await verifyNowpaymentsWebhook(body, signature);
    if (!isValid) {
      console.error('[Webhook] Invalid signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // Parse webhook payload
    const payload: WebhookPayload = JSON.parse(body);
    const { order_id, payment_status } = payload;

    console.log(`[Webhook] Received payment status: ${payment_status} for order: ${order_id}`);

    // Find order by reference number
    const order = await prisma.order.findUnique({
      where: { reference: order_id },
      select: {
        id: true,
        status: true,
        total: true,
        notes: true,
        events: { where: { summary: CRYPTO_DETECTED_EVENT }, select: { summary: true } },
      },
    });

    if (!order) {
      console.error(`[Webhook] Order not found: ${order_id}`);
      // Still return 200 to Coinbase so it doesn't retry
      return NextResponse.json({ success: true });
    }

    /*
      The notification must be about THIS order's payment, for THIS order's amount. A valid
      signature proves NOWPayments sent it, not that it describes the invoice we created.
    */
    const storedPaymentId = parseCryptoNote(order.notes)?.paymentId;
    if (storedPaymentId && String(payload.payment_id) !== storedPaymentId) {
      console.error(`[Webhook] Payment ${payload.payment_id} does not match ${storedPaymentId} on ${order_id}`);
      return NextResponse.json({ success: true });
    }
    if (Math.abs(Number(payload.price_amount) - Number(order.total)) > 0.01) {
      console.error(`[Webhook] Amount ${payload.price_amount} does not match order total ${order.total} on ${order_id}`);
      return NextResponse.json({ success: true });
    }

    // Handle different payment statuses
    switch (payment_status) {
      /*
        Only "finished" means the money is settled; "confirmed" is a blockchain confirmation on
        the way there. Confirms a NEW order, or a CANCELLED one (the payment arrived after
        all; the customer still gets their order). Never touches an order staff have moved
        on, so a repeated notification cannot drag a shipped order back to Confirmed.
        setOrderStatus sends the "Order Confirmed" email, at most once per order.
      */
      case 'finished':
        if (order.status === 'NEW' || order.status === 'CANCELLED') {
          await setOrderStatus(order.id, 'CONFIRMED', null, { from: ['NEW', 'CANCELLED'] });
          await sendCryptoPaidNotification(
            order_id,
            Number(order.total),
            `${SITE.url}/admin/orders/${order.id}`
          ).catch((error) => console.error(`[Webhook] paid alert for ${order_id} failed:`, error));
          console.log(`[Webhook] Order ${order_id} confirmed (was ${order.status})`);
        }
        break;

      case 'failed':
      case 'expired':
      case 'cancelled':
        /* Only an order still waiting; no email (the customer hears from us once paid). */
        await setOrderStatus(order.id, 'CANCELLED', null, { from: ['NEW'], notify: false });
        console.log(`[Webhook] Order ${order_id}: payment ${payment_status}`);
        break;

      case 'waiting':
        break;

      case 'confirming':
      case 'confirmed':
      case 'sending':
      case 'partially_paid':
        /*
          The coins have arrived and are confirming (or arrived short). Recorded once, so the
          payment page can say the payment is on its way instead of counting down. Underpaid orders are left to staff,
          who can complete them from the NOWPayments dashboard.
        */
        if (!order.events.some((e) => e.summary === CRYPTO_DETECTED_EVENT)) {
          await prisma.orderEvent.create({
            data: {
              orderId: order.id,
              summary: CRYPTO_DETECTED_EVENT,
              detail: `NOWPayments status: ${payment_status}.`,
            },
          });
        }
        console.log(`[Webhook] Order ${order_id} is ${payment_status}`);
        break;

      default:
        console.warn(`[Webhook] Unknown payment status: ${payment_status}`);
    }

    // Always return 200 to prevent retries
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Webhook] Error processing webhook:', error);
    // Return 200 anyway to prevent infinite retries on our errors
    return NextResponse.json({ success: true });
  }
}
