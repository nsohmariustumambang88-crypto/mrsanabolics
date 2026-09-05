import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { formatPrice } from '@/lib/format';
import { WpPostbox, WpStaticNotice } from '@/components/admin/wp-ui';
import {
  DeleteOrder,
  OrderNoteForm,
  OrderStatusPicker,
} from '@/components/admin/order-panel';

/*
  One order.

  The line prices shown are the ones stored on the line, not today's catalogue price. That is the
  whole point of snapshotting them: this screen has to keep saying what was actually agreed, even
  after the product is repriced or deleted.
*/

export const dynamic = 'force-dynamic';

function stamp(date: Date): string {
  return `${date.toISOString().slice(0, 10)} ${date.toISOString().slice(11, 16)}`;
}

export default async function AdminOrderPage({ params }: { params: { id: string } }) {
  await requireAdmin();

  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: {
      contact: { select: { id: true, name: true, email: true, phone: true } },
      items: { orderBy: { createdAt: 'asc' } },
      events: { orderBy: { occurredAt: 'desc' }, take: 200 },
    },
  });

  if (!order) notFound();

  return (
    <>
      <h1 className="wp-heading-inline">{order.reference}</h1>
      <Link href="/admin/orders" className="wp-page-title-action">
        Back to orders
      </Link>

      <hr className="my-2 border-0 border-t border-[#c3c4c7]" />

      <p className="wp-subtitle m-0">
        Placed {stamp(order.createdAt)} by{' '}
        <Link href={`/admin/contacts/${order.contact.id}`}>
          {order.contact.name ?? order.contact.email}
        </Link>
      </p>

      {/*
        Stated once, plainly, on the screen where somebody might otherwise assume the opposite.
        An order management screen that says nothing about money reads as "presumably paid".
      */}
      <div className="mt-3">
        <WpStaticNotice tone="info">
          <strong>No payment is recorded against this order.</strong> This build collects none, and
          the order model has no payment field, so nothing here should be read as settled.
        </WpStaticNotice>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        <div className="grid gap-4">
          <WpPostbox title={`Items (${order.items.length})`}>
            <div className="overflow-x-auto">
              <table className="wp-list-table min-w-[34rem]">
                <thead>
                  <tr>
                    <th scope="col">Product</th>
                    <th scope="col">Unit</th>
                    <th scope="col">Qty</th>
                    <th scope="col">Line</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <strong>{item.name}</strong>
                        {/* The link is to the live product; the words above are the snapshot. */}
                        <div className="wp-muted text-[11px]">
                          {item.productId ? (
                            <Link href={`/product/${item.slug}`}>{item.slug}</Link>
                          ) : (
                            <>{item.slug} — product since deleted</>
                          )}
                        </div>
                      </td>
                      <td className="wp-num">{formatPrice(Number(item.unitPrice))}</td>
                      <td className="wp-num">{item.quantity}</td>
                      <td className="wp-num">{formatPrice(Number(item.lineTotal))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <dl className="mt-4 ml-auto max-w-[16rem] text-[13px]">
              <div className="flex justify-between py-1">
                <dt>Subtotal</dt>
                <dd className="wp-num">{formatPrice(Number(order.subtotal))}</dd>
              </div>
              <div className="flex justify-between py-1">
                <dt>Shipping</dt>
                <dd className="wp-num">{formatPrice(Number(order.shipping))}</dd>
              </div>
              <div className="flex justify-between border-t border-[#c3c4c7] py-1 font-semibold">
                <dt>Total</dt>
                <dd className="wp-num">{formatPrice(Number(order.total))}</dd>
              </div>
            </dl>
          </WpPostbox>

          <WpPostbox title="History">
            {order.events.length === 0 ? (
              <p className="wp-muted m-0">Nothing recorded yet.</p>
            ) : (
              <ul className="wp-activity-list">
                {order.events.map((event) => (
                  <li key={event.id}>
                    <div className="flex flex-wrap items-baseline gap-2">
                      <span>{event.summary}</span>
                      <span className="wp-muted wp-num ml-auto text-[12px]">
                        {stamp(event.occurredAt)}
                      </span>
                    </div>
                    {event.detail && (
                      <p className="wp-muted m-0 mt-1 whitespace-pre-wrap text-[12px] leading-snug">
                        {event.detail}
                      </p>
                    )}
                    {event.actorEmail && (
                      <p className="wp-muted m-0 mt-0.5 text-[11px]">by {event.actorEmail}</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </WpPostbox>

          <WpPostbox title="Add a note">
            <OrderNoteForm orderId={order.id} />
          </WpPostbox>
        </div>

        <div className="grid gap-4">
          <WpPostbox title="Fulfilment">
            <OrderStatusPicker orderId={order.id} status={order.status} />

            <dl className="mt-4 text-[12px]">
              <div className="flex justify-between py-0.5">
                <dt className="wp-muted">Confirmed</dt>
                <dd className="wp-num">{order.confirmedAt ? stamp(order.confirmedAt) : '—'}</dd>
              </div>
              <div className="flex justify-between py-0.5">
                <dt className="wp-muted">Shipped</dt>
                <dd className="wp-num">{order.shippedAt ? stamp(order.shippedAt) : '—'}</dd>
              </div>
              {order.cancelledAt && (
                <div className="flex justify-between py-0.5">
                  <dt className="wp-muted">Cancelled</dt>
                  <dd className="wp-num">{stamp(order.cancelledAt)}</dd>
                </div>
              )}
            </dl>
          </WpPostbox>

          <WpPostbox title="Deliver to">
            <address className="not-italic text-[13px] leading-relaxed">
              {order.shipName}
              <br />
              {order.shipLine1}
              {order.shipLine2 && (
                <>
                  <br />
                  {order.shipLine2}
                </>
              )}
              <br />
              {order.shipCity}
              <br />
              {order.shipPostcode}
              <br />
              {order.shipCountry}
            </address>

            <p className="wp-muted mt-3 text-[12px]">
              Captured when the order was placed. Editing the contact&rsquo;s details does not
              change it — where a past parcel went is a fact about that parcel.
            </p>
          </WpPostbox>

          <WpPostbox title="Customer">
            <p className="m-0 text-[13px]">
              <Link href={`/admin/contacts/${order.contact.id}`}>
                {order.contact.name ?? order.contact.email}
              </Link>
            </p>
            <p className="m-0 mt-1 text-[12px]">
              <a href={`mailto:${order.contact.email}`}>{order.contact.email}</a>
            </p>
            {order.contact.phone && (
              <p className="wp-muted m-0 mt-1 text-[12px]">{order.contact.phone}</p>
            )}
          </WpPostbox>

          {order.notes && (
            <WpPostbox title="Order notes">
              <p className="m-0 whitespace-pre-wrap text-[13px] leading-relaxed">{order.notes}</p>
            </WpPostbox>
          )}

          <WpPostbox title="Delete">
            <DeleteOrder orderId={order.id} reference={order.reference} />
          </WpPostbox>
        </div>
      </div>
    </>
  );
}
