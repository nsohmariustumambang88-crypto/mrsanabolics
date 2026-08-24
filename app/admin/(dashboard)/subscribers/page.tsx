import Link from 'next/link';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { WpSubsubsub } from '@/components/admin/wp-ui';
import { WpScreenMeta } from '@/components/admin/wp-notice';
import { SubscribersTable, type SubscriberRow } from '@/components/admin/subscribers-table';

/*
  The marketing list.

  This screen exists to make consent auditable. Every row shows where the address came from,
  when it was given and the exact sentence agreed to, because that is what a regulator asks
  for and what a mailbox provider's abuse desk asks for. A list you cannot evidence is one you
  cannot safely send to.

  Note what is not here: any way to add an address by hand. Typing someone into a marketing
  list is precisely the thing that has no consent record, so the interface does not offer it.
*/

export const dynamic = 'force-dynamic';

type Params = { q?: string; filter?: string };

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'subscribed', label: 'Subscribed' },
  { key: 'unsubscribed', label: 'Unsubscribed' },
  { key: 'abandoned', label: 'Abandoned cart' },
] as const;

function filterWhere(filter?: string): Prisma.SubscriberWhereInput {
  switch (filter) {
    case 'subscribed':
      return { status: 'SUBSCRIBED' };
    case 'unsubscribed':
      return { status: 'UNSUBSCRIBED' };
    case 'abandoned':
      return { abandonedValue: { not: null }, status: 'SUBSCRIBED' };
    default:
      return {};
  }
}

export default async function AdminSubscribersPage({
  searchParams,
}: {
  searchParams: Params;
}) {
  await requireAdmin();

  const activeTab = searchParams.filter ?? 'all';
  const q = searchParams.q?.trim();

  const where: Prisma.SubscriberWhereInput = { ...filterWhere(activeTab) };
  if (q) where.email = { contains: q, mode: 'insensitive' };

  const [rows, counts] = await Promise.all([
    prisma.subscriber.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 500,
    }),
    Promise.all(TABS.map((t) => prisma.subscriber.count({ where: filterWhere(t.key) }))),
  ]);

  const data: SubscriberRow[] = rows.map((s) => ({
    id: s.id,
    email: s.email,
    status: s.status,
    source: s.source,
    consentAt: s.consentAt.toISOString(),
    consentText: s.consentText,
    consentPath: s.consentPath,
    pageViews: s.pageViews,
    lastSeenAt: s.lastSeenAt?.toISOString() ?? null,
    lastSeenPath: s.lastSeenPath,
    abandonedValue: s.abandonedValue?.toString() ?? null,
  }));

  const href = (patch: Partial<Params>) => {
    const next = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...searchParams, ...patch })) {
      if (v && v !== 'all') next.set(k, String(v));
    }
    const qs = next.toString();
    return qs ? `/admin/subscribers?${qs}` : '/admin/subscribers';
  };

  return (
    <>
      <WpScreenMeta
        help={
          <div>
            <p className="mt-0">
              <strong>Where these come from.</strong> The newsletter band, the exit-intent card,
              and the consent box at checkout. Nothing is collected without a ticked box — a
              visitor who never gives an address is never recorded.
            </p>
            <p>
              <strong>Abandoned cart</strong> lists people who consented at checkout and left
              without ordering, with the basket value at the moment they gave the address.
            </p>
            <p className="mb-0">
              <strong>Before you send anything,</strong> every email needs a working unsubscribe
              link built from that subscriber&rsquo;s token, and a physical postal address in
              the footer. Both are legal requirements, not conventions.
            </p>
          </div>
        }
      />

      <h1 className="wp-heading-inline">Subscribers</h1>
      <a
        href={`/api/admin/subscribers.csv${activeTab !== 'all' ? `?filter=${activeTab}` : ''}`}
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
          {data.length === 500 && ' (capped)'} — newest first.
        </p>

        <form method="get" action="/admin/subscribers" className="flex items-center gap-2">
          {activeTab !== 'all' && <input type="hidden" name="filter" value={activeTab} />}
          <label className="wp-screen-reader-text" htmlFor="subscriber-search">
            Search subscribers
          </label>
          <input
            id="subscriber-search"
            name="q"
            defaultValue={searchParams.q ?? ''}
            placeholder="Search by address"
            className="wp-input wp-input-search"
          />
          <button type="submit" className="wp-button">
            Search
          </button>
          {(q || activeTab !== 'all') && (
            <Link href="/admin/subscribers" className="wp-button">
              Clear
            </Link>
          )}
        </form>
      </div>

      <SubscribersTable rows={data} />
    </>
  );
}
