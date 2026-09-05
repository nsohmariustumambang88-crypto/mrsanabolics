import Link from 'next/link';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { WpPostbox, WpSubsubsub } from '@/components/admin/wp-ui';
import { WpScreenMeta } from '@/components/admin/wp-notice';
import { MessagesTable, type MessageRow } from '@/components/admin/messages-table';
import {
  MessageCreateForm,
  type MessageContactOption,
} from '@/components/admin/message-create-form';

/*
  Messages.

  A log of one-to-one correspondence, all of it recorded after the fact. This build has no mail
  transport, so nothing on this screen sends anything: a person replies from their own client or
  rings, and then writes down what they said. That is not a limitation being worked around — a
  compose box that silently delivered nothing would be the worst control in the admin.

  Recording a message also appends a line to that contact's timeline, so the whole relationship
  reads on one screen rather than being reassembled from two.
*/

export const dynamic = 'force-dynamic';

type Params = { q?: string; filter?: string };

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'other', label: 'Other' },
] as const;

function filterWhere(filter?: string): Prisma.OutboundMessageWhereInput {
  switch (filter) {
    case 'email':
      return { channel: 'EMAIL' };
    case 'phone':
      return { channel: 'PHONE' };
    case 'other':
      return { channel: 'OTHER' };
    default:
      return {};
  }
}

export default async function AdminMessagesPage({ searchParams }: { searchParams: Params }) {
  await requireAdmin();

  const activeTab = searchParams.filter ?? 'all';
  const q = searchParams.q?.trim();

  const where: Prisma.OutboundMessageWhereInput = { ...filterWhere(activeTab) };
  if (q) {
    where.OR = [
      { subject: { contains: q, mode: 'insensitive' } },
      { contact: { email: { contains: q, mode: 'insensitive' } } },
      { contact: { name: { contains: q, mode: 'insensitive' } } },
    ];
  }

  const [rows, counts, contacts] = await Promise.all([
    prisma.outboundMessage.findMany({
      where,
      orderBy: { sentAt: 'desc' },
      take: 300,
      include: { contact: { select: { id: true, name: true, email: true } } },
    }),
    Promise.all(TABS.map((t) => prisma.outboundMessage.count({ where: filterWhere(t.key) }))),
    prisma.contact.findMany({
      orderBy: { lastActivityAt: 'desc' },
      take: 1000,
      select: { id: true, name: true, email: true },
    }),
  ]);

  const data: MessageRow[] = rows.map((m) => ({
    id: m.id,
    contactId: m.contact.id,
    contactName: m.contact.name ?? m.contact.email,
    contactEmail: m.contact.email,
    channel: m.channel,
    subject: m.subject,
    body: m.body,
    sentAt: m.sentAt.toISOString(),
    recordedBy: m.recordedBy,
  }));

  const contactOptions: MessageContactOption[] = contacts.map((c) => ({
    id: c.id,
    name: c.name,
    email: c.email,
  }));

  const href = (patch: Partial<Params>) => {
    const next = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...searchParams, ...patch })) {
      if (v && v !== 'all') next.set(k, String(v));
    }
    const qs = next.toString();
    return qs ? `/admin/messages?${qs}` : '/admin/messages';
  };

  return (
    <>
      <WpScreenMeta
        help={
          <div>
            <p className="mt-0">
              <strong>Nothing is sent from this screen.</strong> This build has no mail transport.
              You reply from your own mail client, or ring, and then record what you said here.
            </p>
            <p>
              <strong>Recording a message writes to the contact&rsquo;s timeline too,</strong> so
              enquiries, orders, consent and correspondence all read in one place.
            </p>
            <p className="mb-0">
              <strong>This is correspondence, not marketing.</strong> Answering somebody who wrote
              to you needs no opt-in — and it grants none either. Anything sent to a list belongs
              under Campaigns, where the consent checks live.
            </p>
          </div>
        }
      />

      <h1 className="wp-heading-inline">Messages</h1>

      <hr className="my-2 border-0 border-t border-[#c3c4c7]" />

      <div className="mb-4">
        <WpPostbox title="Record a message">
          <MessageCreateForm contacts={contactOptions} />
        </WpPostbox>
      </div>

      <WpSubsubsub
        items={TABS.map((t, i) => ({
          href: href({ filter: t.key }),
          label: t.label,
          count: counts[i],
          current: activeTab === t.key,
        }))}
      />

      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <p className="wp-subtitle m-0">
          Showing {data.length}
          {data.length === 300 && ' (capped)'} — most recent first.
        </p>

        <form method="get" action="/admin/messages" className="flex items-center gap-2">
          {activeTab !== 'all' && <input type="hidden" name="filter" value={activeTab} />}
          <label className="wp-screen-reader-text" htmlFor="message-search">
            Search messages
          </label>
          <input
            id="message-search"
            name="q"
            defaultValue={searchParams.q ?? ''}
            placeholder="Search contact or subject"
            className="wp-input wp-input-search"
          />
          <button type="submit" className="wp-button">
            Search
          </button>
          {(q || activeTab !== 'all') && (
            <Link href="/admin/messages" className="wp-button">
              Clear
            </Link>
          )}
        </form>
      </div>

      <MessagesTable rows={data} />
    </>
  );
}
