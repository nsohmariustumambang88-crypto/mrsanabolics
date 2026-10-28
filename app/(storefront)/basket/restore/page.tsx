import type { Metadata } from 'next';
import { RestoreBasket } from '@/components/cart/restore-basket';

/*
  Where a basket reminder's "Restore my basket" button lands: /basket/restore?token=…

  It puts the saved items back into the cart on whatever device opened the link, then goes to
  the checkout. Never indexed; robots.ts disallows /basket too.
*/

export const metadata: Metadata = {
  title: 'Your basket',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};

export const dynamic = 'force-dynamic';

export default function RestoreBasketPage({ searchParams }: { searchParams: { token?: string } }) {
  return <RestoreBasket token={typeof searchParams.token === 'string' ? searchParams.token : ''} />;
}
