'use client';

import * as React from 'react';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';

/*
  Two substrates, one bath. The control shows both states at once — the lifted sheet and the
  size it came out of — so the choice reads as a material, not as a brightness setting.

  The knob moves first and the theme follows a frame later. Switching the theme restyles the
  whole page, and doing it inside the click held the next paint for ~200ms (Chrome reported it as
  an INP issue on this button, 20 November 2026). Now the press is answered at once and the
  restyle lands on the following frame.
*/
export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  /* The state the knob shows while the theme catches up; null once it has. */
  const [pending, setPending] = React.useState<'light' | 'dark' | null>(null);

  React.useEffect(() => setMounted(true), []);
  React.useEffect(() => setPending(null), [resolvedTheme]);

  const isBath = pending ? pending === 'dark' : mounted && resolvedTheme === 'dark';

  const toggle = () => {
    const next = isBath ? 'light' : 'dark';
    setPending(next);
    /* Two frames: the first paints the knob, the second applies the theme. */
    requestAnimationFrame(() => requestAnimationFrame(() => setTheme(next)));
  };

  return (
    <button
      type="button"
      onClick={toggle}
      className={cn(
        'group relative inline-flex h-8 w-[3.25rem] items-center rounded-full border border-rule-strong bg-paper-sunk px-0.5 transition-colors duration-300 hover:border-pigment-indigo-lift',
        className
      )}
      aria-label={isBath ? 'Switch to light theme' : 'Switch to dark theme'}
      title={isBath ? 'Switch to light theme' : 'Switch to dark theme'}
    >
      <span
        className={cn(
          'flex h-6 w-6 items-center justify-center rounded-full border',
          isBath
            ? 'translate-x-[1.5rem] border-pigment-indigo-lift bg-pigment-indigo'
            : 'translate-x-0 border-rule-strong bg-paper-raised'
        )}
      >
        <span
          className={cn(
            'block h-2 w-2 rounded-full transition-colors duration-300',
            isBath ? 'bg-pigment-saffron' : 'bg-pigment-madder'
          )}
        />
      </span>
      <span className="sr-only">
        {isBath ? 'Switch to the light theme' : 'Switch to the dark theme'}
      </span>
    </button>
  );
}
