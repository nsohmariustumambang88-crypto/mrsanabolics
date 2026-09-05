import Link from 'next/link';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { WpSubsubsub } from '@/components/admin/wp-ui';
import { WpScreenMeta } from '@/components/admin/wp-notice';
import { EnquiriesTable, type EnquiryRow } from '@/components/admin/enquiries-table';

/*
  The message queue.

  Messages are shown in full rather than truncated to a preview. A support queue where you must
  open each row to learn whether it takes ten seconds or ten minutes is a queue people work in
  the wrong order.

  Replying happens in a real mail client — the mailto link carries the subject and their name —
  because this build sends no email. Pretending otherwise with a "Reply" box that goes nowhere
  would be the one interaction here capable of losing somebody's answer.
*/

export const dynamic = 'force-dynamic';

type Params = { q?: string; filter?: string };

const TABS = [
  { key: 'open', label: 'Needs attention' },
  { key: 'all', label: 'All' },
  { key: 'new', label: 'New' },
  { key: 'answered', label: 'Answered' },
  { key: 'closed', label: 'Closed' },
] as const;

function filterWhere(filter?: string): Prisma.EnquiryWhereInput {
  switch (filter) {
    case 'open':
      return { status: { in: ['NEW', 'OPEN'] } };
    case 'new':
      return { status: 'NEW' };
    case 'answered':
      return { status: 'ANSWERED' };
    case 'closed':
      return { status: 'CLOSED' };
    default:
      return {};
  }
}

export default async function AdminEnquiriesPage({ searchParams }: { searchParams: Params }) {
  await requireAdmin();

  /* Defaults to the work, not to the archive. */
  const activeTab = searchParams.filter ?? 'open';
  const q = searchParams.q?.trim();

  const where: Prisma.EnquiryWhereInput = { ...filterWhere(activeTab) };
  if (q) {
    where.OR = [
      { email: { contains: q, mode: 'insensitive' } },
      { name: { contains: q, mode: 'insensitive' } },
      { message: { contains: q, mode: 'insensitive' } },
      { subject: { contains: q, mode: 'insensitive' } },
    ];
  }

  const [rows, counts] = await Promise.all([
    prisma.enquiry.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: { contact: { select: { id: true } } },
    }),
    Promise.all(TABS.map((t) => prisma.enquiry.count({ where: filterWhere(t.key) }))),
  ]);

  const data: EnquiryRow[] = rows.map((e) => ({
    id: e.id,
    name: e.name,
    email: e.email,
    subject: e.subject,
    message: e.message,
    status: e.status,
    path: e.path,
    createdAt: e.createdAt.toISOString(),
    handledAt: e.handledAt?.toISOString() ?? null,
    handledBy: e.handledBy,
    contactId: e.contact.id,
  }));

  const href = (patch: Partial<Params>) => {
    const next = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...searchParams, ...patch })) {
      if (v) next.set(k, String(v));
    }
    const qs = next.toString();
    return qs ? `/admin/enquiries?${qs}` : '/admin/enquiries';
  };

  return (
    <>
      <WpScreenMeta
        help={
          <div>
            <p className="mt-0">
              <strong>These are messages from the public contact form.</strong> Each one also
              creates or updates a contact, so the conversation lives on that person&rsquo;s
              record as well as here.
            </p>
            <p>
              <strong>Writing in is not consent to marketing.</strong> Answering a message is
              correspondence and needs no opt-in, but nobody here may be added to the mailing
              list because they got in touch.
            </p>
            <p className="mb-0">
              <strong>Answered</strong> stamps who dealt with it and when. Reopening does not
              clear that stamp — how long someone waited for a reply is a fact.
            </p>
          </div>
        }
      />

      <h1 className="wp-heading-inline">Enquiries</h1>

      <hr className="my-2 border-0 border-t border-[#c3c4c7]" />

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
          Showing {rows.length}
          {rows.length === 200 && ' (capped)'} — newest first.
        </p>

        <form method="get" action="/admin/enquiries" className="flex items-center gap-2">
          <input type="hidden" name="filter" value={activeTab} />
          <label className="wp-screen-reader-text" htmlFor="enquiry-search">
            Search enquiries
          </label>
          <input
            id="enquiry-search"
            name="q"
            defaultValue={searchParams.q ?? ''}
            placeholder="Name, address or words"
            className="wp-input wp-input-search"
          />
          <button type="submit" className="wp-button">
            Search
          </button>
          {q && (
            <Link href={href({ q: undefined })} className="wp-button">
              Clear
            </Link>
          )}
        </form>
      </div>

      <EnquiriesTable
        rows={data}
        emptyHint={
          activeTab === 'open'
            ? 'No enquiry is waiting on an answer.'
            : 'Messages sent through the contact form arrive here.'
        }
      />
    </>
  );
}
