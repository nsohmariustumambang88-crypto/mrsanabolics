'use client';

import * as React from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, X, Plus, Minus, Trash2, ArrowRight, Tag } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { useStore } from '@/components/providers/store-provider';
import { formatPrice } from '@/lib/format';

const PROMO_CODES: Record<string, number> = {
  WELCOME10: 0.1,
  PRO15: 0.15,
  STACK20: 0.2,
};

export function CartDrawer() {
  const {
    cart,
    cartOpen,
    setCartOpen,
    removeFromCart,
    updateQuantity,
    cartSubtotal,
  } = useStore();

  const [promo, setPromo] = React.useState('');
  const [appliedDiscount, setAppliedDiscount] = React.useState(0);
  const [promoError, setPromoError] = React.useState('');

  const applyPromo = () => {
    const code = promo.trim().toUpperCase();
    if (PROMO_CODES[code]) {
      setAppliedDiscount(PROMO_CODES[code]);
      setPromoError('');
    } else {
      setPromoError('Invalid promo code');
      setAppliedDiscount(0);
    }
  };

  const discount = cartSubtotal * appliedDiscount;
  const shipping = cartSubtotal > 150 || cartSubtotal === 0 ? 0 : 14.95;
  const tax = (cartSubtotal - discount) * 0.08;
  const total = cartSubtotal - discount + shipping + tax;

  return (
    <Sheet open={cartOpen} onOpenChange={setCartOpen}>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        <SheetHeader className="border-b border-border p-5">
          <SheetTitle className="flex items-center gap-2 font-display">
            <ShoppingBag className="h-5 w-5 text-accent" />
            Your Cart
            <span className="text-sm font-normal text-muted-foreground">
              ({cart.reduce((s, i) => s + i.quantity, 0)})
            </span>
          </SheetTitle>
        </SheetHeader>

        {cart.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-secondary">
              <ShoppingBag className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <p className="font-semibold">Your cart is empty</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Add some premium products to get started.
              </p>
            </div>
            <Button
              asChild
              onClick={() => setCartOpen(false)}
              className="bg-accent text-black hover:bg-accent/90"
            >
              <Link href="/shop">Browse Products</Link>
            </Button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-5">
              <AnimatePresence initial={false}>
                {cart.map((item) => (
                  <motion.div
                    key={item.productId}
                    layout
                    initial={{ opacity: 0, x: 40 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -40 }}
                    transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                    className="mb-4 flex gap-3 rounded-xl border border-border/40 bg-secondary/20 p-3"
                  >
                    <Link
                      href={`/product/${item.slug}`}
                      onClick={() => setCartOpen(false)}
                      className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-background"
                    >
                      <img
                        src={item.image}
                        alt={item.name}
                        className="h-full w-full object-cover"
                      />
                    </Link>
                    <div className="flex flex-1 flex-col">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <Link
                            href={`/product/${item.slug}`}
                            onClick={() => setCartOpen(false)}
                            className="line-clamp-2 text-sm font-medium hover:text-accent"
                          >
                            {item.name}
                          </Link>
                          <p className="text-xs text-muted-foreground">
                            {item.brand}
                          </p>
                        </div>
                        <button
                          onClick={() => removeFromCart(item.productId)}
                          className="rounded-md p-1 text-muted-foreground transition-colors hover:text-destructive"
                          aria-label="Remove item"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="mt-auto flex items-center justify-between pt-2">
                        <div className="flex items-center gap-1 rounded-lg border border-border">
                          <button
                            onClick={() =>
                              updateQuantity(item.productId, item.quantity - 1)
                            }
                            className="flex h-7 w-7 items-center justify-center rounded-l-lg text-muted-foreground transition-colors hover:text-foreground"
                            aria-label="Decrease quantity"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="w-7 text-center text-sm font-medium">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() =>
                              updateQuantity(item.productId, item.quantity + 1)
                            }
                            className="flex h-7 w-7 items-center justify-center rounded-r-lg text-muted-foreground transition-colors hover:text-foreground"
                            aria-label="Increase quantity"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                        <span className="text-sm font-semibold">
                          {formatPrice(item.price * item.quantity)}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              <div className="mt-5 rounded-xl border border-border/40 p-4">
                <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <Tag className="h-3.5 w-3.5" /> Promo Code
                </p>
                <div className="mt-2 flex gap-2">
                  <Input
                    value={promo}
                    onChange={(e) => setPromo(e.target.value)}
                    placeholder="Try WELCOME10"
                    className="h-9 bg-background text-sm"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={applyPromo}
                    className="h-9"
                  >
                    Apply
                  </Button>
                </div>
                {promoError && (
                  <p className="mt-1.5 text-xs text-destructive">{promoError}</p>
                )}
                {appliedDiscount > 0 && (
                  <p className="mt-1.5 text-xs text-accent">
                    {appliedDiscount * 100}% discount applied
                  </p>
                )}
              </div>
            </div>

            <div className="border-t border-border p-5">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span>{formatPrice(cartSubtotal)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-accent">
                    <span>Discount</span>
                    <span>-{formatPrice(discount)}</span>
                  </div>
                )}
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
              <Button
                asChild
                onClick={() => setCartOpen(false)}
                className="group mt-4 w-full gap-2 bg-accent text-base font-semibold text-black hover:bg-accent/90"
              >
                <Link href="/checkout">
                  Checkout
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
              <Button
                asChild
                variant="ghost"
                onClick={() => setCartOpen(false)}
                className="mt-2 w-full"
              >
                <Link href="/shop">Continue Shopping</Link>
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
