'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Check,
  ChevronLeft,
  CreditCard,
  Bitcoin,
  Landmark,
  Wallet,
  Lock,
  ShoppingBag,
  Truck,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useStore } from '@/components/providers/store-provider';
import { formatPrice } from '@/lib/format';
import { cn } from '@/lib/utils';

const steps = ['Shipping', 'Billing', 'Review', 'Payment', 'Confirmation'];

const paymentMethods = [
  { id: 'card', label: 'Credit / Debit Card', icon: CreditCard, desc: 'Visa, Mastercard, Amex' },
  { id: 'paypal', label: 'PayPal', icon: Wallet, desc: 'Pay with your PayPal balance' },
  { id: 'crypto', label: 'Cryptocurrency', icon: Bitcoin, desc: 'BTC, ETH, USDT, LTC' },
  { id: 'bank', label: 'Bank Transfer', icon: Landmark, desc: 'Direct wire transfer' },
];

export default function CheckoutPage() {
  const { cart, cartSubtotal, clearCart } = useStore();
  const [step, setStep] = React.useState(0);
  const [guest, setGuest] = React.useState(true);
  const [paymentMethod, setPaymentMethod] = React.useState('card');
  const [orderComplete, setOrderComplete] = React.useState(false);

  const shipping = cartSubtotal > 150 || cartSubtotal === 0 ? 0 : 14.95;
  const tax = cartSubtotal * 0.08;
  const total = cartSubtotal + shipping + tax;

  const next = () => setStep((s) => Math.min(s + 1, steps.length - 1));
  const prev = () => setStep((s) => Math.max(s - 1, 0));

  const placeOrder = () => {
    setOrderComplete(true);
    setStep(4);
    clearCart();
  };

  if (cart.length === 0 && !orderComplete) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-24 text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-secondary">
          <ShoppingBag className="h-8 w-8 text-muted-foreground" />
        </div>
        <h1 className="mt-6 font-display text-3xl font-bold">Your cart is empty</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Add some products before heading to checkout.
        </p>
        <Button asChild className="mt-6 bg-accent text-black hover:bg-accent/90">
          <Link href="/shop">Browse Products</Link>
        </Button>
      </div>
    );
  }

  if (orderComplete) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-24 text-center">
        <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-accent/10">
          <CheckCircle2 className="h-12 w-12 text-accent" />
        </div>
        <h1 className="mt-8 font-display text-4xl font-bold">Order Confirmed</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Thank you for your order. A confirmation email with tracking details
          has been sent to your inbox.
        </p>
        <div className="mt-8 rounded-2xl border border-border/50 bg-card p-6 text-left">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Order Number</span>
            <span className="font-mono font-semibold">#MA-{Date.now().toString().slice(-8)}</span>
          </div>
          <Separator className="my-4" />
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Estimated Delivery</span>
            <span className="font-medium">3–5 business days</span>
          </div>
          <Separator className="my-4" />
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Payment Method</span>
            <span className="capitalize">{paymentMethod}</span>
          </div>
        </div>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button asChild className="bg-accent text-black hover:bg-accent/90">
            <Link href="/shop">Continue Shopping</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/account?tab=orders">Track Order</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 lg:px-6">
      <Link href="/shop" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-4 w-4" />
        Continue Shopping
      </Link>

      <h1 className="mt-4 font-display text-3xl font-bold tracking-tight md:text-4xl">Checkout</h1>

      <div className="mt-8 flex flex-wrap items-center gap-2">
        {steps.map((s, i) => (
          <React.Fragment key={s}>
            <div
              className={cn(
                'flex items-center gap-2 rounded-full px-3 py-1.5 text-sm transition-colors',
                i === step
                  ? 'bg-accent text-black font-semibold'
                  : i < step
                  ? 'bg-secondary text-foreground'
                  : 'text-muted-foreground'
              )}
            >
              {i < step ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                <span className="text-xs font-bold">{i + 1}</span>
              )}
              <span className="hidden sm:inline">{s}</span>
            </div>
            {i < steps.length - 1 && (
              <div className={cn('h-px w-4 sm:w-8', i < step ? 'bg-accent' : 'bg-border')} />
            )}
          </React.Fragment>
        ))}
      </div>

      <div className="mt-10 grid gap-10 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {step === 0 && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-xl font-bold">Shipping Information</h2>
                <Button variant="ghost" size="sm" onClick={() => setGuest(!guest)}>
                  {guest ? 'Have an account? Sign in' : 'Checkout as guest'}
                </Button>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="firstName">First Name</Label>
                  <Input id="firstName" className="mt-1.5" placeholder="John" />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input id="lastName" className="mt-1.5" placeholder="Doe" />
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" className="mt-1.5" placeholder="john@example.com" />
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="address">Address</Label>
                  <Input id="address" className="mt-1.5" placeholder="123 Main Street" />
                </div>
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input id="city" className="mt-1.5" placeholder="New York" />
                </div>
                <div>
                  <Label htmlFor="zip">Postal Code</Label>
                  <Input id="zip" className="mt-1.5" placeholder="10001" />
                </div>
                <div>
                  <Label htmlFor="country">Country</Label>
                  <Input id="country" className="mt-1.5" placeholder="United States" />
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" className="mt-1.5" placeholder="+1 (555) 000-0000" />
                </div>
              </div>
              <div className="rounded-xl border border-border/50 bg-secondary/30 p-4">
                <p className="text-sm font-medium">Shipping Method</p>
                <RadioGroup defaultValue="standard" className="mt-3 space-y-2">
                  <label className="flex cursor-pointer items-center justify-between rounded-lg border border-border p-3 has-[:checked]:border-accent">
                    <div className="flex items-center gap-3">
                      <RadioGroupItem value="standard" id="standard" />
                      <div>
                        <p className="text-sm font-medium">Standard (3–5 days)</p>
                        <p className="text-xs text-muted-foreground">Discreet packaging</p>
                      </div>
                    </div>
                    <span className="text-sm font-semibold">{shipping === 0 ? 'Free' : formatPrice(shipping)}</span>
                  </label>
                  <label className="flex cursor-pointer items-center justify-between rounded-lg border border-border p-3 has-[:checked]:border-accent">
                    <div className="flex items-center gap-3">
                      <RadioGroupItem value="express" id="express" />
                      <div>
                        <p className="text-sm font-medium">Express (1–2 days)</p>
                        <p className="text-xs text-muted-foreground">Priority dispatch</p>
                      </div>
                    </div>
                    <span className="text-sm font-semibold">$29.95</span>
                  </label>
                </RadioGroup>
              </div>
              <Button onClick={next} className="w-full bg-accent text-black hover:bg-accent/90 sm:w-auto">
                Continue to Billing
              </Button>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-6 animate-fade-in">
              <h2 className="font-display text-xl font-bold">Billing Information</h2>
              <label className="flex items-center gap-3 rounded-lg border border-border p-3 cursor-pointer has-[:checked]:border-accent">
                <input type="checkbox" defaultChecked className="accent-accent" />
                <span className="text-sm">Billing address same as shipping address</span>
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="bAddress">Billing Address</Label>
                  <Input id="bAddress" className="mt-1.5" placeholder="123 Main Street" />
                </div>
                <div>
                  <Label htmlFor="bCity">City</Label>
                  <Input id="bCity" className="mt-1.5" placeholder="New York" />
                </div>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={prev}>Back</Button>
                <Button onClick={next} className="bg-accent text-black hover:bg-accent/90">
                  Review Order
                </Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6 animate-fade-in">
              <h2 className="font-display text-xl font-bold">Review Your Order</h2>
              <div className="space-y-3">
                {cart.map((item) => (
                  <div key={item.productId} className="flex items-center gap-4 rounded-xl border border-border/50 bg-card p-3">
                    <div className="h-16 w-16 overflow-hidden rounded-lg bg-background">
                      <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{item.brand} · Qty {item.quantity}</p>
                    </div>
                    <span className="text-sm font-semibold">{formatPrice(item.price * item.quantity)}</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={prev}>Back</Button>
                <Button onClick={next} className="bg-accent text-black hover:bg-accent/90">
                  Proceed to Payment
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6 animate-fade-in">
              <h2 className="font-display text-xl font-bold">Payment Method</h2>
              <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="space-y-3">
                {paymentMethods.map((m) => (
                  <label
                    key={m.id}
                    className="flex cursor-pointer items-center gap-4 rounded-xl border border-border p-4 transition-colors has-[:checked]:border-accent has-[:checked]:bg-accent/5"
                  >
                    <RadioGroupItem value={m.id} id={m.id} />
                    <m.icon className="h-5 w-5 text-accent" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{m.label}</p>
                      <p className="text-xs text-muted-foreground">{m.desc}</p>
                    </div>
                  </label>
                ))}
              </RadioGroup>

              {paymentMethod === 'card' && (
                <div className="grid gap-4 rounded-xl border border-border/50 bg-secondary/30 p-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <Label htmlFor="cardNumber">Card Number</Label>
                    <Input id="cardNumber" className="mt-1.5 bg-background" placeholder="4242 4242 4242 4242" />
                  </div>
                  <div>
                    <Label htmlFor="expiry">Expiry Date</Label>
                    <Input id="expiry" className="mt-1.5 bg-background" placeholder="MM / YY" />
                  </div>
                  <div>
                    <Label htmlFor="cvc">CVC</Label>
                    <Input id="cvc" className="mt-1.5 bg-background" placeholder="123" />
                  </div>
                </div>
              )}
              {paymentMethod === 'crypto' && (
                <div className="rounded-xl border border-border/50 bg-secondary/30 p-4 text-sm text-muted-foreground">
                  You will be redirected to complete payment via our secure crypto gateway after placing your order.
                </div>
              )}
              {paymentMethod === 'paypal' && (
                <div className="rounded-xl border border-border/50 bg-secondary/30 p-4 text-sm text-muted-foreground">
                  You will be redirected to PayPal to complete your purchase securely.
                </div>
              )}
              {paymentMethod === 'bank' && (
                <div className="rounded-xl border border-border/50 bg-secondary/30 p-4 text-sm text-muted-foreground">
                  Bank transfer instructions will be emailed to you. Orders ship once payment is confirmed.
                </div>
              )}

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Lock className="h-3.5 w-3.5 text-accent" />
                Your payment information is encrypted and secure.
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={prev}>Back</Button>
                <Button onClick={placeOrder} className="flex-1 bg-accent text-black hover:bg-accent/90">
                  Place Order · {formatPrice(total)}
                </Button>
              </div>
            </div>
          )}
        </div>

        <div>
          <div className="sticky top-24 rounded-2xl border border-border/50 bg-card p-6">
            <h3 className="font-semibold">Order Summary</h3>
            <div className="mt-4 space-y-3">
              {cart.map((item) => (
                <div key={item.productId} className="flex items-center gap-3">
                  <div className="relative h-12 w-12 overflow-hidden rounded-lg bg-background">
                    <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                    <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-black">
                      {item.quantity}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-xs font-medium">{item.name}</p>
                    <p className="text-xs text-muted-foreground">{item.brand}</p>
                  </div>
                  <span className="text-xs font-semibold">{formatPrice(item.price * item.quantity)}</span>
                </div>
              ))}
            </div>
            <Separator className="my-4" />
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span>{formatPrice(cartSubtotal)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Shipping</span>
                <span>{shipping === 0 ? 'Free' : formatPrice(shipping)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Estimated Tax</span>
                <span>{formatPrice(tax)}</span>
              </div>
              <Separator className="my-2" />
              <div className="flex justify-between text-base font-semibold">
                <span>Total</span>
                <span>{formatPrice(total)}</span>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 rounded-lg bg-secondary/40 p-3 text-xs text-muted-foreground">
              <Truck className="h-4 w-4 text-accent" />
              {shipping === 0
                ? 'You qualify for free shipping!'
                : `Add ${formatPrice(150 - cartSubtotal)} more for free shipping`}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
