/*
  Consent wording, in one place, importable from both sides of the boundary.

  This file has no `server-only` guard on purpose: the form that shows the sentence and the
  route that stores it must use the SAME string, and the only way to guarantee that is to have
  one definition both can import. A checkbox whose label differs from the text recorded as
  evidence is worse than no record at all — it is a record of something that never happened.

  When wording needs to change, add a new entry rather than editing an existing one. Past rows
  keep the sentence their subscriber actually agreed to; GDPR Article 7(1) asks you to prove
  what was consented to, not what you are asking people today.

  The one edit so far: October 2026, the store's name became "MrsAnabolics" (it was
  "MrAnabolics", which is also a separate business). Each Subscriber row stores the literal
  sentence it was shown, so the 13 earlier rows still read "MrAnabolics" — correctly.
*/

export const CONSENT = {
  newsletter:
    'I agree to receive marketing emails from MrsAnabolics about products, restocks and offers. I can unsubscribe at any time using the link in any email.',
  exit:
    'I agree to receive marketing emails from MrsAnabolics, including the offer above. I can unsubscribe at any time using the link in any email.',
  checkout:
    'Email me about this order, and send me marketing emails about products, restocks and offers. I can unsubscribe at any time using the link in any email.',
} as const;

export type ConsentSource = keyof typeof CONSENT;

/** The sources a request is allowed to claim. Anything else is rejected by the route. */
export const SOURCES = Object.keys(CONSENT) as ConsentSource[];

/*
  Deliberately permissive, and only a first pass.

  An address is proved by a message arriving, not by a regular expression — the elaborate
  RFC 5322 patterns reject valid addresses and still accept undeliverable ones. This catches
  typos and obvious junk; the double opt-in email is what actually confirms the address.
*/
export function looksLikeEmail(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed.length < 6 || trimmed.length > 254) return false;
  if (/\s/.test(trimmed)) return false;
  const at = trimmed.indexOf('@');
  if (at < 1 || at !== trimmed.lastIndexOf('@')) return false;
  const domain = trimmed.slice(at + 1);
  return domain.includes('.') && !domain.startsWith('.') && !domain.endsWith('.');
}

export function normaliseEmail(value: string): string {
  return value.trim().toLowerCase();
}
