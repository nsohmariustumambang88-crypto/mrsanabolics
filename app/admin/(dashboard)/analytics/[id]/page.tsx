import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { maskEmail, shortToken } from '@/lib/analytics/mask';
import { WpPostbox, WpStaticNotice } from '@/components/admin/wp-ui';

/*
  One visitor.

  Everything this build knows about a browser, on one screen, which is a short list on purpose:
  a token prefix, the pages it asked for, what it searched for, and — only if the person handed
  over an address themselves — the contact it belongs to.

  The address is masked here as it is in the list. The link to the contact is the way to see it
  in full, so reading somebody's email is a step you take on purpose rather than something that
  happens to you while you are looking at a traffic report.

  The timeline is append-only, like every other timeline in this admin. There is no way to edit
  or remove a single view: a history you can retouch answers nothing you would ask a history.
  What there is, on the Analytics screen, is a way to delete the visitor entirely.
*/

export const dynamic = 'force-dynamic';

function stamp(date: Date): string {
  const iso = date.toISOString();
  return `${iso.slice(0, 10)} ${iso.slice(11, 16)}`;
}

export default async function AdminVisitorPage({ params }: { params: { id: string } }) {
  await requireAdmin();

  const visitor = await prisma.visitor.findUnique({
    where: { id: params.id },
    include: {
      contact: { select: { id: true, email: true, name: true, stage: true } },
      pageViews: { orderBy: { occurredAt: 'desc' }, take: 200 },
      searches: { orderBy: { occurredAt: 'desc' }, take: 100 },
    },
  });

  if (!visitor) notFound();

  const label = shortToken(visitor.token);

  return (
    <>
      <h1 className="wp-heading-inline">
        Visitor <span className="wp-num">{label}</span>
      </h1>
      <Link href="/admin/analytics" className="wp-page-title-action">
        Back to Analytics
      </Link>

      <hr className="my-2 border-0 border-t border-[#c3c4c7]" />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <WpPostbox title={`Pages viewed (${visitor.pageViews.length})`}>
            {visitor.pageViews.length === 0 ? (
              <p className="wp-muted m-0">
                No page views are stored. They may have been removed by the retention purge —
                the running count above survives it.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="wp-list-table min-w-[36rem]">
                  <thead>
                    <tr>
                      <th scope="col">When</th>
                      <th scope="col">Page</th>
                      <th scope="col">Referred by</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visitor.pageViews.map((view) => (
                      <tr key={view.id}>
                        <td className="wp-num text-[12px]">{stamp(view.occurredAt)}</td>
                        <td>
                          <a href={view.path} target="_blank" rel="noreferrer">
                            {view.path}
                          </a>
                        </td>
                        <td className="wp-muted text-[12px]">{view.referrer ?? 'direct'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {visitor.pageViews.length === 200 && (
              <p className="wp-help mb-0">Showing the 200 most recent.</p>
            )}
          </WpPostbox>

          <div className="mt-4">
            <WpPostbox title={`Searches (${visitor.searches.length})`}>
              {visitor.searches.length === 0 ? (
                <p className="wp-muted m-0">Nothing searched for.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="wp-list-table min-w-[32rem]">
                    <thead>
                      <tr>
                        <th scope="col">When</th>
                        <th scope="col">Term</th>
                        <th scope="col">Results</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visitor.searches.map((search) => (
                        <tr key={search.id}>
                          <td className="wp-num text-[12px]">{stamp(search.occurredAt)}</td>
                          <td>
                            <Link href={`/admin/search?q=${encodeURIComponent(search.normalized)}`}>
                              {search.term}
                            </Link>
                          </td>
                          <td className="wp-num">
                            {search.resultCount === 0 ? (
                              <span style={{ color: 'var(--wp-error)' }}>0</span>
                            ) : (
                              search.resultCount
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </WpPostbox>
          </div>
        </div>

        <div>
          <WpPostbox title="Identity">
            {visitor.contact ? (
              <>
                <p className="m-0">
                  <strong>{maskEmail(visitor.contact.email)}</strong>
                </p>
                {visitor.contact.name && (
                  <p className="wp-muted m-0 mt-1 text-[12px]">{visitor.contact.name}</p>
                )}
                <p className="wp-help">
                  This browser was linked to a contact because the person gave that address
                  themselves. The full record, including whether they may be emailed, is on the
                  contact.
                </p>
                <Link href={`/admin/contacts/${visitor.contact.id}`} className="wp-button">
                  Open contact
                </Link>
              </>
            ) : (
              <>
                <p className="m-0 wp-muted">Not identified.</p>
                <p className="wp-help mb-0">
                  The token is random and derived from nothing about the person, so there is
                  nothing here to work back from. A visitor gains a name only by giving one.
                </p>
              </>
            )}
          </WpPostbox>

          <div className="mt-4">
            <WpPostbox title="Summary">
              <dl className="m-0 grid grid-cols-[auto,1fr] gap-x-4 gap-y-1.5 text-[13px]">
                <dt className="wp-muted">Token</dt>
                <dd className="wp-num m-0">{label}…</dd>

                <dt className="wp-muted">Views</dt>
                <dd className="wp-num m-0">{visitor.viewCount}</dd>

                <dt className="wp-muted">Source</dt>
                <dd className="m-0">{visitor.source}</dd>

                <dt className="wp-muted">Country</dt>
                <dd className="wp-num m-0">{visitor.country ?? '—'}</dd>

                <dt className="wp-muted">First seen</dt>
                <dd className="wp-num m-0">{stamp(visitor.firstSeenAt)}</dd>

                <dt className="wp-muted">Last seen</dt>
                <dd className="wp-num m-0">{stamp(visitor.lastSeenAt)}</dd>

                <dt className="wp-muted">Last page</dt>
                <dd className="m-0">{visitor.lastPath ?? '—'}</dd>
              </dl>
            </WpPostbox>
          </div>

          <div className="mt-4">
            <WpStaticNotice tone="info">
              No IP address is held against this visitor. The country, when there is one, comes
              from a header the CDN derived before the request arrived.
            </WpStaticNotice>
          </div>
        </div>
      </div>
    </>
  );
}
