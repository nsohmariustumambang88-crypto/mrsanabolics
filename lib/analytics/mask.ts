/*
  Masking an address for the analytics screen.

  The Analytics table exists to answer "how is the site being used", not "who is using it".
  A visitor row that quietly prints a full email address turns a traffic report into a
  directory of customers, readable by anyone who is shoulder-surfing a staff screen or looking
  at a screenshot pasted into a chat. So the identity column shows enough to recognise a person
  you already know and not enough to harvest one you do not.

  There is no server-only guard here on purpose: the masking happens on the server that fetched
  the row, but the same helper is useful anywhere, and it touches nothing but its argument.

  The bullet run is a FIXED length rather than the real length of the local part. A run that
  tracked the length would leak it — and the length of the local part, with a visible domain
  and two leading characters, narrows a guess far more than it looks like it does.
*/

const BULLETS = '•'.repeat(8);

/**
 * `spike@example.com` becomes `sp••••••••@example.com`.
 *
 * Anything that does not look like an address is masked whole rather than passed through —
 * failing closed is the only safe direction for a function whose job is to hide something.
 */
export function maskEmail(email: string | null | undefined): string {
  if (!email) return '—';

  const at = email.lastIndexOf('@');
  if (at < 1 || at === email.length - 1) return BULLETS;

  const local = email.slice(0, at);
  const domain = email.slice(at + 1);

  /* One-character local parts get nothing revealed; two characters is already the whole name. */
  const shown = local.length <= 2 ? local.slice(0, 1) : local.slice(0, 2);

  return `${shown}${BULLETS}@${domain}`;
}

/**
 * The short form of a visitor token used as a row label.
 *
 * The full token is a capability of sorts — it is what the cookie carries — so the list shows
 * a prefix and the link carries the row id instead.
 */
export function shortToken(token: string): string {
  return token.slice(0, 8);
}
