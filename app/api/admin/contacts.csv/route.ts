import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getCurrentAdmin } from '@/lib/auth';

/*
  Export the contact list.

  Admin-only, re-checked here rather than trusted from middleware, for the same reason as the
  subscriber export: this route hands over every contact in one response. Middleware proves a
  cookie's signature; this proves the account still exists and the session was not revoked.

  The `marketing_consent` column is the important one, and it is derived from the linked
  Subscriber rather than from anything on the contact. A contact export that travels without it
  is how a CRM list ends up loaded into a sending platform as if every row were mailable — which
  is exactly the mistake the two-table design exists to prevent. The column says
  "no-consent" for anyone who never opted in and "unsubscribed" for anyone who opted out, so
  neither can be mistaken for permission by whatever reads the file next.
*/

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/*
  A leading = + - or @ makes a spreadsheet treat the cell as a formula, so a value like
  =cmd()... executes on open. Prefixing with an apostrophe is the standard defence.
*/
function cell(value: string | number | null | undefined): string {
  const raw = value == null ? '' : String(value);
  const safe = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
  return `"${safe.replace(/"/g, '""')}"`;
}

function filterWhere(filter: string | null): Prisma.ContactWhereInput {
  switch (filter) {
    case 'open':
      return { enquiries: { some: { status: { in: ['NEW', 'OPEN'] } } } };
    case 'mailable':
      return { subscriber: { status: 'SUBSCRIBED' } };
    case 'no-consent':
      return { OR: [{ subscriber: null }, { subscriber: { status: 'UNSUBSCRIBED' } }] };
    case 'dormant':
      return { stage: 'DORMANT' };
    default:
      return {};
  }
}

export async function GET(request: Request) {
  if (!(await getCurrentAdmin())) {
    return new Response('Unauthorised', { status: 401 });
  }

  const filter = new URL(request.url).searchParams.get('filter');

  const rows = await prisma.contact.findMany({
    where: filterWhere(filter),
    orderBy: { lastActivityAt: 'desc' },
    include: {
      subscriber: { select: { status: true, consentAt: true, consentText: true, source: true } },
      _count: { select: { enquiries: true, orders: true } },
    },
  });

  const header = [
    'email',
    'name',
    'phone',
    'stage',
    'tags',
    'first_source',
    'marketing_consent',
    'consent_at',
    'consent_source',
    'consent_text',
    'enquiries',
    'orders',
    'last_activity_at',
    'created_at',
  ];

  const body = rows.map((c) => {
    const consent =
      c.subscriber == null
        ? 'no-consent'
        : c.subscriber.status === 'SUBSCRIBED'
          ? 'subscribed'
          : 'unsubscribed';

    return [
      cell(c.email),
      cell(c.name),
      cell(c.phone),
      cell(c.stage),
      cell(c.tags.join(' ')),
      cell(c.firstSource),
      cell(consent),
      cell(c.subscriber?.consentAt.toISOString() ?? ''),
      cell(c.subscriber?.source ?? ''),
      /* The wording travels with the row: a tick proves nothing once the two are separated. */
      cell(c.subscriber?.consentText ?? ''),
      cell(c._count.enquiries),
      cell(c._count.orders),
      cell(c.lastActivityAt.toISOString()),
      cell(c.createdAt.toISOString()),
    ].join(',');
  });

  const csv = [header.join(','), ...body].join('\r\n');

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="contacts-${filter ?? 'all'}.csv"`,
      /* Never let a list of people sit in a shared cache. */
      'Cache-Control': 'no-store, private',
    },
  });
}
