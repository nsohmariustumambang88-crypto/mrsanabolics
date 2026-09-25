'use client';

import * as React from 'react';
import { Smartphone, Bitcoin, Lock, Info, Landmark, CreditCard } from 'lucide-react';
import { formatPrice } from '@/lib/format';
import { cn } from '@/lib/utils';

/*
  Choosing how to pay.

  MULTIPLE METHODS, NONE OF THEM CONNECTED. This build has no payment processor and the panels
  say so at the point of entry rather than only on the confirmation screen — a demo that looks
  like it took your money is worse than one that admits it did not. Wiring any of these to a
  real destination is a deliberate act, not a matter of filling in a constant.

  The methods themselves are a real decision: bank transfers, peer-to-peer wallets, and
  on-chain settlement behave differently enough that the interface has to reflect it.
*/

export type PaymentMethod = 'banktransfer' | 'zelle' | 'revolut' | 'venmo' | 'crypto';
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

/*
  The icon and hint belong to the code, not the database.

  A row could carry them, but then a typo in an admin field would render a broken icon name,
  and the hint is a description of how a rail behaves rather than something a shop configures.
  What the admin owns is the label, the notice, and whether the method appears at all.
*/
const PRESENTATION: Record<string, { hint: string; icon: typeof Landmark }> = {
  banktransfer: { hint: 'Direct bank transfer', icon: Landmark },
  zelle: { hint: 'Send money via Zelle', icon: Landmark },
  revolut: { hint: 'Pay with Revolut', icon: Smartphone },
  venmo: { hint: 'Pay with Venmo', icon: Smartphone },
  crypto: { hint: 'Bitcoin, Ethereum or USDT', icon: Bitcoin },
};

const FALLBACK_PRESENTATION = { hint: 'Alternative payment method', icon: Landmark };

const ASSETS: { id: CryptoAsset; label: string; network: string }[] = [
  { id: 'BTC', label: 'Bitcoin', network: 'Bitcoin network' },
  { id: 'ETH', label: 'Ethereum', network: 'ERC-20' },
  { id: 'USDT', label: 'Tether', network: 'ERC-20 or TRC-20' },
];

export function PaymentMethods({
  total,
  method,
  onMethodChange,
  methods,
}: {
  total: number;
  method: PaymentMethod;
  onMethodChange: (m: PaymentMethod) => void;
  /** Enabled methods from the database, in administered order. */
  methods: PaymentMethodOption[];
}) {
  const [asset, setAsset] = React.useState<CryptoAsset>('BTC');

  /* The notice for whichever method is showing, so each panel states its own position. */
  const notice = methods.find((m) => m.key === method)?.notice ?? '';

  return (
    <div>
      <fieldset>
        <legend className="font-display text-lg font-semibold tracking-[-0.025em]">
          How would you like to pay?
        </legend>

        <div
          className={cn(
            'mt-5 grid gap-px border border-rule bg-rule',
            methods.length > 2 ? 'sm:grid-cols-3' : methods.length === 2 && 'sm:grid-cols-2'
          )}
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
        {method === 'banktransfer' && <BankTransferPanel notice={notice} />}
        {method === 'zelle' && <ZellePanel notice={notice} />}
        {method === 'revolut' && <RevolutPanel notice={notice} />}
        {method === 'venmo' && <VenmoPanel notice={notice} />}
        {method === 'crypto' && (
          <CryptoPanel total={total} asset={asset} onAssetChange={setAsset} notice={notice} />
        )}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------- bank transfer */

function BankTransferPanel({ notice }: { notice: string }) {
  return (
    <div className="space-y-4">
      <p className="text-sm leading-relaxed text-ink-soft">
        Bank transfers are a secure way to pay. Your bank details will be provided to complete the transfer.
      </p>

      <Field id="account" label="Account number" placeholder="•••••••••••" />

      <NotConnected>{notice}</NotConnected>
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

/* ------------------------------------------------------------ revolut */

function RevolutPanel({ notice }: { notice: string }) {
  return (
    <div className="space-y-4">
      <p className="text-sm leading-relaxed text-ink-soft">
        Pay securely with your Revolut account.
      </p>

      <Field id="revolut-username" label="Revolut username" placeholder="@username" />

      <NotConnected>{notice}</NotConnected>
    </div>
  );
}

/* ------------------------------------------------------------------ venmo */

function VenmoPanel({ notice }: { notice: string }) {
  return (
    <div className="space-y-4">
      <p className="text-sm leading-relaxed text-ink-soft">
        Send payment directly through Venmo.
      </p>

      <Field id="venmo-username" label="Venmo username" placeholder="@username" />

      <NotConnected>{notice}</NotConnected>
    </div>
  );
}

/* ----------------------------------------------------------------- crypto */

function CryptoPanel({
  total,
  asset,
  onAssetChange,
  notice,
}: {
  total: number;
  asset: CryptoAsset;
  onAssetChange: (a: CryptoAsset) => void;
  notice: string;
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

      {/*
        The one panel where the standing rule matters most: there is no wallet address here,
        and no field anywhere in the admin that could put one here. On-chain payments are
        irreversible, so a plausible address that is nobody's — or somebody else's — is the
        most expensive thing this page could contain.
      */}
      <NotConnected>{notice}</NotConnected>
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
