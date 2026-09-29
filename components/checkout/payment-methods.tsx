'use client';

import * as React from 'react';
import { Bitcoin, Lock, Info, Landmark } from 'lucide-react';
import { formatPrice } from '@/lib/format';
import { cn } from '@/lib/utils';

/*
  Three payment methods: Zelle, CashApp, and Crypto (BTC/USDT).
  Crypto payments are processed through NOWPayments API.
*/

export type PaymentMethod = 'zelle' | 'cashapp' | 'crypto';
export type CryptoAsset = 'BTC' | 'ETH' | 'USDT';

/**
 * A method as administered at /admin/payments: which ones are listed, and the sentence each
 * shows at the point of entry, are database rows now rather than constants here.
 */
export type PaymentMethodOption = {
  key: string;
  label: string;
  notice: string;
  walletAddress?: string | null;
};

const PRESENTATION: Record<string, { hint: string; icon: typeof Landmark }> = {
  zelle: { hint: 'Send money via Zelle', icon: Landmark },
  cashapp: { hint: 'Pay with CashApp', icon: Landmark },
  crypto: { hint: 'Bitcoin or USDT', icon: Bitcoin },
};

const FALLBACK_PRESENTATION = { hint: 'Payment method', icon: Landmark };

const ASSETS: { id: CryptoAsset; label: string; network: string }[] = [
  { id: 'BTC', label: 'Bitcoin', network: 'Bitcoin network' },
  { id: 'ETH', label: 'Ethereum', network: 'ERC-20' },
  { id: 'USDT', label: 'USDT', network: 'Tron (TRC-20)' },
];

export function PaymentMethods({
  total,
  method,
  onMethodChange,
  cryptoAsset,
  onCryptoAssetChange,
  methods,
  email,
}: {
  total: number;
  method: PaymentMethod;
  onMethodChange: (m: PaymentMethod) => void;
  cryptoAsset: CryptoAsset;
  onCryptoAssetChange: (a: CryptoAsset) => void;
  /** Enabled methods from the database, in administered order. */
  methods: PaymentMethodOption[];
  email?: string;
}) {

  /* The notice for whichever method is showing, so each panel states its own position. */
  const notice = methods.find((m) => m.key === method)?.notice ?? '';

  return (
    <div>
      <fieldset>
        <legend className="font-display text-lg font-semibold tracking-[-0.025em]">
          How would you like to pay?
        </legend>

        <div
          className="mt-5 grid grid-cols-1 gap-px border border-rule bg-rule sm:grid-cols-3"
        >
          {methods.map((m) => {
            const { hint, icon: Icon } = PRESENTATION[m.key] ?? FALLBACK_PRESENTATION;
            const active = method === m.key;
            return (
              <label
                key={m.key}
                className={cn(
                  'flex cursor-pointer flex-col gap-2 bg-card p-4 transition-colors',
                  active ? 'bg-paper-sunk' : 'hover:bg-paper-sunk'
                )}
              >
                <span className="flex items-center gap-2.5">
                  <input
                    type="radio"
                    name="payment-method"
                    value={m.key}
                    checked={active}
                    onChange={() => onMethodChange(m.key as PaymentMethod)}
                    className="h-4 w-4 accent-pigment-indigo"
                  />
                  <Icon
                    className={cn('h-4 w-4', active ? 'text-pigment-indigo' : 'text-ink-faint')}
                    strokeWidth={1.75}
                  />
                  <span className="text-sm font-medium">{m.label}</span>
                </span>
                <span className="text-xs leading-relaxed text-ink-faint">{hint}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="mt-6">
        {method === 'zelle' && <ZellePanel notice={notice} />}
        {method === 'cashapp' && <CashAppPanel notice={notice} />}
        {method === 'crypto' && (
          <CryptoPanel total={total} notice={notice} email={email} />
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ zelle */

function ZellePanel({ notice }: { notice: string }) {
  return (
    <div className="space-y-4">
      <p className="text-sm leading-relaxed text-ink-soft">
        Send money directly from your bank account using Zelle.
      </p>

      <Field id="email" label="Email or phone number" placeholder="you@email.com" />

      <NotConnected>{notice}</NotConnected>
    </div>
  );
}

/* ---------------------------------------------------------------- cashapp */

function CashAppPanel({ notice }: { notice: string }) {
  return (
    <div className="space-y-4">
      <p className="text-sm leading-relaxed text-ink-soft">
        Send payment directly through CashApp.
      </p>

      <Field id="cashapp-tag" label="CashApp tag" placeholder="$yourname" />

      <NotConnected>{notice}</NotConnected>
    </div>
  );
}

/* ----------------------------------------------------------------- crypto */

function CryptoPanel({
  total,
  notice,
  email,
}: {
  total: number;
  asset?: CryptoAsset;
  onAssetChange?: (a: CryptoAsset) => void;
  notice: string;
  email?: string;
}) {
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleCryptoPayment = async (cryptoAsset: CryptoAsset) => {
    setIsProcessing(true);
    setError(null);

    try {
      if (!email) {
        throw new Error('Email required - please fill in your email address');
      }

      const response = await fetch('/api/crypto/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: [],
          total,
          email,
          pay_currency: cryptoAsset.toLowerCase(),
        }),
      });

      const data = await response.json();

      if (data.success && data.payment_url) {
        window.location.href = data.payment_url;
      } else {
        throw new Error(data.error || 'Failed to initiate payment');
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Payment processing failed';
      setError(errorMsg);
      console.error('Crypto checkout error:', err);
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="border border-rule bg-paper-sunk p-4">
        <p className="font-mono text-2xs uppercase tracking-[0.14em] text-ink-faint">
          Total Amount
        </p>
        <p className="mt-1 font-display text-2xl font-semibold tabular">{formatPrice(total)}</p>

        <div className="mt-6 space-y-3">
          <p className="text-sm font-medium text-ink">Select payment currency:</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {ASSETS.map((asset) => (
              <div key={asset.id} className="flex flex-col gap-2">
                <button
                  onClick={() => handleCryptoPayment(asset.id)}
                  disabled={isProcessing}
                  className={cn(
                    'py-2.5 px-3 text-sm font-medium rounded border transition-colors',
                    isProcessing
                      ? 'bg-ink-faint text-paper-sunk cursor-not-allowed'
                      : 'bg-pigment-indigo text-paper border-pigment-indigo hover:bg-pigment-indigo/80'
                  )}
                >
                  {isProcessing ? 'Processing...' : `Pay with ${asset.id}`}
                </button>
                <p className="text-xs text-ink-faint">
                  {asset.network}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <p className="flex items-start gap-2.5 border border-warning/40 bg-warning/5 p-3 text-xs leading-relaxed text-warning">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
          <span>{error}</span>
        </p>
      )}

      <NotConnected>{notice}</NotConnected>
    </div>
  );
}

/* ------------------------------------------------------------------ parts */

function NotConnected({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-start gap-2.5 border border-warning/40 bg-warning/5 p-3 text-xs leading-relaxed text-ink-soft">
      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" strokeWidth={1.75} />
      <span>{children}</span>
    </p>
  );
}

function Field({
  id,
  label,
  placeholder,
  autoComplete,
}: {
  id: string;
  label: string;
  placeholder?: string;
  autoComplete?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        name={id}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="mt-2 w-full border-b border-rule-strong bg-transparent py-2.5 text-sm outline-none focus:border-pigment-indigo"
      />
    </div>
  );
}

export function PaymentLockNote() {
  return (
    <p className="flex items-center gap-2 pt-2 text-xs text-ink-faint">
      <Lock className="h-3.5 w-3.5" strokeWidth={1.6} />
      Nothing entered here is transmitted anywhere.
    </p>
  );
}
