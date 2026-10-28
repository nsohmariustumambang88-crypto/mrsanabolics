'use client';

import * as React from 'react';
import type { CartItem, ProductSummary } from '@/lib/types';

type StoreState = {
  cart: CartItem[];
  wishlist: string[];
  cartOpen: boolean;
  searchOpen: boolean;
  addToCart: (product: ProductSummary, quantity?: number) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  /** Swap the whole cart, for a basket restored from a reminder link. */
  replaceCart: (items: CartItem[]) => void;
  cartCount: number;
  cartSubtotal: number;
  toggleWishlist: (productId: string) => void;
  isWishlisted: (productId: string) => boolean;
  setCartOpen: (open: boolean) => void;
  setSearchOpen: (open: boolean) => void;
};

const StoreContext = React.createContext<StoreState | null>(null);

const CART_KEY = 'mranabolics-cart';
const WISHLIST_KEY = 'mranabolics-wishlist';
/* The cart last copied to the server this session, so a reload does not send it again. */
const SYNCED_KEY = 'mranabolics-cart-synced';
const SYNC_DELAY_MS = 1500;

/** What the server needs to know about a cart: ids and quantities, in a stable order. */
function cartSignature(cart: CartItem[]): string {
  return JSON.stringify(
    cart
      .map((i) => ({ productId: i.productId, quantity: i.quantity }))
      .sort((a, b) => a.productId.localeCompare(b.productId))
  );
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = React.useState<CartItem[]>([]);
  const [wishlist, setWishlist] = React.useState<string[]>([]);
  const [cartOpen, setCartOpen] = React.useState(false);
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    try {
      const c = localStorage.getItem(CART_KEY);
      if (c) setCart(JSON.parse(c));
      const w = localStorage.getItem(WISHLIST_KEY);
      if (w) setWishlist(JSON.parse(w));
    } catch {}
    setHydrated(true);
  }, []);

  React.useEffect(() => {
    if (hydrated) localStorage.setItem(CART_KEY, JSON.stringify(cart));
  }, [cart, hydrated]);

  React.useEffect(() => {
    if (hydrated) localStorage.setItem(WISHLIST_KEY, JSON.stringify(wishlist));
  }, [wishlist, hydrated]);

  /*
    Copy the cart to the server (lib/basket) a moment after it changes, so a subscriber who
    leaves can be reminded and the basket restored on another device. Ids and quantities only —
    the server prices them. Skipped while unchanged since the last copy this session, and never
    allowed to affect the cart: a failed save is simply not retried until the next change.
  */
  React.useEffect(() => {
    if (!hydrated) return;
    const signature = cartSignature(cart);
    let last: string | null = null;
    try {
      last = sessionStorage.getItem(SYNCED_KEY);
    } catch {}
    /* A first visit with an empty cart has nothing to save or clear. */
    if (signature === last || (last === null && cart.length === 0)) return;

    const timer = window.setTimeout(() => {
      fetch('/api/basket', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ items: JSON.parse(signature) }),
        keepalive: true,
      })
        .then(() => {
          try {
            sessionStorage.setItem(SYNCED_KEY, signature);
          } catch {}
        })
        .catch(() => {});
    }, SYNC_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [cart, hydrated]);

  const addToCart = React.useCallback((product: ProductSummary, quantity = 1) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === product.id);
      if (existing) {
        return prev.map((i) =>
          i.productId === product.id
            ? { ...i, quantity: i.quantity + quantity }
            : i
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          slug: product.slug,
          price: product.price,
          image: product.images[0],
          quantity,
          brand: product.brand,
        },
      ];
    });
    setCartOpen(true);
  }, []);

  const removeFromCart = React.useCallback((productId: string) => {
    setCart((prev) => prev.filter((i) => i.productId !== productId));
  }, []);

  const updateQuantity = React.useCallback(
    (productId: string, quantity: number) => {
      if (quantity < 1) return;
      setCart((prev) =>
        prev.map((i) => (i.productId === productId ? { ...i, quantity } : i))
      );
    },
    []
  );

  const clearCart = React.useCallback(() => setCart([]), []);
  const replaceCart = React.useCallback((items: CartItem[]) => setCart(items), []);

  const toggleWishlist = React.useCallback((productId: string) => {
    setWishlist((prev) =>
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId]
    );
  }, []);

  const isWishlisted = React.useCallback(
    (productId: string) => wishlist.includes(productId),
    [wishlist]
  );

  const cartCount = cart.reduce((sum, i) => sum + i.quantity, 0);
  const cartSubtotal = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);

  const value: StoreState = {
    cart,
    wishlist,
    cartOpen,
    searchOpen,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    replaceCart,
    cartCount,
    cartSubtotal,
    toggleWishlist,
    isWishlisted,
    setCartOpen,
    setSearchOpen,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = React.useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}
