import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { marketingConsent } from '@/lib/crm/contacts';
import { formatPrice } from '@/lib/format';
import { WpPostbox, WpStaticNotice } from '@/components/admin/wp-ui';
import {
  DeleteContact,
  DetailsForm,
  NoteForm,
  StagePicker,
  TagEditor,
} from '@/components/admin/contact-panel';
import { EnquiryStatusPicker } from '@/components/admin/enquiry-status';

/*
  One person, everything known about them.

  The consent panel is first and unmissable, because it is the only thing on this screen that
  can cost anything if misread. Everything else — stage, tags, notes — is our opinion of the
  relationship; that panel is the person's own decision, and it overrides all of it.

  The timeline is append-only (see ContactActivity). It is rendered here rather than summarised
  because "what happened, in order" is the question a CRM exists to answer.
*/

export const dynamic = 'force-dynamic';

const ACTIVITY_LABEL: Record<string, string> = {
  CONTACT_CREATED: 'Created',
  ENQUIRY_RECEIVED: 'Enquiry',
  ENQUIRY_STATUS_CHANGED: 'Enquiry',
  ORDER_PLACED: 'Order',
  ORDER_STATUS_CHANGED: 'Order',
  SUBSCRIBED: 'Consent',
  UNSUBSCRIBED: 'Consent',
  NOTE_ADDED: 'Note',
  STAGE_CHANGED: 'Stage',
  TAGS_CHANGED: 'Tags',
  DETAILS_UPDATED: 'Details',
};

const ORDER_STATUS_LABEL: Record<string, string> = {
  NEW: 'New',
  CONFIRMED: 'Confirmed',
  PACKED: 'Packed',
  SHIPPED: 'Shipped',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
};

function stamp(date: Date): string {
  return `${date.toISOString().slice(0, 10)} ${date.toISOString().slice(11, 16)}`;
}

export default async function AdminContactPage({ params }: { params: { id: string } }) {
  await requireAdmin();

  const contact = await prisma.contact.findUnique({
    where: { id: params.id },
    include: {
      subscriber: true,
      enquiries: { orderBy: { createdAt: 'desc' } },
      orders: {
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { items: true } } },
      },
      notes: { orderBy: { createdAt: 'desc' } },
      activities: { orderBy: { occurredAt: 'desc' }, take: 200 },
    },
  });

  if (!contact) notFound();

  const consent = marketingConsent(contact.subscriber);

  return (
    <>
      <h1 className="wp-heading-inline">{contact.name ?? contact.email}</h1>
      <Link href="/admin/contacts" className="wp-page-title-action">
        Back to contacts
      </Link>

      <hr className="my-2 border-0 border-t border-[#c3c4c7]" />

      <p className="wp-subtitle m-0">
        <a href={`mailto:${contact.email}`}>{contact.email}</a> · first seen via{' '}
        {contact.firstSource} · added {stamp(contact.createdAt)}
      </p>

      {/*
        The one thing on this page that is not staff opinion. Stated in a sentence rather than a
        badge, because "SUBSCRIBED" next to a stage of "Qualified" invites reading the two as the
        same kind of fact.
      */}
      <div className="mt-3">
        {consent.emailable ? (
          <WpStaticNotice tone="success">
            <strong>{consent.label}.</strong> Consent was given on{' '}
            {contact.subscriber ? stamp(contact.subscriber.consentAt) : '—'} via{' '}
            {contact.subscriber?.source}. Every email still needs their unsubscribe link and a
            postal address in the footer.
          </WpStaticNotice>
        ) : (
          <WpStaticNotice tone="warning">
            <strong>{consent.label}.</strong> Do not send marketing email to this address. You may
            still reply to a message they sent you — that is correspondence, not marketing.
          </WpStaticNotice>
        )}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        <div className="grid gap-4">
          <WpPostbox title="Activity">
            {contact.activities.length === 0 ? (
              <p className="wp-muted m-0">Nothing recorded yet.</p>
            ) : (
              <ul className="wp-activity-list">
                {contact.activities.map((a) => (
                  <li key={a.id}>
                    <div className="flex flex-wrap items-baseline gap-2">
                      <span className="text-[11px] font-semibold uppercase" style={{ color: 'var(--wp-blue)' }}>
                        {ACTIVITY_LABEL[a.type] ?? a.type}
                      </span>
                      <span>{a.summary}</span>
                      <span className="wp-muted wp-num ml-auto text-[12px]">
                        {stamp(a.occurredAt)}
                      </span>
                    </div>
                    {a.detail && (
                      <p className="wp-muted m-0 mt-1 whitespace-pre-wrap text-[12px] leading-snug">
                        {a.detail}
                      </p>
                    )}
                    {a.actorEmail && (
                      <p className="wp-muted m-0 mt-0.5 text-[11px]">by {a.actorEmail}</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </WpPostbox>

          <WpPostbox title={`Orders (${contact.orders.length})`}>
            {contact.orders.length === 0 ? (
              <p className="wp-muted m-0">No orders recorded for this contact.</p>
            ) : (
              <ul className="wp-activity-list">
                {contact.orders.map((o) => (
                  <li key={o.id}>
                    <div className="flex flex-wrap items-baseline gap-2">
                      <strong>
                        <Link href={`/admin/orders/${o.id}`}>{o.reference}</Link>
                      </strong>
                      <span className="wp-muted text-[12px]">
                        {o._count.items} line{o._count.items === 1 ? '' : 's'} ·{' '}
                        {ORDER_STATUS_LABEL[o.status]}
                      </span>
                      <span className="wp-num ml-auto text-[12px]">
                        {formatPrice(Number(o.total))}
                      </span>
                    </div>
                    <p className="wp-muted m-0 mt-0.5 text-[11px]">placed {stamp(o.createdAt)}</p>
                  </li>
                ))}
              </ul>
            )}
          </WpPostbox>

          <WpPostbox title={`Enquiries (${contact.enquiries.length})`}>
            {contact.enquiries.length === 0 ? (
              <p className="wp-muted m-0">This contact has not written in.</p>
            ) : (
              <ul className="wp-activity-list">
                {contact.enquiries.map((e) => (
                  <li key={e.id}>
                    <div className="flex flex-wrap items-center gap-2">
                      <strong>{e.subject}</strong>
                      <span className="wp-muted wp-num text-[12px]">{stamp(e.createdAt)}</span>
                      <span className="ml-auto">
                        <EnquiryStatusPicker enquiryId={e.id} status={e.status} />
                      </span>
                    </div>
                    <p className="m-0 mt-1.5 whitespace-pre-wrap text-[13px] leading-relaxed">
                      {e.message}
                    </p>
                    {e.handledAt && (
                      <p className="wp-muted m-0 mt-1 text-[11px]">
                        Handled {stamp(e.handledAt)} by {e.handledBy}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </WpPostbox>

          <WpPostbox title="Notes">
            <NoteForm contactId={contact.id} />

            {contact.notes.length > 0 && (
              <ul className="wp-activity-list mt-4">
                {contact.notes.map((n) => (
                  <li key={n.id}>
                    <p className="m-0 whitespace-pre-wrap text-[13px] leading-relaxed">{n.body}</p>
                    <p className="wp-muted m-0 mt-1 text-[11px]">
                      {n.authorEmail} · {stamp(n.createdAt)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </WpPostbox>
        </div>

        <div className="grid gap-4">
          <WpPostbox title="Classification">
            <StagePicker contactId={contact.id} stage={contact.stage} />
            <div className="mt-4">
              <TagEditor contactId={contact.id} tags={contact.tags} />
            </div>
          </WpPostbox>

          <WpPostbox title="Details">
            <DetailsForm contactId={contact.id} name={contact.name} phone={contact.phone} />
            <p className="wp-muted mt-3 text-[12px]">
              The address cannot be edited here. It identifies the row and is what any
              unsubscribe was issued against, so retyping it would detach this person from their
              own opt-out.
            </p>
          </WpPostbox>

          {contact.subscriber && (
            <WpPostbox title="Consent record">
              <p className="m-0 text-[12px]">
                <strong>Source:</strong> {contact.subscriber.source}
              </p>
              <p className="m-0 mt-1 text-[12px]">
                <strong>Given:</strong> {stamp(contact.subscriber.consentAt)}
                {contact.subscriber.consentPath ? ` on ${contact.subscriber.consentPath}` : ''}
              </p>
              {contact.subscriber.unsubscribedAt && (
                <p className="m-0 mt-1 text-[12px]">
                  <strong>Opted out:</strong> {stamp(contact.subscriber.unsubscribedAt)}
                </p>
              )}
              {/* The wording itself, not a summary of it — a tick proves nothing in a dispute. */}
              <p className="wp-muted m-0 mt-2 text-[12px] leading-snug">
                &ldquo;{contact.subscriber.consentText}&rdquo;
              </p>
              <p className="mt-3 m-0 text-[12px]">
                <Link href="/admin/subscribers">Manage on the subscriber list</Link>
              </p>
            </WpPostbox>
          )}

          <WpPostbox title="Delete">
            <DeleteContact
              contactId={contact.id}
              label={contact.name ?? contact.email}
              subscribed={contact.subscriber?.status === 'SUBSCRIBED'}
            />
          </WpPostbox>
        </div>
      </div>
    </>
  );
}
