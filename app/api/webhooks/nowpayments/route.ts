import { prisma } from '@/lib/prisma';
import { verifyNowpaymentsWebhook } from '@/lib/crypto/webhook-verify';
import { sendOrderConfirmation } from '@/lib/emails/send-order-confirmation';
import { WebhookPayload } from '@/lib/crypto/nowpayments';
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
      include: { items: true }, // Adjust based on your schema
    });

    if (!order) {
      console.error(`[Webhook] Order not found: ${order_id}`);
      // Still return 200 to Coinbase so it doesn't retry
      return NextResponse.json({ success: true });
    }

    // Handle different payment statuses
    switch (payment_status) {
      case 'finished': // Payment confirmed
      case 'confirmed':
        // Idempotency check: only process if not already paid
        if (order.status === 'PAID' || order.status === 'CONFIRMED') {
          console.log(`[Webhook] Order ${order_id} already marked as paid, skipping`);
          return NextResponse.json({ success: true });
        }

        // Update order status
        await prisma.order.update({
          where: { id: order.id },
          data: { status: 'PAID' },
        });

        // Send confirmation email
        try {
          await sendOrderConfirmation(order);
          console.log(`[Webhook] Sent confirmation email for order ${order_id}`);
        } catch (emailError) {
          console.error(`[Webhook] Failed to send email for order ${order_id}:`, emailError);
          // Don't fail the webhook if email fails - order is still paid
        }

        console.log(`[Webhook] Order ${order_id} marked as PAID`);
        break;

      case 'failed':
      case 'expired':
      case 'cancelled':
        // Update order status to failed
        if (order.status !== 'CANCELLED' && order.status !== 'FAILED') {
          await prisma.order.update({
            where: { id: order.id },
            data: { status: 'CANCELLED' },
          });
          console.log(`[Webhook] Order ${order_id} marked as ${payment_status.toUpperCase()}`);
        }
        break;

      case 'waiting':
      case 'pending':
        // Payment is pending, no action needed
        console.log(`[Webhook] Order ${order_id} is pending`);
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
