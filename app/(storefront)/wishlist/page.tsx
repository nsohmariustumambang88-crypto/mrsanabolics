import type { Metadata } from 'next';
import { WishlistView } from '@/components/account/wishlist-view';

/*
  The saved products. Open to everybody, signed in or not, because the list lives in the
  browser (components/account/wishlist-view.tsx). It holds nothing for a crawler, and robots.ts
  disallows it like /account.
*/

export const metadata: Metadata = {
  title: 'Saved',
  robots: { index: false, follow: false },
};

export default function WishlistPage() {
  return <WishlistView />;
}
