import 'server-only';

const API_URL = 'https://api.nowpayments.io/v1';
const API_KEY = process.env.NOWPAYMENTS_API_KEY;

if (!API_KEY) {
  throw new Error('NOWPAYMENTS_API_KEY is not set');
}

export interface CreatePaymentInput {
  price_amount: number;
  price_currency: string; // 'usd', 'eur', etc
  pay_currency: string; // 'btc', 'usdt', etc
  order_id: string;
  order_description: string;
  ipn_callback_url: string;
  success_url?: string;
  cancel_url?: string;
}

export interface PaymentResponse {
  id: string;
  order_id: string;
  order_description: string;
  price_amount: number;
  price_currency: string;
  pay_currency: string;
  pay_amount: number;
  created_at: string;
  updated_at: string;
  purchase_id: string;
  payment_status: string;
  payment_url: string;
}

export interface WebhookPayload {
  id: string;
  order_id: string;
  order_description: string;
  price_amount: number;
  price_currency: string;
  pay_currency: string;
  pay_amount: number;
  payment_status: string;
  payment_id: string;
  created_at: string;
  updated_at: string;
  is_fixed_rate: boolean;
  is_fee_paid_by_user: boolean;
}

export async function createPayment(input: CreatePaymentInput): Promise<PaymentResponse> {
  const headers: HeadersInit = {
    'x-api-key': API_KEY!,
    'Content-Type': 'application/json',
  };

  const response = await fetch(`${API_URL}/payment`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      price_amount: input.price_amount,
      price_currency: input.price_currency,
      pay_currency: input.pay_currency,
      order_id: input.order_id,
      order_description: input.order_description,
      ipn_callback_url: input.ipn_callback_url,
      success_url: input.success_url,
      cancel_url: input.cancel_url,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(`NOWPayments API error: ${response.status} - ${JSON.stringify(error)}`);
  }

  return response.json();
}

export async function getPaymentStatus(paymentId: string): Promise<PaymentResponse> {
  const headers: HeadersInit = {
    'x-api-key': API_KEY!,
  };

  const response = await fetch(`${API_URL}/payment/${paymentId}`, {
    headers,
  });

  if (!response.ok) {
    throw new Error(`Failed to get payment status: ${response.status}`);
  }

  return response.json();
}
