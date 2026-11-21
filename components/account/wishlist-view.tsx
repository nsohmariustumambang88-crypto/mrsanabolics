'use client';

import Link from 'next/link';
import { Heart, X } from 'lucide-react';
import { useStore } from '@/components/providers/store-provider';
import { ProductGrid } from '@/components/product/product-grid';
import { useCatalogueSearch } from '@/components/shop/use-catalogue-search';

/*
  The saved products (the hearts), at /wishlist.

  It needs no account: the list lives in this browser's storage, so a visitor who has never
  signed in has one too. It used to be a tab of /account, which sent anyone signed out who
  pressed Wishlist in the phone tab bar to a sign-in form instead of their saved products.

  The products are fetched by id, a handful rather than the catalogue. Until the browser's list
  has been read and the products have arrived, the page shows empty tiles rather than "Nothing
  saved yet", which would be wrong for a moment for everybody who has saved something.
*/

export function WishlistView() {
  const { hydrated, wishlist, toggleWishlist } = useStore();
  const { items: saved, loading } = useCatalogueSearch({ ids: wishlist }, 24, wishlist.length > 0);
  const waiting = !hydrated || (wishlist.length > 0 && loading && saved.length === 0);

  return (
    <div className="mx-auto max-w-[86rem] px-4 pb-16 pt-8 sm:px-6 sm:pt-14 lg:px-10">
      <h1 className="font-display text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">Saved</h1>

      {waiting ? (
        <div className="mt-6 grid grid-cols-2 gap-x-3 gap-y-7 md:gap-x-5 lg:grid-cols-3 xl:grid-cols-4" aria-busy="true">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="aspect-[5/4] rounded-lg bg-paper-sunk" />
          ))}
        </div>
      ) : saved.length === 0 ? (
        <div className="mt-6 rounded-lg bg-paper-sunk px-6 py-14 text-center">
          <Heart className="mx-auto size-7 text-ink-faint" strokeWidth={1.5} aria-hidden="true" />
          <p className="mt-4 font-display text-lg font-semibold tracking-[-0.025em]">Nothing saved yet</p>
          <p className="measure-tight mx-auto mt-2 text-sm leading-relaxed text-ink-soft">
            Tap the heart on any product to keep it here while you compare.
          </p>
          <Link
            href="/shop"
            className="mt-6 inline-flex h-11 items-center rounded-lg bg-ink px-6 text-sm font-bold text-paper transition-colors hover:bg-ink-soft"
          >
            Browse the shop
          </Link>
        </div>
      ) : (
        <>
          <p className="mt-1.5 text-sm text-ink-soft tabular">{saved.length} saved</p>
          <ProductGrid products={saved} className="mt-6" />
          <button
            type="button"
            onClick={() => saved.forEach((p) => toggleWishlist(p.id))}
            className="mt-8 inline-flex items-center gap-1.5 text-sm text-ink-faint underline underline-offset-4 transition-colors hover:text-pigment-madder"
          >
            <X className="size-3.5" strokeWidth={1.75} />
            Clear all saved
          </button>
        </>
      )}

      <p className="mt-6 text-xs leading-relaxed text-ink-faint">
        Saved items are kept in this browser, so they will not follow you to another device.
      </p>
    </div>
  );
}
