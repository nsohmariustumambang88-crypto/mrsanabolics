'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';

/*
  One POST to /api/track per page the visitor lands on.

  It renders nothing and it blocks nothing. The request is fired from an effect, after paint,
  behind a zero-delay timer, so it can never sit in front of the content someone actually came
  for — an analytics beacon that costs a page its first interaction has made the site worse in
  order to measure the site.

  `keepalive` matters more than it looks: the last view of a session is fired as the person is
  leaving, and without it the browser cancels the request when the document goes away, which
  quietly loses exactly the exit page you wanted to know about.

  Rejections are swallowed. There is nothing a visitor could do about a failed page-view write
  and nothing worth showing them, and an unhandled rejection in a client component is noise in
  the console of every developer who opens the site.
*/

const SENT_NOTHING = '';

export function VisitTracker() {
  const pathname = usePathname();

  /* Guards against StrictMode's double-invoked effect in development and against a re-render
     that does not change the path. One view per pathname change, which is what the counter
     means. */
  const sent = React.useRef<string>(SENT_NOTHING);

  React.useEffect(() => {
    if (!pathname) return;

    /* The admin is staff at work; it is not site usage. The route refuses these too — this is
       the cheaper half of the same rule, so the request is never made at all. */
    if (pathname === '/admin' || pathname.startsWith('/admin/')) return;

    if (sent.current === pathname) return;
    sent.current = pathname;

    /*
      document.referrer keeps the original external referrer across client-side navigations,
      which is the right value: it says where the session came from. The server reduces it to a
      hostname before storing it, so nothing here needs to parse it.
    */
    const payload = JSON.stringify({
      path: pathname,
      referrer: document.referrer || null,
    });

    const timer = window.setTimeout(() => {
      void fetch('/api/track', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: payload,
        keepalive: true,
        credentials: 'same-origin',
      }).catch(() => {
        /* Deliberately silent. */
      });
    }, 0);

    return () => window.clearTimeout(timer);
  }, [pathname]);

  return null;
}

export default VisitTracker;
