'use client';

import * as React from 'react';

/*
  Report a search term once the person has stopped typing.

  A search box filters on every keystroke, so "test" would otherwise arrive as four rows —
  "t", "te", "tes", "test" — and the three prefixes are noise that buries the real term. The
  debounce is what makes the search report readable: one row per thing somebody actually asked
  for.

  Deliberately fire-and-forget. `keepalive` lets the request survive the navigation that
  usually follows a search, and every failure is swallowed: analytics must never be the reason
  a search box misbehaves.
*/

const DEBOUNCE_MS = 900;
const MIN_LENGTH = 2;

export function useSearchLog(term: string, resultCount: number): void {
  /* Held in a ref so a changing count does not restart the timer while somebody is typing. */
  const countRef = React.useRef(resultCount);
  countRef.current = resultCount;

  /* One report per term per mount: reopening the dialog and retyping is a new search, but
     backspacing and retyping the same word inside one session is not. */
  const reported = React.useRef(new Set<string>());

  React.useEffect(() => {
    const trimmed = term.trim();
    if (trimmed.length < MIN_LENGTH) return;

    const key = trimmed.toLowerCase();
    if (reported.current.has(key)) return;

    const timer = setTimeout(() => {
      reported.current.add(key);
      try {
        void fetch('/api/track/search', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ term: trimmed, resultCount: countRef.current }),
          keepalive: true,
        }).catch(() => {});
      } catch {
        /* Ignored on purpose. */
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [term]);
}
