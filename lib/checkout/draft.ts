/*
  Where a shopper left the checkout form, kept in this browser so they find it as they left it.

  Stored under `mranabolics-checkout`, beside the cart (`mranabolics-cart`). What is kept is only
  what the person typed or chose: contact, address, the delivery option and the payment method,
  by name. Never a price, a total, a discount code or its quote — the server prices everything
  when the order is placed — and never the marketing checkbox: consent is given fresh each time,
  never pre-ticked from a previous visit.

  Kept after an order is placed, so the next checkout on this device starts filled in; removed
  when the person signs out of their account (components/account/account-view.tsx), which is the
  moment somebody says "this device is not just mine".

  Every access is wrapped: private windows and blocked storage throw, and a checkout that throws
  while restoring a convenience would be a far worse outcome than one that starts empty.
*/

export const CHECKOUT_DRAFT_KEY = 'mranabolics-checkout';

export type CheckoutDraft = {
  email: string;
  firstName: string;
  lastName: string;
  address: string;
  city: string;
  phone: string;
  country: string;
  /** The delivery option's name, as the server quotes and checks it. */
  shippingMethod: string;
  /** The payment method's key (crypto, bank_transfer, cashapp). */
  paymentMethod: string;
};

const FIELDS: (keyof CheckoutDraft)[] = [
  'email',
  'firstName',
  'lastName',
  'address',
  'city',
  'phone',
  'country',
  'shippingMethod',
  'paymentMethod',
];

/* Long enough for any real address line; a cap so a corrupted entry cannot balloon the form. */
const MAX_LENGTH = 300;

export function readCheckoutDraft(): Partial<CheckoutDraft> | null {
  try {
    const raw = window.localStorage.getItem(CHECKOUT_DRAFT_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    /* Only the known fields, only strings: whatever else is in there is ignored. */
    const draft: Partial<CheckoutDraft> = {};
    for (const field of FIELDS) {
      const value = (parsed as Record<string, unknown>)[field];
      if (typeof value === 'string' && value.length <= MAX_LENGTH) draft[field] = value;
    }
    return draft;
  } catch {
    return null;
  }
}

export function writeCheckoutDraft(draft: CheckoutDraft): void {
  try {
    /* Nothing typed yet: leave no entry behind rather than an empty one. */
    if (FIELDS.every((field) => !draft[field].trim())) {
      window.localStorage.removeItem(CHECKOUT_DRAFT_KEY);
      return;
    }
    window.localStorage.setItem(CHECKOUT_DRAFT_KEY, JSON.stringify(draft));
  } catch {
    /* Storage full or blocked: the form keeps working, it just will not be remembered. */
  }
}

export function clearCheckoutDraft(): void {
  try {
    window.localStorage.removeItem(CHECKOUT_DRAFT_KEY);
  } catch {
    /* Nothing to do. */
  }
}
