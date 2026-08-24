import Link from 'next/link';
import type { Metadata } from 'next';
import { prisma } from '@/lib/prisma';

/*
  Unsubscribe.

  Two steps on purpose. A link that unsubscribes on GET gets fired by every security scanner
  and mail client that prefetches URLs, so people silently vanish from the list without ever
  clicking — and you only find out when the numbers stop making sense. The GET shows who is
  about to be removed; the POST removes them.

  Reachable without an account and never indexed: the address in the link is the only
  credential, and it should not turn up in a search result.
*/

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Unsubscribe',
  robots: { index: false, follow: false },
};

/** Show enough of the address to recognise it, not enough to harvest it. */
function maskEmail(email: string): string {
  const [name, domain] = email.split('@');
  if (!domain) return '•••';
  const head = name.slice(0, 2);
  return `${head}${'•'.repeat(Math.max(name.length - 2, 1))}@${domain}`;
}

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: { token?: string; done?: string };
}) {
  const token = searchParams.token ?? '';

  const subscriber = token
    ? await prisma.subscriber.findUnique({
        where: { unsubscribeToken: token },
        select: { email: true, status: true },
      })
    : null;

  const done = searchParams.done === '1';

  return (
    <div className="mx-auto max-w-lg px-4 py-16 sm:px-6 sm:py-24">
      <h1 className="font-display text-2xl font-semibold tracking-[-0.03em]">
        Email preferences
      </h1>

      {done || subscriber?.status === 'UNSUBSCRIBED' ? (
        <>
          <p className="mt-4 text-sm leading-relaxed text-ink-soft">
            You have been removed from the mailing list. No further marketing email will be
            sent to this address.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-ink-faint">
            Messages about an order you place will still be sent — those are not marketing.
          </p>
        </>
      ) : !subscriber ? (
        <p className="mt-4 text-sm leading-relaxed text-ink-soft">
          That link is not valid, or it has already been used. If you are still receiving
          email, use the unsubscribe link in the most recent one.
        </p>
      ) : (
        <>
          <p className="mt-4 text-sm leading-relaxed text-ink-soft">
            Remove <span className="font-medium text-ink">{maskEmail(subscriber.email)}</span>{' '}
            from the MrAnabolics mailing list?
          </p>

          <form method="post" action="/api/unsubscribe" className="mt-7 flex flex-wrap gap-3">
            <input type="hidden" name="token" value={token} />
            <button
              type="submit"
              className="rounded-full bg-pigment-indigo px-6 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-pigment-indigo-lift"
            >
              Unsubscribe
            </button>
            <Link
              href="/"
              className="rounded-full border border-rule-strong px-6 py-3 text-sm font-medium transition-colors hover:border-pigment-indigo"
            >
              Keep me subscribed
            </Link>
          </form>
        </>
      )}

      <p className="mt-10 border-t border-rule pt-6 text-xs leading-relaxed text-ink-faint">
        This is a portfolio build. No marketing email is actually sent from it — see the
        disclosure in the footer.
      </p>
    </div>
  );
}
