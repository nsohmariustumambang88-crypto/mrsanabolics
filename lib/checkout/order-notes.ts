/*
  How a storefront order records the way it is being paid, in `Order.notes`.

  The Order model has no payment columns (see "Orders" in CLAUDE.md), so the method and, for
  crypto, the NOWPayments invoice live in the notes. Four places read or write them — the
  checkout, the crypto route, the payment page and the NOWPayments webhook — and they used to
  carry their own copies of the regex. This module is now the only place the format is written
  down; change it here or nowhere.

    Payment: bank_transfer
    Payment: crypto (BTC)                                    order saved, invoice not yet created
    Crypto payment - BTC | Payment ID: 4698216265 | Amount: 0.00324179 BTC | Address: 343bYp…

  The amount and address were added in November 2026 so the payment page can show them without
  asking NOWPayments, which sometimes takes 20–60 seconds to answer. Older notes stop after the
  payment id and still parse; the page then falls back to asking NOWPayments.

  A plain module (no server-only) so the admin and the email templates can use it too.
*/

export type PaymentMethodKey = 'crypto' | 'bank_transfer' | 'cashapp';

export const PAYMENT_METHOD_LABEL: Record<string, string> = {
  crypto: 'Cryptocurrency',
  bank_transfer: 'Bank transfer',
  cashapp: 'Cash App',
};

export type CryptoNote = {
  /** BTC or ETH, upper case. */
  asset: string;
  /** NOWPayments payment id: digits only. */
  paymentId: string;
  /** What the customer must send, in the coin, as NOWPayments quoted it. */
  payAmount?: string;
  /** Where to send it. */
  payAddress?: string;
};

/** The note written when a checkout order is first saved, before any crypto invoice exists. */
export function formatCheckoutNote(method: string, cryptoAsset?: string): string {
  return `Payment: ${method}${cryptoAsset ? ` (${cryptoAsset})` : ''}`;
}

/** The note written once NOWPayments has created the invoice. Replaces the checkout note. */
export function formatCryptoNote(note: CryptoNote): string {
  const parts = [`Crypto payment - ${note.asset.toUpperCase()}`, `Payment ID: ${note.paymentId}`];
  if (note.payAmount && note.payAddress) {
    parts.push(`Amount: ${note.payAmount} ${note.asset.toUpperCase()}`, `Address: ${note.payAddress}`);
  }
  return parts.join(' | ');
}

/** The crypto invoice recorded on an order, or null when there is none. */
export function parseCryptoNote(notes: string | null | undefined): CryptoNote | null {
  if (!notes) return null;
  const paymentId = notes.match(/Payment ID: (\d+)/)?.[1];
  if (!paymentId) return null;
  const asset = notes.match(/Crypto payment - (\w+)/)?.[1]?.toUpperCase() ?? 'BTC';
  const payAmount = notes.match(/Amount: ([\d.]+) \w+/)?.[1];
  const payAddress = notes.match(/Address: (\S+)/)?.[1];
  return { asset, paymentId, payAmount, payAddress };
}

/** Which method the customer chose, from either note shape. Null for orders typed in by staff. */
export function paymentMethodFromNotes(notes: string | null | undefined): string | null {
  if (!notes) return null;
  if (/^Crypto payment - /.test(notes)) return 'crypto';
  return notes.match(/^Payment: (\w+)/)?.[1] ?? null;
}
