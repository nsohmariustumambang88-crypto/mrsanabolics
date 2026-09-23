'use client';

import * as React from 'react';
import Link from 'next/link';
import { Check, ArrowLeft, ArrowRight, Lock, Info, ShoppingBag, Loader2 } from 'lucide-react';
import { useStore } from '@/components/providers/store-provider';
import { BullMark } from '@/components/brand/bull-mark';
import Image from 'next/image';

import { formatPrice } from '@/lib/format';
import {
  PaymentMethods,
  type PaymentMethod,
} from '@/components/checkout/payment-methods';
import { useSubscribe } from '@/components/marketing/use-subscribe';
import {
  useDeliveryQuote,
  useDiscountCode,
} from '@/components/checkout/use-checkout-quotes';
import { CONSENT } from '@/lib/marketing/consent';
import { cn } from '@/lib/utils';
import { submitCheckout } from '@/app/checkout/checkout-actions';

/*
  The lift: one contact, and the sheet is committed. The wizard mirrors that — each step is a
  decision you can walk back until the final contact, which cannot be undone.

  Payment is not connected on this build. The confirmation step says so rather than staging a
  fake transaction.
*/

const STEPS = ['Shipping', 'Billing', 'Review', 'Payment', 'Done'] as const;
const FREE_SHIPPING_AT = 250;
const SHIPPING_FLAT = 14;
const TAX_RATE = 0.08;

export type CheckoutPaymentMethod = {
  key: string;
  label: string;
  notice: string;
};

export function CheckoutFlow({
  paymentMethods,
}: {
  /** Enabled methods, in order, read from the database by the server page above. */
  paymentMethods: CheckoutPaymentMethod[];
}) {
  const { cart, cartSubtotal, clearCart, cartCount } = useStore();

  const [step, setStep] = React.useState(0);
  const [placed, setPlaced] = React.useState(false);
  const [orderReference, setOrderReference] = React.useState('');
  const [method, setMethod] = React.useState<PaymentMethod>('card');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState('');

  /* Form state */
  const [firstName, setFirstName] = React.useState('');
  const [lastName, setLastName] = React.useState('');
  const [billName, setBillName] = React.useState('');
  const [billAddr, setBillAddr] = React.useState('');
  const [billCity, setBillCity] = React.useState('');
  const [billPost, setBillPost] = React.useState('');

  /*
    Abandoned-cart capture.

    The address is asked for at the shipping step because an order needs one anyway, and the
    marketing consent sits beside it as a separate, unticked box — bundling the two would make
    the consent invalid, since it would not be freely given. The basket value travels with the
    sign-up so a recovery email can name what was left behind.
  */
  const marketing = useSubscribe('checkout', cartSubtotal);

  /*
    Delivery and discounts are administered, not hard-coded.

    Both are quoted by the server against the live tables — /api/delivery/quote for the rates a
    zone offers this basket, /api/discount/validate for a code. Neither is computed in the
    browser, because a price the client works out for itself is a price a client can change.
    What is held here is only what the person chose.
  */
  const [country, setCountry] = React.useState('');
  const delivery = useDeliveryQuote(country, cartSubtotal);
  const discount = useDiscountCode(cartSubtotal);

  const chosenRate =
    delivery.options.find((o) => o.rateId === delivery.selectedId) ?? delivery.options[0] ?? null;

  const shippingBase = chosenRate
    ? chosenRate.price
    : cartSubtotal >= FREE_SHIPPING_AT || cartSubtotal === 0
      ? 0
      : SHIPPING_FLAT;

  /* A free-shipping code zeroes the carriage, not the goods. */
  const shipping = discount.applied?.freeShipping ? 0 : shippingBase;
  const discountAmount = Math.min(discount.applied?.amount ?? 0, cartSubtotal);

  const taxable = Math.max(0, cartSubtotal - discountAmount);
  const tax = taxable * TAX_RATE;
  const total = taxable + shipping + tax;

  const next = () => {
    /*
      Record the sign-up on the way out of the shipping step, not on the confirmation screen.
      Someone who abandons at payment is exactly the person a recovery email is for, and by
      then they have already left.
    */
    if (step === 0 && marketing.consent && !marketing.done) void marketing.submit();
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };
  const back = () => setStep((s) => Math.max(s - 1, 0));

  const place = async () => {
    setSubmitError('');
    setIsSubmitting(true);

    try {
      const result = await submitCheckout({
        email: marketing.email,
        firstName,
        lastName,
        country,
        cart: cart.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
        shipping: {
          line1: billAddr,
          city: billCity,
          postcode: billPost,
        },
        shippingMethod: chosenRate?.name,
        shippingCost: shipping,
        discountCode: discount.code,
        total,
      });

      if (result.ok) {
        setOrderReference(result.reference);
        setPlaced(true);
        clearCart();
        setStep(STEPS.length - 1);
      } else {
        setSubmitError(result.error);
      }
    } catch (error) {
      setSubmitError('Failed to place order. Please try again.');
      console.error('Checkout error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (cart.length === 0 && !placed) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 text-center">
        <ShoppingBag className="h-8 w-8 text-ink-faint" strokeWidth={1.25} />
        <h1 className="mt-5 font-display text-2xl font-semibold tracking-[-0.03em]">
          Nothing to check out
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-soft">
          Your cart is empty. Add a compound and its specification will travel with it through
          checkout.
        </p>
        <Link
          href="/shop"
          className="mt-7 rounded-full bg-pigment-indigo px-6 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-pigment-indigo-lift"
        >
          Browse the catalogue
        </Link>
      </div>
    );
  }

  if (placed) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-4 py-16 text-center">
        <BullMark title="MrAnabolics" className="w-32" />
        <h1 className="mt-8 font-display text-3xl font-semibold tracking-[-0.035em]">
          Order placed
        </h1>
        <div className="mt-6 rounded-lg border border-pigment-indigo bg-paper-sunk p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-ink-faint">Order reference</p>
          <p className="font-mono text-xl font-semibold text-ink">{orderReference}</p>
        </div>
        <p className="measure-tight mt-6 text-sm leading-relaxed text-ink-soft">
          A confirmation email has been sent with your order details and tracking information.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/shop"
            className="rounded-full bg-pigment-indigo px-6 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-pigment-indigo-lift"
          >
            Keep browsing
          </Link>
          <Link
            href="/account?tab=orders"
            className="rounded-full border border-rule-strong px-6 py-3 text-sm font-medium transition-colors hover:border-pigment-indigo"
          >
            Your orders
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <section className="border-b border-rule">
        <div className="mx-auto max-w-[86rem] px-4 py-8 sm:px-6 lg:px-10">
          <h1 className="font-display text-2xl font-semibold tracking-[-0.03em] sm:text-3xl">
            Checkout
          </h1>

          <ol className="mt-6 flex flex-wrap items-center gap-x-2 gap-y-2">
            {STEPS.slice(0, 4).map((label, i) => (
              <li key={label} className="flex items-center gap-2">
                <span
                  className={cn(
                    'flex h-6 w-6 items-center justify-center rounded-full border font-mono text-2xs tabular transition-colors',
                    i < step
                      ? 'border-pigment-verdigris bg-pigment-verdigris text-primary-foreground'
                      : i === step
                        ? 'border-pigment-indigo bg-pigment-indigo text-primary-foreground'
                        : 'border-rule-strong text-ink-faint'
                  )}
                >
                  {i < step ? <Check className="h-3 w-3" strokeWidth={2.5} /> : i + 1}
                </span>
                <span
                  className={cn(
                    'text-sm',
                    i === step ? 'font-medium text-ink' : 'text-ink-faint'
                  )}
                >
                  {label}
                </span>
                {i < 3 && (
                  <span
                    className={cn(
                      'ml-1 hidden h-px w-8 sm:block',
                      i < step ? 'bg-pigment-verdigris' : 'bg-rule'
                    )}
                    aria-hidden="true"
                  />
                )}
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/*
        The vertical padding belongs to the container, not the grid. A hairline grid draws its
        rules by letting its own background show through a 1px gap — so padding on the grid
        itself is 40px of bare rule colour banded across the top and bottom, which is what this
        page had. Same failure mode as a short final row, different cause.
      */}
      <div className="mx-auto max-w-[86rem] px-4 py-10 sm:px-6 lg:px-10">
        <div className="grid gap-px bg-rule lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-px">
          <div className="bg-card p-6 sm:p-8">
            {step === 0 && (
              <Fieldset legend="Where it ships">
                <div>
                  <label htmlFor="checkout-email" className="block text-sm font-medium">
                    Email address
                  </label>
                  <input
                    id="checkout-email"
                    type="email"
                    autoComplete="email"
                    value={marketing.email}
                    onChange={(e) => marketing.setEmail(e.target.value)}
                    placeholder="you@domain.com"
                    className="mt-2 w-full border-b border-rule-strong bg-transparent py-2.5 text-sm outline-none focus:border-pigment-indigo"
                  />
                  <p className="mt-1.5 text-xs text-ink-faint">
                    Where the order confirmation would go.
                  </p>

                  {/*
                    Separate and unticked. Consent bundled into a required field is not freely
                    given, and an address collected that way cannot lawfully be marketed to.
                  */}
                  <label className="mt-3 flex cursor-pointer items-start gap-2.5 text-xs leading-relaxed text-ink-soft">
                    <input
                      type="checkbox"
                      checked={marketing.consent}
                      onChange={(e) => marketing.setConsent(e.target.checked)}
                      className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-pigment-indigo"
                    />
                    {CONSENT.checkout}
                  </label>

                  {marketing.error && (
                    <p role="alert" className="mt-2 text-xs text-destructive">
                      {marketing.error}
                    </p>
                  )}
                </div>

                <Row>
                  <Input
                    id="first"
                    label="First name"
                    autoComplete="given-name"
                    value={firstName}
                    onChange={setFirstName}
                  />
                  <Input
                    id="last"
                    label="Last name"
                    autoComplete="family-name"
                    value={lastName}
                    onChange={setLastName}
                  />
                </Row>
                <Input
                  id="addr1"
                  label="Address"
                  autoComplete="address-line1"
                  value={billAddr}
                  onChange={setBillAddr}
                />
                <Input
                  id="addr2"
                  label="Apartment, suite (optional)"
                  autoComplete="address-line2"
                  required={false}
                />
                <Row>
                  <Input
                    id="city"
                    label="City"
                    autoComplete="address-level2"
                    value={billCity}
                    onChange={setBillCity}
                  />
                  <Input
                    id="post"
                    label="Postal code"
                    autoComplete="postal-code"
                    value={billPost}
                    onChange={setBillPost}
                  />
                </Row>
                <div>
                  <label htmlFor="country" className="block text-sm font-medium">
                    Country
                  </label>
                  <input
                    id="country"
                    autoComplete="country"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    placeholder="Two-letter code, e.g. US"
                    maxLength={2}
                    className="mt-2 w-full border-b border-rule-strong bg-transparent py-2.5 text-sm uppercase outline-none focus:border-pigment-indigo"
                  />
                  <p className="mt-1.5 text-xs text-ink-faint">
                    The delivery options below are the ones set for that country.
                  </p>
                </div>

                {/*
                  Delivery options, quoted by the server for this country and this basket.
                  Nothing is shown until a country is given, because a rate without a
                  destination is a guess presented as a price.
                */}
                {country.trim().length >= 2 && (
                  <fieldset>
                    <legend className="font-mono text-2xs uppercase tracking-[0.16em] text-ink-faint">
                      Delivery
                    </legend>

                    {delivery.loading && delivery.options.length === 0 && (
                      <p className="mt-3 text-sm text-ink-faint">Checking options…</p>
                    )}

                    {delivery.uncovered && !delivery.loading && (
                      <p className="mt-3 border border-rule bg-paper-sunk p-3.5 text-xs leading-relaxed text-ink-soft">
                        No delivery option is set up for that country yet. Send an enquiry and
                        somebody will tell you whether it can be shipped.
                      </p>
                    )}

                    {delivery.options.length > 0 && (
                      <div className="mt-3 grid gap-px border border-rule bg-rule">
                        {delivery.options.map((option) => {
                          const active = delivery.selectedId === option.rateId;
                          return (
                            <label
                              key={option.rateId}
                              className={cn(
                                'flex cursor-pointer items-center gap-3 bg-card p-3.5 transition-colors',
                                active ? 'bg-paper-sunk' : 'hover:bg-paper-sunk'
                              )}
                            >
                              <input
                                type="radio"
                                name="delivery-rate"
                                value={option.rateId}
                                checked={active}
                                onChange={() => delivery.select(option.rateId)}
                                className="h-4 w-4 shrink-0 accent-pigment-indigo"
                              />
                              <span className="min-w-0 flex-1">
                                <span className="block text-sm font-medium">{option.name}</span>
                                {option.estimate && (
                                  <span className="block text-xs text-ink-faint">
                                    {option.estimate}
                                  </span>
                                )}
                              </span>
                              <span
                                className={cn(
                                  'shrink-0 text-sm tabular',
                                  option.free && 'text-pigment-verdigris'
                                )}
                              >
                                {option.free ? 'Free' : formatPrice(option.price)}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </fieldset>
                )}
              </Fieldset>
            )}

            {step === 1 && (
              <Fieldset legend="Who is paying">
                <Input
                  id="bill-name"
                  label="Name on the account"
                  autoComplete="name"
                  value={billName}
                  onChange={setBillName}
                />
                <Input
                  id="bill-addr"
                  label="Billing address"
                  autoComplete="billing street-address"
                  value={billAddr}
                  onChange={setBillAddr}
                />
                <Row>
                  <Input
                    id="bill-city"
                    label="City"
                    value={billCity}
                    onChange={setBillCity}
                  />
                  <Input
                    id="bill-post"
                    label="Postal code"
                    value={billPost}
                    onChange={setBillPost}
                  />
                </Row>
                <label className="flex items-center gap-2.5 pt-2 text-sm text-ink-soft">
                  <input type="checkbox" defaultChecked className="accent-pigment-indigo" />
                  Billing address is the same as shipping
                </label>
              </Fieldset>
            )}

            {step === 2 && (
              <div>
                <h2 className="font-display text-lg font-semibold tracking-[-0.025em]">
                  Check the order
                </h2>
                <ul className="mt-5 border-t border-rule">
                  {cart.map((item) => (
                    <li
                      key={item.productId}
                      className="flex items-center gap-4 border-b border-rule py-4"
                    >
                      <span className="relative h-14 w-14 shrink-0 overflow-hidden border border-rule bg-paper-sunk">
                        {item.image ? (
                          /* The cart's own snapshot: no catalogue lookup, so none is shipped. */
                          <Image src={item.image} alt="" fill sizes="56px" className="object-contain mix-blend-multiply dark:mix-blend-normal" />
                        ) : null}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-mono text-2xs uppercase tracking-[0.14em] text-ink-faint">
                          {item.brand}
                        </span>
                        <span className="mt-0.5 block text-sm font-medium">{item.name}</span>
                      </span>
                      <span className="font-mono text-xs text-ink-faint tabular">
                        ×{item.quantity}
                      </span>
                      <span className="text-sm font-medium tabular">
                        {formatPrice(item.price * item.quantity)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {step === 3 && (
              <PaymentMethods
                total={total}
                method={method}
                onMethodChange={setMethod}
                methods={paymentMethods}
              />
            )}

            {submitError && (
              <div className="mb-6 flex gap-2.5 rounded-lg border border-destructive bg-paper-sunk p-3.5 text-left text-sm text-destructive">
                <Info className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.75} />
                {submitError}
              </div>
            )}

            <div className="mt-8 flex items-center justify-between gap-4 border-t border-rule pt-6">
              <button
                type="button"
                onClick={back}
                disabled={step === 0 || isSubmitting}
                className="inline-flex items-center gap-2 text-sm text-ink-soft transition-colors hover:text-ink disabled:opacity-40"
              >
                <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
                Back
              </button>

              {step < 3 ? (
                <button
                  type="button"
                  onClick={next}
                  disabled={isSubmitting}
                  className="group inline-flex items-center gap-2.5 rounded-full bg-pigment-indigo px-6 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-pigment-indigo-lift disabled:opacity-60"
                >
                  Continue
                  <ArrowRight
                    className="h-4 w-4"
                    strokeWidth={1.75}
                  />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={place}
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2.5 rounded-full bg-pigment-indigo px-6 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-pigment-indigo-lift disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.75} />
                      Placing…
                    </>
                  ) : (
                    <>
                      <Lock className="h-4 w-4" strokeWidth={1.75} />
                      Place order · {formatPrice(total)}
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          <aside className="bg-card p-6 sm:p-8">
            <h2 className="font-mono text-2xs uppercase tracking-[0.16em] text-ink-faint">
              Order summary
            </h2>
            <p className="mt-2 text-sm text-ink-soft tabular">
              {cartCount} {cartCount === 1 ? 'item' : 'items'}
            </p>

            <dl className="mt-6 space-y-3 border-t border-rule pt-5 text-sm">
              <div className="flex justify-between">
                <dt className="text-ink-soft">Subtotal</dt>
                <dd className="tabular">{formatPrice(cartSubtotal)}</dd>
              </div>
              {discountAmount > 0 && discount.applied && (
                <div className="flex justify-between">
                  <dt className="text-ink-soft">
                    Discount
                    <span className="ml-1.5 font-mono text-2xs uppercase tracking-[0.12em] text-ink-faint">
                      {discount.applied.code}
                    </span>
                  </dt>
                  <dd className="tabular text-pigment-verdigris">
                    −{formatPrice(discountAmount)}
                  </dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-ink-soft">
                  Shipping
                  {chosenRate && (
                    <span className="ml-1.5 text-xs text-ink-faint">{chosenRate.name}</span>
                  )}
                </dt>
                <dd className={cn('tabular', shipping === 0 && 'text-pigment-verdigris')}>
                  {shipping === 0 ? 'Free' : formatPrice(shipping)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-soft">Estimated tax</dt>
                <dd className="tabular">{formatPrice(tax)}</dd>
              </div>
              <div className="flex items-baseline justify-between border-t border-rule pt-4">
                <dt className="font-medium">Total</dt>
                <dd className="font-display text-xl font-semibold tabular">
                  {formatPrice(total)}
                </dd>
              </div>
            </dl>

            {/*
              The code is checked by the server, never in the browser. The message it returns
              is shown verbatim: it deliberately does not distinguish a code that never existed
              from one that has expired, so this box cannot be used to enumerate live codes.
            */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void discount.apply();
              }}
              className="mt-6 border-t border-rule pt-5"
            >
              <label
                htmlFor="discount-code"
                className="font-mono text-2xs uppercase tracking-[0.16em] text-ink-faint"
              >
                Discount code
              </label>

              {discount.applied ? (
                <p className="mt-2.5 flex items-center justify-between gap-3 border border-rule bg-paper-sunk px-3 py-2.5 text-sm">
                  <span className="font-medium tabular">{discount.applied.code}</span>
                  <button
                    type="button"
                    onClick={discount.clear}
                    className="text-xs text-ink-faint underline underline-offset-4 transition-colors hover:text-pigment-madder"
                  >
                    Remove
                  </button>
                </p>
              ) : (
                <div className="mt-2.5 flex gap-2">
                  <input
                    id="discount-code"
                    value={discount.code}
                    onChange={(e) => discount.setCode(e.target.value)}
                    placeholder="Enter a code"
                    className="min-w-0 flex-1 border-b border-rule-strong bg-transparent py-2 text-sm uppercase outline-none focus:border-pigment-indigo"
                  />
                  <button
                    type="submit"
                    disabled={discount.checking || !discount.code.trim()}
                    className="shrink-0 border border-rule-strong px-3 py-2 text-sm font-medium transition-colors hover:border-pigment-indigo disabled:opacity-40"
                  >
                    {discount.checking ? 'Checking…' : 'Apply'}
                  </button>
                </div>
              )}

              {discount.message && (
                <p role="status" className="mt-2 text-xs text-ink-soft">
                  {discount.message}
                </p>
              )}
            </form>

            <p className="mt-6 text-xs leading-relaxed text-ink-faint">
              Ships unmarked and tracked. Certificates of analysis for each batch are attached
              to the confirmation.
            </p>
          </aside>
        </div>
      </div>
    </>
  );
}

function Fieldset({
  legend,
  children,
}: {
  legend: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset>
      <legend className="font-display text-lg font-semibold tracking-[-0.025em]">
        {legend}
      </legend>
      <div className="mt-5 space-y-5">{children}</div>
    </fieldset>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-5 sm:grid-cols-2">{children}</div>;
}

function Input({
  id,
  label,
  placeholder,
  autoComplete,
  required = true,
  value = '',
  onChange,
}: {
  id: string;
  label: string;
  placeholder?: string;
  autoComplete?: string;
  required?: boolean;
  value?: string;
  onChange?: (value: string) => void;
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
        required={required}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        className="mt-2 w-full border-b border-rule-strong bg-transparent py-2.5 text-sm outline-none placeholder:text-ink-faint focus:border-pigment-indigo"
      />
    </div>
  );
}
