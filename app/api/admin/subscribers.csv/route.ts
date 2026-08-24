import { prisma } from '@/lib/prisma';
import { getCurrentAdmin } from '@/lib/auth';
import type { Prisma } from '@prisma/client';

/*
  Export the list.

  Admin-only, and it re-checks the session here rather than trusting middleware: this route
  hands over every address on the list in one response, which is the single most sensitive
  thing the admin can produce. Middleware proves a cookie's signature; this proves the account
  still exists and the session was not revoked.

  The consent columns travel with the addresses on purpose. An export that carries only email
  addresses is how a list arrives at an email platform stripped of the evidence that makes it
  lawful to send to — and once separated, the two are never reunited.
*/

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/*
  A leading = + - or @ makes a spreadsheet treat the cell as a formula, so an address like
  =cmd()... executes on open. Prefixing with an apostrophe is the standard defence.
*/
function cell(value: string | number | null | undefined): string {
  const raw = value == null ? '' : String(value);
  const safe = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
  return `"${safe.replace(/"/g, '""')}"`;
}

export async function GET(request: Request) {
  if (!(await getCurrentAdmin())) {
    return new Response('Unauthorised', { status: 401 });
  }

  const filter = new URL(request.url).searchParams.get('filter');

  const where: Prisma.SubscriberWhereInput =
    filter === 'subscribed'
      ? { status: 'SUBSCRIBED' }
      : filter === 'unsubscribed'
        ? { status: 'UNSUBSCRIBED' }
        : filter === 'abandoned'
          ? { abandonedValue: { not: null }, status: 'SUBSCRIBED' }
          : {};

  const rows = await prisma.subscriber.findMany({ where, orderBy: { createdAt: 'desc' } });

  const header = [
    'email',
    'status',
    'source',
    'consent_at',
    'consent_text',
    'consent_path',
    'page_views',
    'last_seen_at',
    'last_seen_path',
    'abandoned_value',
    'unsubscribe_token',
  ];

  const body = rows.map((s) =>
    [
      cell(s.email),
      cell(s.status),
      cell(s.source),
      cell(s.consentAt.toISOString()),
      cell(s.consentText),
      cell(s.consentPath),
      cell(s.pageViews),
      cell(s.lastSeenAt?.toISOString() ?? ''),
      cell(s.lastSeenPath),
      cell(s.abandonedValue?.toString() ?? ''),
      /* Carried so the sending platform can build a working unsubscribe link per recipient. */
      cell(s.unsubscribeToken),
    ].join(',')
  );

  const csv = [header.join(','), ...body].join('\r\n');

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="subscribers-${filter ?? 'all'}.csv"`,
      /* Never let a list of addresses sit in a shared cache. */
      'Cache-Control': 'no-store, private',
    },
  });
}
