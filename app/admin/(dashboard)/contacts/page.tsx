import Link from 'next/link';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { WpSubsubsub } from '@/components/admin/wp-ui';
import { WpScreenMeta } from '@/components/admin/wp-notice';
import { ContactsTable, type ContactRow } from '@/components/admin/contacts-table';

/*
  The contact list.

  Most people here arrived on their own: they sent a message, or gave an address with a ticked
  consent box. Staff can also add someone by hand, which is ordinary CRM work — you met them, they
  rang you.

  What a hand-added row must never become is an address nobody agreed to hand over, so the firewall
  sits one layer down instead of on this screen: createContact cannot reach the subscriber table,
  and the Marketing column reads from the consent record rather than from anything staff typed.
*/

export const dynamic = 'force-dynamic';

type Params = { q?: string; filter?: string };

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'open', label: 'Open enquiries' },
  { key: 'mailable', label: 'May email' },
  { key: 'no-consent', label: 'No consent' },
  { key: 'dormant', label: 'Dormant' },
] as const;

function filterWhere(filter?: string): Prisma.ContactWhereInput {
  switch (filter) {
    case 'open':
      return { enquiries: { some: { status: { in: ['NEW', 'OPEN'] } } } };
    case 'mailable':
      return { subscriber: { status: 'SUBSCRIBED' } };
    case 'no-consent':
      /* Never subscribed at all, or subscribed and then opted out — both mean "do not send". */
      return { OR: [{ subscriber: null }, { subscriber: { status: 'UNSUBSCRIBED' } }] };
    case 'dormant':
      return { stage: 'DORMANT' };
    default:
      return {};
  }
}

export default async function AdminContactsPage({ searchParams }: { searchParams: Params }) {
  await requireAdmin();

  const activeTab = searchParams.filter ?? 'all';
  const q = searchParams.q?.trim();

  const where: Prisma.ContactWhereInput = { ...filterWhere(activeTab) };
  if (q) {
    where.OR = [
      { email: { contains: q, mode: 'insensitive' } },
      { name: { contains: q, mode: 'insensitive' } },
      { tags: { has: q.toLowerCase() } },
    ];
  }

  const [rows, counts] = await Promise.all([
    prisma.contact.findMany({
      where,
      orderBy: { lastActivityAt: 'desc' },
      take: 500,
      include: {
        subscriber: { select: { status: true } },
        enquiries: { select: { status: true } },
      },
    }),
    Promise.all(TABS.map((t) => prisma.contact.count({ where: filterWhere(t.key) }))),
  ]);

  const data: ContactRow[] = rows.map((c) => ({
    id: c.id,
    email: c.email,
    name: c.name,
    stage: c.stage,
    tags: c.tags,
    firstSource: c.firstSource,
    consent: c.subscriber?.status ?? null,
    openEnquiries: c.enquiries.filter((e) => e.status === 'NEW' || e.status === 'OPEN').length,
    totalEnquiries: c.enquiries.length,
    lastActivityAt: c.lastActivityAt.toISOString(),
  }));

  const href = (patch: Partial<Params>) => {
    const next = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...searchParams, ...patch })) {
      if (v && v !== 'all') next.set(k, String(v));
    }
    const qs = next.toString();
    return qs ? `/admin/contacts?${qs}` : '/admin/contacts';
  };

  return (
    <>
      <WpScreenMeta
        help={
          <div>
            <p className="mt-0">
              <strong>Where contacts come from.</strong> Sending a message through the contact
              form, or giving an address to the newsletter, the exit card or the checkout consent
              box. Add New records someone you already deal with; it grants no permission to email
              them.
            </p>
            <p>
              <strong>Stage is your judgement. Marketing is theirs.</strong> Moving someone to
              Qualified says how you rate the relationship. It grants no permission to email
              them: only the Marketing column does that, and only they can change it.
            </p>
            <p className="mb-0">
              <strong>Tags</strong> are free-form and lower-cased, so they group properly.
              Search matches an address, a name, or one whole tag.
            </p>
            <p className="mb-0">
              <strong>Export CSV</strong> exports whichever tab you are on, and carries a
              <code> marketing_consent</code> column with every row. Do not load a contact export
              into a sending platform without filtering on it — most of these people never opted
              in.
            </p>
          </div>
        }
      />

      <h1 className="wp-heading-inline">Contacts</h1>
      <Link href="/admin/contacts/new" className="wp-page-title-action">
        Add New
      </Link>
      {/*
        A plain anchor, not next/link: this is a file download, and a client-side navigation to it
        would try to render the CSV as a route.
      */}
      <a
        href={`/api/admin/contacts.csv${activeTab !== 'all' ? `?filter=${activeTab}` : ''}`}
        className="wp-page-title-action"
      >
        Export CSV
      </a>

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
          Showing {data.length}
          {data.length === 500 && ' (capped)'} — most recently active first.
        </p>

        <form method="get" action="/admin/contacts" className="flex items-center gap-2">
          {activeTab !== 'all' && <input type="hidden" name="filter" value={activeTab} />}
          <label className="wp-screen-reader-text" htmlFor="contact-search">
            Search contacts
          </label>
          <input
            id="contact-search"
            name="q"
            defaultValue={searchParams.q ?? ''}
            placeholder="Name, address or tag"
            className="wp-input wp-input-search"
          />
          <button type="submit" className="wp-button">
            Search
          </button>
          {(q || activeTab !== 'all') && (
            <Link href="/admin/contacts" className="wp-button">
              Clear
            </Link>
          )}
        </form>
      </div>

      <ContactsTable rows={data} />
    </>
  );
}
