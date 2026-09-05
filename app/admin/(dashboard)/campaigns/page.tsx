import Link from 'next/link';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { countAllSegments, getSegment } from '@/lib/campaigns';
import { WpSubsubsub } from '@/components/admin/wp-ui';
import { WpScreenMeta } from '@/components/admin/wp-notice';
import { CampaignsTable, type CampaignRow } from '@/components/admin/campaigns-table';

/*
  Campaigns.

  Everything on this screen is written here and sent somewhere else. There is no send control on
  this page, on the edit screen, or in the actions behind either — this build has no sending
  infrastructure, and a button that looked like one would be believed the first time it was
  pressed. What the system can honestly hold is the draft, the audience count, the legal checks,
  and a person's statement that they sent it from a real platform.
*/

export const dynamic = 'force-dynamic';

type Params = { q?: string; filter?: string };

const TABS = [
  { key: 'draft', label: 'Draft' },
  { key: 'ready', label: 'Ready' },
  { key: 'sent', label: 'Sent' },
  { key: 'cancelled', label: 'Cancelled' },
  { key: 'all', label: 'All' },
] as const;

function filterWhere(filter?: string): Prisma.CampaignWhereInput {
  switch (filter) {
    case 'draft':
      return { status: 'DRAFT' };
    case 'ready':
      return { status: 'READY' };
    case 'sent':
      return { status: 'SENT' };
    case 'cancelled':
      return { status: 'CANCELLED' };
    default:
      return {};
  }
}

export default async function AdminCampaignsPage({ searchParams }: { searchParams: Params }) {
  await requireAdmin();

  const activeTab = searchParams.filter ?? 'all';
  const q = searchParams.q?.trim();

  const where: Prisma.CampaignWhereInput = { ...filterWhere(activeTab) };
  if (q) {
    where.OR = [
      { name: { contains: q, mode: 'insensitive' } },
      { subject: { contains: q, mode: 'insensitive' } },
    ];
  }

  const [rows, counts, segmentCounts] = await Promise.all([
    prisma.campaign.findMany({ where, orderBy: { updatedAt: 'desc' }, take: 300 }),
    Promise.all(TABS.map((t) => prisma.campaign.count({ where: filterWhere(t.key) }))),
    countAllSegments(),
  ]);

  const data: CampaignRow[] = rows.map((c) => {
    const segment = getSegment(c.segment);
    return {
      id: c.id,
      name: c.name,
      subject: c.subject,
      status: c.status,
      segmentLabel: segment.label,
      audienceNow: segmentCounts[segment.key] ?? 0,
      recipientCount: c.recipientCount,
      sentAt: c.sentAt?.toISOString() ?? null,
      sentBy: c.sentBy,
      sentVia: c.sentVia,
      updatedAt: c.updatedAt.toISOString(),
    };
  });

  const href = (patch: Partial<Params>) => {
    const next = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...searchParams, ...patch })) {
      if (v && v !== 'all') next.set(k, String(v));
    }
    const qs = next.toString();
    return qs ? `/admin/campaigns?${qs}` : '/admin/campaigns';
  };

  return (
    <>
      <WpScreenMeta
        help={
          <div>
            <p className="mt-0">
              <strong>Nothing here sends email.</strong> This build has no mail transport at all.
              A campaign is drafted here and its audience counted here; you send it from your own
              mailing platform and then record that you did, naming the platform. A campaign
              marked Sent is your statement, never the system&rsquo;s.
            </p>
            <p>
              <strong>Only consented addresses are ever counted.</strong> Every audience is
              narrowed from the subscribed list, so an unsubscribed address cannot appear in one
              — that condition is built into the query, not applied per screen.
            </p>
            <p className="mb-0">
              <strong>Ready is a legal check as well as an editorial one.</strong> A campaign
              cannot be marked ready without a subject, a body, somebody to send it to, a postal
              address and a from address. The last two are required of every marketing email by
              CAN-SPAM and PECR.
            </p>
          </div>
        }
      />

      <h1 className="wp-heading-inline">Campaigns</h1>
      <Link href="/admin/campaigns/new" className="wp-page-title-action">
        Add New
      </Link>

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
          {data.length === 300 && ' (capped)'} — most recently edited first.
        </p>

        <form method="get" action="/admin/campaigns" className="flex items-center gap-2">
          {activeTab !== 'all' && <input type="hidden" name="filter" value={activeTab} />}
          <label className="wp-screen-reader-text" htmlFor="campaign-search">
            Search campaigns
          </label>
          <input
            id="campaign-search"
            name="q"
            defaultValue={searchParams.q ?? ''}
            placeholder="Search name or subject"
            className="wp-input wp-input-search"
          />
          <button type="submit" className="wp-button">
            Search
          </button>
          {(q || activeTab !== 'all') && (
            <Link href="/admin/campaigns" className="wp-button">
              Clear
            </Link>
          )}
        </form>
      </div>

      <CampaignsTable rows={data} />
    </>
  );
}
