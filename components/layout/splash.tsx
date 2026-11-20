'use client';

import * as React from 'react';
import { BullMark } from '@/components/brand/bull-mark';
import { SITE } from '@/lib/site';

/*
  The splash: once per browser session, the bull and the name rise onto the paper, a pigment rule
  fills beneath them, and the sheet wipes upward off the page. Modelled on the reference store the
  owner chose (19 November 2026), whose splash runs the same sequence with GSAP; here it is CSS
  keyframes in globals.css, about two seconds in all. A tap anywhere ends it at once.

  No flash for anyone who should not see it. SPLASH_BOOT runs inline, before the splash markup is
  parsed, and marks <html data-splash="seen"> when this session has already had it or the visitor
  asks for reduced motion; globals.css then hides it before the first paint. The page underneath is
  fully rendered either way, so crawlers and the content do not wait on it.
*/

const KEY = 'mra-splash-seen';
const TOTAL_MS = 2050;

export const SPLASH_BOOT = `(function(){try{var d=document.documentElement;if(sessionStorage.getItem('${KEY}')||matchMedia('(prefers-reduced-motion: reduce)').matches){d.dataset.splash='seen'}}catch(e){}})();`;

export function Splash() {
  const [done, setDone] = React.useState(false);

  const finish = React.useCallback(() => {
    try {
      sessionStorage.setItem(KEY, '1');
    } catch {
      /* Private mode: the splash simply plays again next visit. */
    }
    document.documentElement.dataset.splash = 'seen';
    setDone(true);
  }, []);

  React.useEffect(() => {
    if (document.documentElement.dataset.splash === 'seen') {
      setDone(true);
      return;
    }
    const timer = window.setTimeout(finish, TOTAL_MS);
    return () => window.clearTimeout(timer);
  }, [finish]);

  if (done) return null;

  return (
    <div
      data-splash-root
      role="presentation"
      onClick={finish}
      className="splash-root fixed inset-0 z-[100] flex cursor-pointer flex-col items-center justify-center bg-paper px-6"
    >
      <div className="splash-mark">
        <BullMark className="w-28 sm:w-36" />
      </div>
      <p
        aria-hidden="true"
        className="mt-4 flex overflow-hidden font-display text-[min(11vw,4.5rem)] font-semibold leading-none tracking-[-0.04em] text-ink"
      >
        {SITE.name.split('').map((letter, i) => (
          <span
            key={i}
            className="splash-letter inline-block"
            style={{ animationDelay: `${120 + i * 40}ms` }}
          >
            {letter}
          </span>
        ))}
      </p>
      <span className="splash-bar mt-6 block h-[3px] w-40 origin-left bg-pigment-indigo sm:w-56" />
    </div>
  );
}
