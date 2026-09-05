import Link from 'next/link';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { asBoolean, getSettingsSafe } from '@/lib/settings';
import { WpPostbox, WpStaticNotice, WpSubsubsub } from '@/components/admin/wp-ui';
import { WpScreenMeta } from '@/components/admin/wp-notice';
import { SearchTermsTable, type SearchTermRow } from '@/components/admin/search-terms-table';

/*
  What people typed into the search box.

  The No results tab is the reason this screen exists. Every other number in the admin is the
  business talking about itself — how many products, how many orders, how many enquiries. A
  zero-result search is the only place a customer speaks in their own words, unprompted, and
  what they say is "I came here for this and you did not have it, or did not call it that".

  Both halves of that matter. Sometimes the answer is to stock the thing. Often it is that the
  catalogue already has it under a different name — a brand where they typed a compound, a
  compound where they typed a brand — and the fix is a word in the product copy, not a purchase
  order.

  Rows are grouped by the normalised term so that capitalisation and stray spaces do not split
  one signal into three. The term shown is one somebody actually typed.
*/

export const dynamic = 'force-dynamic';

type Params = { q?: string; filter?: string };

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'none', label: 'No results' },
  { key: 'recent', label: 'Recent' },
] as const;

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}

function filterWhere(filter?: string): Prisma.SearchQueryWhereInput {
  switch (filter) {
    case 'none':
      return { resultCount: 0 };
    case 'recent':
      return { occurredAt: { gte: daysAgo(7) } };
    default:
      return {};
  }
}

async function distinctTerms(where: Prisma.SearchQueryWhereInput): Promise<number> {
  const groups = await prisma.searchQuery.groupBy({ by: ['normalized'], where });
  return groups.length;
}

export default async function AdminSearchPage({ searchParams }: { searchParams: Params }) {
  await requireAdmin();

  const activeTab = searchParams.filter ?? 'all';
  const q = searchParams.q?.trim();

  const where: Prisma.SearchQueryWhereInput = { ...filterWhere(activeTab) };
  if (q) where.normalized = { contains: q.toLowerCase() };

  const [settings, groups, counts, totalSearches, zeroSearches, zeroTerms] = await Promise.all([
    getSettingsSafe(),
    prisma.searchQuery.groupBy({
      by: ['normalized'],
      where,
      _count: { _all: true },
      _avg: { resultCount: true },
      _min: { resultCount: true },
      /* _max on `term` gives back a string somebody genuinely typed, which is the point: the
         normalised key is for grouping, not for reading. Which of several spellings wins is
         arbitrary, and that is fine — any of them is a real customer's wording. */
      _max: { occurredAt: true, term: true },
      orderBy:
        activeTab === 'recent'
          ? { _max: { occurredAt: 'desc' } }
          : { _count: { normalized: 'desc' } },
      take: 200,
    }),
    Promise.all(TABS.map((t) => distinctTerms(filterWhere(t.key)))),
    prisma.searchQuery.count(),
    prisma.searchQuery.count({ where: { resultCount: 0 } }),
    distinctTerms({ resultCount: 0 }),
  ]);

  const recording = asBoolean(settings.analytics_enabled);

  const rows: SearchTermRow[] = groups.map((g) => ({
    normalized: g.normalized,
    term: g._max.term ?? g.normalized,
    searches: g._count._all,
    avgResults: g._avg.resultCount ?? 0,
    lastSearchedAt: (g._max.occurredAt ?? new Date(0)).toISOString(),
    /* Flagged when the term has ever come back empty, not only when it always does. A term that
       found nothing yesterday and something today still tells you the catalogue moved. */
    noResults: (g._min.resultCount ?? 0) === 0,
  }));

  const href = (patch: Partial<Params>) => {
    const next = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...searchParams, ...patch })) {
      if (v && v !== 'all') next.set(k, String(v));
    }
    const qs = next.toString();
    return qs ? `/admin/search?${qs}` : '/admin/search';
  };

  const zeroShare = totalSearches > 0 ? Math.round((zeroSearches / totalSearches) * 100) : 0;

  return (
    <>
      <WpScreenMeta
        help={
          <div>
            <p className="mt-0">
              <strong>Read the No results tab first.</strong> It is the most valuable screen in
              this admin, because it is the only one where a customer tells you in their own
              words what they came for and could not find. Everything else here is the business
              describing itself.
            </p>
            <p>
              <strong>Two different fixes hide in that list.</strong> Sometimes the product is
              genuinely missing and the answer is to stock it. More often it is already in the
              catalogue under another name — someone typed a compound and we list the brand, or
              the reverse — and the fix is a word added to the product description, which costs
              nothing and recovers the sale.
            </p>
            <p>
              <strong>What is stored.</strong> The term as typed, a lower-cased form for
              grouping, how many products came back, and the visitor token if there was one. No
              IP address and no identity. Clearing a term deletes every search recorded under it.
            </p>
            <p className="mb-0">
              <strong>Grouping.</strong> Rows are keyed on the lower-cased, space-collapsed form,
              so “TB-500”, “tb-500” and “ tb-500 ” are one row. The wording shown is one a real
              visitor typed.
            </p>
          </div>
        }
      />

      <h1 className="wp-heading-inline">Search terms</h1>
      <Link href="/admin/analytics" className="wp-page-title-action">
        Analytics
      </Link>

      <hr className="my-2 border-0 border-t border-[#c3c4c7]" />

      {!recording && (
        <WpStaticNotice tone="warning">
          Visit recording is switched off under Settings &rarr; Privacy, so no new searches are
          being stored.
        </WpStaticNotice>
      )}

      <div className="mb-4 grid gap-4 lg:grid-cols-3">
        <WpPostbox title="Searches that found nothing" className="lg:col-span-2">
          <div className="flex flex-wrap items-baseline gap-x-8 gap-y-3">
            <div>
              <div
                className="wp-num text-[28px] font-semibold leading-none"
                style={{ color: zeroSearches > 0 ? 'var(--wp-error)' : undefined }}
              >
                {zeroSearches}
              </div>
              <div className="mt-1 text-[12px] font-semibold uppercase tracking-wide">
                Empty searches
              </div>
            </div>

            <div>
              <div className="wp-num text-[28px] font-semibold leading-none">{zeroTerms}</div>
              <div className="mt-1 text-[12px] font-semibold uppercase tracking-wide">
                Distinct terms
              </div>
            </div>

            <div>
              <div className="wp-num text-[28px] font-semibold leading-none">{zeroShare}%</div>
              <div className="mt-1 text-[12px] font-semibold uppercase tracking-wide">
                Of all searches
              </div>
            </div>
          </div>

          <p className="wp-help mb-0">
            Each of these is somebody telling you, in their own words, what they came for and
            could not find. Some need stocking; more need a word adding to a product they were
            already looking at.
          </p>

          {zeroTerms > 0 && (
            <p className="m-0 mt-3">
              <Link href={href({ filter: 'none', q: undefined })} className="wp-button">
                Show them
              </Link>
            </p>
          )}
        </WpPostbox>

        <WpPostbox title="All searches">
          <div className="wp-num text-[28px] font-semibold leading-none">{totalSearches}</div>
          <div className="mt-1 text-[12px] font-semibold uppercase tracking-wide">Recorded</div>
          <p className="wp-help mb-0">
            Across {counts[0]} distinct term{counts[0] === 1 ? '' : 's'}.
          </p>
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
          {rows.length === 200 && ' (capped)'} —{' '}
          {activeTab === 'recent' ? 'most recently searched first' : 'most searched first'}.
        </p>

        <form method="get" action="/admin/search" className="flex items-center gap-2">
          {activeTab !== 'all' && <input type="hidden" name="filter" value={activeTab} />}
          <label className="wp-screen-reader-text" htmlFor="term-search">
            Search terms
          </label>
          <input
            id="term-search"
            name="q"
            defaultValue={searchParams.q ?? ''}
            placeholder="Find a term"
            className="wp-input wp-input-search"
          />
          <button type="submit" className="wp-button">
            Search
          </button>
          {(q || activeTab !== 'all') && (
            <Link href="/admin/search" className="wp-button">
              Clear
            </Link>
          )}
        </form>
      </div>

      <SearchTermsTable rows={rows} />
    </>
  );
}
