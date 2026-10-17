import type { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import { CheckoutFlow } from '@/components/checkout/checkout-flow';
import { getSettingsSafe } from '@/lib/settings';
import { advertisedDiscount, promotedCode } from '@/lib/discounts';

/*
  Checkout.

  A server page now, where it used to be a client one. The reason is the payment panel: which
  methods appear, and the sentence each one shows at the point of entry, are administered at
  /admin/payments and live in the database. Reading them here means the first response already
  carries the right panels — a client fetch would flash the wrong set of methods, or none, on
  every load.

  The wizard itself stays a client component; it is five steps of local state. Nothing about
  this page is indexable (robots.ts disallows /checkout), so there is no SEO reason for the
  split — only the data.

  Payment is still not connected, and this page does not pretend otherwise. `enabled` controls
  whether a method is LISTED; `connected` is false on every row and no screen in the admin can
  set it. See the note on the PaymentMethod model.
*/

export const metadata: Metadata = {
  title: 'Checkout',
  robots: { index: false, follow: false },
};

/* The methods are configuration, not catalogue: re-read every minute like everything else. */
export const revalidate = 60;

export default async function CheckoutPage() {
  /*
    A checkout that renders no payment methods is a dead end, so a failed read falls back to
    the card panel rather than an empty step. The admin refuses to disable the last method for
    the same reason; this covers the other way of getting there, which is the database being
    briefly unreachable.
  */
  const methods = await prisma.paymentMethod
    .findMany({ where: { enabled: true }, orderBy: { position: 'asc' } })
    .catch(() => []);

  const paymentMethods = methods.length
    ? methods.map((m) => ({ key: m.key, label: m.label, notice: m.notice, walletAddress: m.walletAddress }))
    : [
        {
          key: 'card',
          label: 'Card',
          notice:
            'Card payment is not connected on this build. Nothing is charged and no card details are transmitted or stored.',
          walletAddress: null,
        },
      ];

  /*
    The promotion checkbox appears only for the code named in `hero_promo_code`, and only while
    `advertisedDiscount` says it is live. Ticking it still goes through /api/discount/validate,
    so the server decides the amount exactly as it does for a typed code.
  */
  const settings = await getSettingsSafe();
  const promoCode = promotedCode(settings.hero_promo_code);
  const promo = promoCode ? await advertisedDiscount(promoCode) : null;

  return <CheckoutFlow paymentMethods={paymentMethods} promo={promo} />;
}
