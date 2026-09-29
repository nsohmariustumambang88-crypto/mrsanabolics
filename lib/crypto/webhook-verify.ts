import 'server-only';
import crypto from 'crypto';

const WEBHOOK_SECRET = process.env.NOWPAYMENTS_IPN_SECRET;

if (!WEBHOOK_SECRET) {
  throw new Error('NOWPAYMENTS_IPN_SECRET is not set');
}

export async function verifyNowpaymentsWebhook(
  body: string,
  signature: string
): Promise<boolean> {
  try {
    // NOWPayments uses HMAC-SHA512 for webhook signatures
    const hash = crypto
      .createHmac('sha512', WEBHOOK_SECRET)
      .update(body, 'utf8')
      .digest('hex');

    return hash === signature;
  } catch (error) {
    console.error('Webhook verification error:', error);
    return false;
  }
}
