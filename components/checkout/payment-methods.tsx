'use client';

import * as React from 'react';
import { CreditCard, Smartphone, Bitcoin, Lock, Info } from 'lucide-react';
import { formatPrice } from '@/lib/format';
import { cn } from '@/lib/utils';

/*
  Choosing how to pay.

  THREE METHODS, NONE OF THEM CONNECTED. This build has no payment processor, no merchant
  account, no wallet and no Cash App handle, and the panels below say so at the point of entry
  rather than only on the confirmation screen — a demo that looks like it took your money is
  worse than one that admits it did not. Wiring any of these to a real destination is a
  deliberate act, not a matter of filling in a constant.

  The methods themselves are a real decision, not decoration: card, a peer-to-peer wallet, and
  on-chain settlement behave differently enough that the interface has to. A card authorises
  instantly and can be charged back. A wallet transfer is a push from the buyer that nobody can
  reverse. An on-chain payment is push-only as well, but also takes minutes to confirm and
  arrives in a currency whose value moved while it was in flight — which is why that panel
  quotes a rate window and the others do not.
*/

export type PaymentMethod = 'card' | 'cashapp' | 'crypto';
export type CryptoAsset = 'BTC' | 'ETH' | 'USDT';

const METHODS: {
  id: PaymentMethod;
  label: string;
  hint: string;
  icon: typeof CreditCard;
}[] = [
  { id: 'card', label: 'Card', hint: 'Visa, Mastercard, American Express', icon: CreditCard },
  { id: 'cashapp', label: 'Cash App', hint: 'Pay from your Cash App balance', icon: Smartphone },
  { id: 'crypto', label: 'Cryptocurrency', hint: 'Bitcoin, Ethereum or USDT', icon: Bitcoin },
];

const ASSETS: { id: CryptoAsset; label: string; network: string }[] = [
  { id: 'BTC', label: 'Bitcoin', network: 'Bitcoin network' },
  { id: 'ETH', label: 'Ethereum', network: 'ERC-20' },
  { id: 'USDT', label: 'Tether', network: 'ERC-20 or TRC-20' },
];

export function PaymentMethods({
  total,
  method,
  onMethodChange,
}: {
  total: number;
  method: PaymentMethod;
  onMethodChange: (m: PaymentMethod) => void;
}) {
  const [asset, setAsset] = React.useState<CryptoAsset>('BTC');

  return (
    <div>
      <fieldset>
        <legend className="font-display text-lg font-semibold tracking-[-0.025em]">
          How would you like to pay?
        </legend>

        <div className="mt-5 grid gap-px border border-rule bg-rule sm:grid-cols-3">
          {METHODS.map((m) => {
            const Icon = m.icon;
            const active = method === m.id;
            return (
              <label
                key={m.id}
                className={cn(
                  'flex cursor-pointer flex-col gap-2 bg-card p-4 transition-colors',
                  active ? 'bg-paper-sunk' : 'hover:bg-paper-sunk'
                )}
              >
                <span className="flex items-center gap-2.5">
                  <input
                    type="radio"
                    name="payment-method"
                    value={m.id}
                    checked={active}
                    onChange={() => onMethodChange(m.id)}
                    className="h-4 w-4 accent-pigment-indigo"
                  />
                  <Icon
                    className={cn('h-4 w-4', active ? 'text-pigment-indigo' : 'text-ink-faint')}
                    strokeWidth={1.75}
                  />
                  <span className="text-sm font-medium">{m.label}</span>
                </span>
                <span className="text-xs leading-relaxed text-ink-faint">{m.hint}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="mt-6">
        {method === 'card' && <CardPanel />}
        {method === 'cashapp' && <CashAppPanel total={total} />}
        {method === 'crypto' && (
          <CryptoPanel total={total} asset={asset} onAssetChange={setAsset} />
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ card */

function CardPanel() {
  return (
    <div className="space-y-4">
      <Field id="card" label="Card number" placeholder="0000 0000 0000 0000" />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="exp" label="Expiry" placeholder="MM / YY" />
        <Field id="cvc" label="Security code" placeholder="123" />
      </div>
      <Field id="card-name" label="Name on card" autoComplete="cc-name" />

      <NotConnected>
        No payment processor is connected. Nothing typed here is transmitted or stored — do
        not enter a real card number.
      </NotConnected>
    </div>
  );
}

/* --------------------------------------------------------------- cash app */

function CashAppPanel({ total }: { total: number }) {
  return (
    <div className="space-y-4">
      <p className="text-sm leading-relaxed text-ink-soft">
        Cash App transfers are a push from your account, so the order is confirmed once the
        payment lands rather than at the moment you place it.
      </p>

      <Field id="cashtag" label="Your $Cashtag" placeholder="$yourname" />

      <div className="border border-rule bg-paper-sunk p-4">
        <p className="font-mono text-2xs uppercase tracking-[0.14em] text-ink-faint">
          Send exactly
        </p>
        <p className="mt-1 font-display text-2xl font-semibold tabular">{formatPrice(total)}</p>
        <p className="mt-3 text-xs leading-relaxed text-ink-faint">
          The destination $Cashtag would be shown here once an account is connected.
        </p>
      </div>

      <NotConnected>
        No Cash App account is connected to this build, so there is no destination to send to
        and no payment can be made.
      </NotConnected>
    </div>
  );
}

/* ----------------------------------------------------------------- crypto */

function CryptoPanel({
  total,
  asset,
  onAssetChange,
}: {
  total: number;
  asset: CryptoAsset;
  onAssetChange: (a: CryptoAsset) => void;
}) {
  return (
    <div className="space-y-4">
      <fieldset>
        <legend className="font-mono text-2xs uppercase tracking-[0.14em] text-ink-faint">
          Asset
        </legend>
        <div className="mt-2.5 flex flex-wrap gap-2">
          {ASSETS.map((a) => (
            <label
              key={a.id}
              className={cn(
                'cursor-pointer border px-3.5 py-2 text-sm transition-colors',
                asset === a.id
                  ? 'border-pigment-indigo bg-paper-sunk font-medium'
                  : 'border-rule-strong hover:border-pigment-indigo'
              )}
            >
              <input
                type="radio"
                name="crypto-asset"
                value={a.id}
                checked={asset === a.id}
                onChange={() => onAssetChange(a.id)}
                className="sr-only"
              />
              {a.label}{' '}
              <span className="font-mono text-2xs text-ink-faint">{a.id}</span>
            </label>
          ))}
        </div>
        <p className="mt-2 text-xs text-ink-faint">
          {ASSETS.find((a) => a.id === asset)?.network}
        </p>
      </fieldset>

      <div className="border border-rule bg-paper-sunk p-4">
        <p className="font-mono text-2xs uppercase tracking-[0.14em] text-ink-faint">
          Amount due
        </p>
        <p className="mt-1 font-display text-2xl font-semibold tabular">{formatPrice(total)}</p>

        <div className="mt-4 border-t border-rule pt-4">
          <p className="font-mono text-2xs uppercase tracking-[0.14em] text-ink-faint">
            Send {asset} to
          </p>
          {/*
            Deliberately empty. A plausible-looking address here would be the single most
            dangerous thing on the page: someone would send real money to a string that is
            either nobody's or, worse, somebody's.
          */}
          <p className="mt-1.5 break-all border border-dashed border-rule-strong bg-card p-3 font-mono text-xs text-ink-faint">
            No wallet is connected — no address to display.
          </p>
        </div>

        <p className="mt-3 text-xs leading-relaxed text-ink-faint">
          A live integration would quote the {asset} amount against a rate held for a short
          window, and wait for network confirmations before releasing the order.
        </p>
      </div>

      <NotConnected>
        No wallet is connected to this build. On-chain payments are irreversible, so this is
        the one method where a half-finished integration could lose someone real money.
      </NotConnected>
    </div>
  );
}

/* ------------------------------------------------------------------ parts */

function NotConnected({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-start gap-2.5 border border-warning/40 bg-warning/5 p-3 text-xs leading-relaxed text-ink-soft">
      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" strokeWidth={1.75} />
      <span>
        <strong className="font-medium text-ink">Demonstration only.</strong> {children}
      </span>
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
