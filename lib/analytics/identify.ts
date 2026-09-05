import 'server-only';

import { prisma } from '@/lib/prisma';
import { isVisitorToken } from '@/lib/analytics/track';

/*
  Attach a browser to a person — but only when the person did the attaching.

  Analytics here never works out who somebody is. A visitor is a random token in a cookie and
  stays anonymous for as long as they say nothing. The link is made at exactly one kind of
  moment: they typed their own address into a form and submitted it. Subscribing, or writing
  in. That is the whole rule, and it is why this lives in its own small module rather than
  inside the tracker — the tracker must never be able to do this on its own.

  What it buys is the one question a shop actually asks of analytics: this person who has been
  back eleven times and finally wrote to us — what were they looking at? Answering that without
  consent would mean fingerprinting; answering it after they identify themselves is just
  joining up two things they already told you.

  Never throws. A failure here must not be the reason a sign-up or an enquiry fails: the person
  gave you their address, and losing that to a bookkeeping error would be the expensive mistake.
*/

/**
 * The visitor token from a request's cookie header.
 *
 * Parsed from the raw header rather than taken from `NextRequest.cookies`, because these
 * routes are typed against the plain `Request` the Web platform defines and there is no reason
 * to widen them for one read.
 */
export function visitorTokenFrom(request: Request): string | undefined {
  const header = request.headers.get('cookie');
  if (!header) return undefined;

  for (const part of header.split(';')) {
    const [name, ...rest] = part.trim().split('=');
    if (name === 'mra_vid') return rest.join('=');
  }
  return undefined;
}

export async function attachVisitorByEmail(
  token: string | undefined,
  email: string
): Promise<void> {
  if (!isVisitorToken(token ?? '')) return;

  try {
    const contact = await prisma.contact.findUnique({
      where: { email: email.trim().toLowerCase() },
      select: { id: true },
    });
    if (!contact) return;

    /*
      Scoped to the token AND to rows not already claimed. Re-running is harmless, and a
      shared browser cannot silently reassign an earlier person's history to a later one —
      the first identification wins, which is the conservative direction.
    */
    await prisma.visitor.updateMany({
      where: { token: token as string, contactId: null },
      data: { contactId: contact.id },
    });
  } catch {
    /* Swallowed on purpose. See the note above. */
  }
}
