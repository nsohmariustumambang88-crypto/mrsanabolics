import Link from 'next/link';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { asBoolean, asNumber, getSettingsSafe } from '@/lib/settings';
import { maskEmail, shortToken } from '@/lib/analytics/mask';
import { WpPostbox, WpStaticNotice, WpSubsubsub } from '@/components/admin/wp-ui';
import { WpScreenMeta } from '@/components/admin/wp-notice';
import { AnalyticsTable, type VisitorRow } from '@/components/admin/analytics-table';
import { AnalyticsPurge } from '@/components/admin/analytics-purge';

/*
  Audience.

  This screen is deliberately smaller than what an analytics product would show you, because
  the data behind it is deliberately smaller. There is no IP address, no device fingerprint, no
  session replay and no cross-site identifier. A visitor is a random token in a first-party
  cookie, and everything on this page is derived from that token, the paths it asked for, and a
  country the CDN worked out before the request reached us.

  The Help panel states that in full rather than leaving it implied. Whoever inherits this screen
  should be able to answer "what do you collect" from the interface, not from the schema — and
  should be able to see that the honest answer is short.
*/

export const dynamic = 'force-dynamic';

type Params = { q?: string; filter?: string };

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'identified', label: 'Identified' },
  { key: 'returning', label: 'Returning' },
  { key: 'today', label: 'Today' },
] as const;

function startOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}

function filterWhere(filter?: string): Prisma.VisitorWhereInput {
  switch (filter) {
    case 'identified':
      return { contactId: { not: null } };
    case 'returning':
      return { viewCount: { gt: 1 } };
    case 'today':
      return { lastSeenAt: { gte: startOfToday() } };
    default:
      return {};
  }
}

function Tile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div>
      <div className="wp-num text-[22px] font-semibold leading-none">{value}</div>
      <div className="mt-1 text-[12px] font-semibold uppercase tracking-wide">{label}</div>
      {hint && <div className="wp-muted text-[11px]">{hint}</div>}
    </div>
  );
}

function TopList({
  rows,
  empty,
}: {
  rows: { label: string; count: number }[];
  empty: string;
}) {
  if (rows.length === 0) return <p className="wp-muted m-0 text-[12px]">{empty}</p>;

  return (
    <ul className="wp-activity-list">
      {rows.map((row) => (
        <li key={row.label} className="flex items-baseline justify-between gap-3">
          <span className="truncate">{row.label}</span>
          <span className="wp-num">{row.count}</span>
        </li>
      ))}
    </ul>
  );
}

export default async function AdminAnalyticsPage({ searchParams }: { searchParams: Params }) {
  await requireAdmin();

  const activeTab = searchParams.filter ?? 'all';
  const q = searchParams.q?.trim();

  const where: Prisma.VisitorWhereInput = { ...filterWhere(activeTab) };
  if (q) {
    /* Three things somebody would plausibly paste in: a token prefix from another screen, a
       path they are chasing, or the address of a person they already know about. */
    where.OR = [
      { token: { startsWith: q.toLowerCase() } },
      { lastPath: { contains: q, mode: 'insensitive' } },
      { source: { contains: q, mode: 'insensitive' } },
      { contact: { email: { contains: q, mode: 'insensitive' } } },
    ];
  }

  const today = startOfToday();

  const [
    settings,
    visitors,
    counts,
    seenToday,
    seen7,
    seen30,
    totalViews,
    topPaths,
    topCountries,
    topSources,
  ] = await Promise.all([
    getSettingsSafe(),
    prisma.visitor.findMany({
      where,
      orderBy: { lastSeenAt: 'desc' },
      take: 200,
      include: { contact: { select: { id: true, email: true } } },
    }),
    Promise.all(TABS.map((t) => prisma.visitor.count({ where: filterWhere(t.key) }))),
    prisma.visitor.count({ where: { lastSeenAt: { gte: today } } }),
    prisma.visitor.count({ where: { lastSeenAt: { gte: daysAgo(7) } } }),
    prisma.visitor.count({ where: { lastSeenAt: { gte: daysAgo(30) } } }),
    prisma.pageView.count(),
    prisma.pageView.groupBy({
      by: ['path'],
      _count: { _all: true },
      orderBy: { _count: { path: 'desc' } },
      take: 6,
    }),
    prisma.visitor.groupBy({
      by: ['country'],
      where: { country: { not: null } },
      _count: { _all: true },
      orderBy: { _count: { country: 'desc' } },
      take: 6,
    }),
    prisma.visitor.groupBy({
      by: ['source'],
      _count: { _all: true },
      orderBy: { _count: { source: 'desc' } },
      take: 6,
    }),
  ]);

  const recording = asBoolean(settings.analytics_enabled);
  const retentionDays = asNumber(settings.analytics_retention_days, 90);

  const rows: VisitorRow[] = visitors.map((v) => ({
    id: v.id,
    token: v.token,
    shortToken: shortToken(v.token),
    views: v.viewCount,
    lastPath: v.lastPath,
    source: v.source,
    country: v.country,
    firstSeenAt: v.firstSeenAt.toISOString(),
    lastSeenAt: v.lastSeenAt.toISOString(),
    /* Masked here, on the server. The client component is never handed a full address. */
    identity: v.contact ? maskEmail(v.contact.email) : null,
    contactId: v.contactId,
  }));

  const href = (patch: Partial<Params>) => {
    const next = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...searchParams, ...patch })) {
      if (v && v !== 'all') next.set(k, String(v));
    }
    const qs = next.toString();
    return qs ? `/admin/analytics?${qs}` : '/admin/analytics';
  };

  return (
    <>
      <WpScreenMeta
        help={
          <div>
            <p className="mt-0">
              <strong>What is collected.</strong> A random 32-character token, generated by this
              server and stored in a first-party cookie; the paths that token asked for and when;
              the <em>hostname</em> of the site that referred it; and a two-letter country code,
              taken from a header the CDN had already worked out.
            </p>
            <p>
              <strong>What is not collected.</strong> No IP address — not stored, not hashed, not
              passed to the code that writes these rows. No device or browser fingerprint. No
              cross-site identifier. No full referrer URL: a referrer can carry the previous
              page&rsquo;s query string, which is somebody else&rsquo;s data, so only the host is
              kept. Admin screens are never recorded.
            </p>
            <p>
              <strong>How a visitor becomes a name.</strong> Only by handing one over — an
              enquiry, a newsletter sign-up, an order. Until then the token is derived from
              nothing about the person, so it cannot be worked back to one. Addresses are masked
              on this screen; the full record is on the contact.
            </p>
            <p className="mb-0">
              <strong>Switching it off and clearing it out.</strong> Settings &rarr; Privacy turns
              recording off entirely and sets how long page views are kept. The button under
              Retention below enforces that period now.
            </p>
          </div>
        }
      />

      <h1 className="wp-heading-inline">Analytics</h1>
      <Link href="/admin/search" className="wp-page-title-action">
        Search terms
      </Link>

      <hr className="my-2 border-0 border-t border-[#c3c4c7]" />

      {!recording && (
        <WpStaticNotice tone="warning">
          Visit recording is switched off under Settings &rarr; Privacy. Nothing new is being
          written; what is below is history.
        </WpStaticNotice>
      )}

      <div className="mb-4 grid gap-4 lg:grid-cols-3">
        <WpPostbox title="Visitors" className="lg:col-span-2">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Tile label="Today" value={String(seenToday)} hint="seen since midnight" />
            <Tile label="7 days" value={String(seen7)} />
            <Tile label="30 days" value={String(seen30)} />
            <Tile label="Page views" value={String(totalViews)} hint="all time, after purges" />
          </div>
        </WpPostbox>

        <WpPostbox title="Retention">
          <AnalyticsPurge retentionDays={retentionDays} />
        </WpPostbox>

        <WpPostbox title="Top pages">
          <TopList
            rows={topPaths.map((p) => ({ label: p.path, count: p._count._all }))}
            empty="No page views yet."
          />
        </WpPostbox>

        <WpPostbox title="Top countries">
          <TopList
            rows={topCountries.map((c) => ({ label: c.country ?? '—', count: c._count._all }))}
            empty="No country header has been seen. Most hosts only set one in production."
          />
        </WpPostbox>

        <WpPostbox title="Top sources">
          <TopList
            rows={topSources.map((s) => ({ label: s.source, count: s._count._all }))}
            empty="No visitors yet."
          />
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
          Showing {rows.length}
          {rows.length === 200 && ' (capped)'} — most recently seen first.
        </p>

        <form method="get" action="/admin/analytics" className="flex items-center gap-2">
          {activeTab !== 'all' && <input type="hidden" name="filter" value={activeTab} />}
          <label className="wp-screen-reader-text" htmlFor="visitor-search">
            Search visitors
          </label>
          <input
            id="visitor-search"
            name="q"
            defaultValue={searchParams.q ?? ''}
            placeholder="Token, path, source or address"
            className="wp-input wp-input-search"
          />
          <button type="submit" className="wp-button">
            Search
          </button>
          {(q || activeTab !== 'all') && (
            <Link href="/admin/analytics" className="wp-button">
              Clear
            </Link>
          )}
        </form>
      </div>

      <AnalyticsTable rows={rows} />
    </>
  );
}
