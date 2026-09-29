'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Clock, Copy } from 'lucide-react';
import { Order, Contact } from '@prisma/client';

interface PaymentConfirmationClientProps {
  paymentId: string;
  orderReference: string;
  order: Order & { contact: Contact | null };
  cryptoType: string;
}

interface PaymentDetails {
  payment_id: string;
  pay_amount: number;
  pay_currency: string;
  pay_address: string;
  payment_status: string;
  created_at: string;
}

export function PaymentConfirmationClient({
  paymentId,
  orderReference,
  order,
  cryptoType,
}: PaymentConfirmationClientProps) {
  const router = useRouter();
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [orderStatus, setOrderStatus] = useState(order.status);

  // Fetch payment details from NOWPayments API
  useEffect(() => {
    const fetchPaymentDetails = async () => {
      try {
        // Get payment details from our API which fetches from NOWPayments
        const response = await fetch(`/api/crypto/payment-status/${paymentId}`);
        if (!response.ok) throw new Error('Failed to fetch payment details');

        const data = await response.json();
        setPaymentDetails(data);
      } catch (err) {
        console.error('Error fetching payment details:', err);
        setError('Unable to load payment details');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPaymentDetails();
  }, [paymentId]);

  // Poll for order status updates (payment confirmation via webhook)
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/orders/${orderReference}/status`);
        if (!response.ok) return;

        const data = await response.json();
        setOrderStatus(data.status);

        // If payment confirmed, redirect to success page
        if (data.status === 'CONFIRMED') {
          // Wait a moment to show the success state, then redirect
          setTimeout(() => {
            router.push(`/checkout/success?order=${orderReference}`);
          }, 1000);
        }
      } catch (err) {
        console.error('Error polling order status:', err);
      }
    }, 3000); // Poll every 3 seconds

    return () => clearInterval(interval);
  }, [orderReference, router]);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  if (isLoading) {
    return (
      <main className="min-h-screen bg-paper px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl space-y-6">
          <div className="h-8 w-48 animate-pulse rounded bg-border" />
          <div className="space-y-3">
            <div className="h-4 w-full animate-pulse rounded bg-border" />
            <div className="h-4 w-3/4 animate-pulse rounded bg-border" />
          </div>
        </div>
      </main>
    );
  }

  if (error || !paymentDetails) {
    return (
      <main className="min-h-screen bg-paper px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl">
          <div className="rounded-lg border border-warning/40 bg-warning/5 p-6">
            <h1 className="text-lg font-semibold text-warning">Payment Error</h1>
            <p className="mt-2 text-sm text-ink-soft">{error || 'Unable to load payment details'}</p>
            <p className="mt-4 text-xs text-ink-faint">Order ID: {orderReference}</p>
          </div>
        </div>
      </main>
    );
  }

  const isConfirmed = orderStatus === 'CONFIRMED';

  return (
    <main className="min-h-screen bg-paper px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl space-y-8">
        {/* Header */}
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-[-0.03em] text-ink">
            {isConfirmed ? 'Payment Received!' : 'Complete Your Payment'}
          </h1>
          <p className="mt-2 text-sm text-ink-soft">Order {orderReference}</p>
        </div>

        {/* Status Card */}
        <div className="rounded-lg border border-rule bg-paper-sunk p-6">
          <div className="flex items-center gap-3">
            {isConfirmed ? (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-pigment-verdigris">
                <Check className="h-6 w-6 text-paper" strokeWidth={2} />
              </div>
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-pigment-indigo">
                <Clock className="h-6 w-6 text-paper animate-spin" strokeWidth={2} />
              </div>
            )}
            <div>
              <p className="font-semibold text-ink">
                {isConfirmed ? 'Payment Confirmed' : 'Waiting for Payment'}
              </p>
              <p className="text-sm text-ink-soft">
                {isConfirmed
                  ? 'Your payment has been received. Order is being processed.'
                  : 'Send the amount below to complete your order'}
              </p>
            </div>
          </div>
        </div>

        {!isConfirmed && (
          <>
            {/* Payment Details */}
            <div className="space-y-4">
              <div className="border-t border-rule pt-6">
                <h2 className="font-mono text-2xs uppercase tracking-[0.18em] text-ink-faint">
                  Amount to Send
                </h2>
                <p className="mt-3 font-display text-3xl font-semibold text-ink">
                  {paymentDetails.pay_amount} {paymentDetails.pay_currency.toUpperCase()}
                </p>
              </div>

              {/* Wallet Address */}
              <div className="border-t border-rule pt-6">
                <h3 className="font-mono text-2xs uppercase tracking-[0.18em] text-ink-faint">
                  Send to Address
                </h3>
                <div className="mt-4 flex items-start gap-3">
                  <div className="flex-1 break-all rounded border border-rule bg-paper p-4 font-mono text-sm text-ink">
                    {paymentDetails.pay_address}
                  </div>
                  <button
                    onClick={() => copyToClipboard(paymentDetails.pay_address)}
                    className="mt-0.5 flex items-center gap-2 rounded border border-rule px-3 py-2 text-xs transition-colors hover:bg-paper-sunk"
                    title="Copy address"
                  >
                    <Copy className="h-4 w-4" />
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>

              {/* Instructions */}
              <div className="border-t border-rule pt-6">
                <h3 className="font-mono text-2xs uppercase tracking-[0.18em] text-ink-faint">
                  Instructions
                </h3>
                <ol className="mt-4 space-y-2 text-sm text-ink-soft">
                  <li>1. Open your crypto wallet or exchange</li>
                  <li>2. Send <strong>{paymentDetails.pay_amount} {paymentDetails.pay_currency.toUpperCase()}</strong> to the address above</li>
                  <li>3. Confirm the transaction</li>
                  <li>4. This page will automatically update when payment is received</li>
                </ol>
              </div>

              {/* Info */}
              <div className="border-t border-rule pt-6">
                <div className="rounded border border-rule/50 bg-blue-50/30 p-4 text-sm text-ink-soft">
                  <p>
                    <strong className="text-ink">Note:</strong> Payment may take several minutes to confirm depending on network congestion.
                  </p>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Order Summary */}
        <div className="border-t border-rule pt-6">
          <h3 className="font-mono text-2xs uppercase tracking-[0.18em] text-ink-faint">
            Order Summary
          </h3>
          <div className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-ink-soft">Order ID:</span>
              <span className="font-mono text-ink">{orderReference}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-soft">Amount:</span>
              <span className="text-ink">${Number(order.total).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-soft">Status:</span>
              <span className={`font-semibold ${isConfirmed ? 'text-pigment-verdigris' : 'text-pigment-indigo'}`}>
                {isConfirmed ? 'Confirmed' : 'Pending'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
