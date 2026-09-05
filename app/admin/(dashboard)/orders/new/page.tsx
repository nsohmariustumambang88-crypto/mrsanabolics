import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { WpScreenMeta } from '@/components/admin/wp-notice';
import { WpStaticNotice } from '@/components/admin/wp-ui';
import {
  OrderCreateForm,
  type ContactOption,
  type ProductOption,
} from '@/components/admin/order-create-form';

/*
  Record an order taken off-system.

  Contacts and products are loaded here on the server and handed to the form rather than fetched
  from the client, so the form has everything it needs in the first response.

  The catalogue is ~790 products now, not the twelve this screen was written for, so the form
  filters what it RENDERS rather than what it receives: a search box and a cap, with any product
  that has a quantity on it always listed. Sending the whole list is still the right call at this
  size — it is id, name and price — but putting all of it in the DOM was not.
*/

export const dynamic = 'force-dynamic';

export default async function AdminNewOrderPage() {
  await requireAdmin();

  const [contacts, products] = await Promise.all([
    prisma.contact.findMany({
      orderBy: { lastActivityAt: 'desc' },
      take: 500,
      select: { id: true, name: true, email: true },
    }),
    prisma.product.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true, price: true, inStock: true },
    }),
  ]);

  const contactOptions: ContactOption[] = contacts.map((c) => ({
    id: c.id,
    label: c.name ? `${c.name} — ${c.email}` : c.email,
  }));

  const productOptions: ProductOption[] = products.map((p) => ({
    id: p.id,
    name: p.name,
    price: Number(p.price),
    inStock: p.inStock,
  }));

  return (
    <>
      <WpScreenMeta
        help={
          <div>
            <p className="mt-0">
              <strong>For an order placed another way</strong> — by phone, by email, in person. The
              storefront checkout does not create orders, because this build takes no payment.
            </p>
            <p className="mb-0">
              <strong>Prices are taken from the catalogue at the moment you record it</strong> and
              copied onto the order. Repricing a product later does not change what this order says
              it cost.
            </p>
          </div>
        }
      />

      <h1 className="wp-heading-inline">Record Order</h1>
      <Link href="/admin/orders" className="wp-page-title-action">
        Back to orders
      </Link>

      <hr className="my-2 border-0 border-t border-[#c3c4c7]" />

      {contactOptions.length === 0 ? (
        <WpStaticNotice tone="warning">
          <strong>There are no contacts yet.</strong> An order has to belong to somebody — add a
          contact first, then come back.
        </WpStaticNotice>
      ) : (
        <OrderCreateForm contacts={contactOptions} products={productOptions} />
      )}
    </>
  );
}
