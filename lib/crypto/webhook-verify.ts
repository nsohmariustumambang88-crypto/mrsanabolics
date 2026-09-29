import 'server-only';
import crypto from 'crypto';

export async function verifyNowpaymentsWebhook(
  body: string,
  signature: string
): Promise<boolean> {
  const secret = process.env.NOWPAYMENTS_IPN_SECRET;

  if (!secret) {
    console.error('NOWPAYMENTS_IPN_SECRET is not set');
    return false;
  }

  try {
    // NOWPayments uses HMAC-SHA512 for webhook signatures
    const hash = crypto
      .createHmac('sha512', secret)
      .update(body, 'utf8')
      .digest('hex');

    return hash === signature;
  } catch (error) {
    console.error('Webhook verification error:', error);
    return false;
  }
}
