'use client';

import * as React from 'react';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';

/*
  Two substrates, one bath. The control shows both states at once — the lifted sheet and the
  size it came out of — so the choice reads as a material, not as a brightness setting.
*/
export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => setMounted(true), []);

  const isBath = mounted && resolvedTheme === 'dark';

  return (
    <button
      type="button"
      onClick={() => setTheme(isBath ? 'light' : 'dark')}
      className={cn(
        'group relative inline-flex h-8 w-[3.25rem] items-center rounded-full border border-rule-strong bg-paper-sunk px-0.5 transition-colors duration-300 hover:border-pigment-indigo-lift',
        className
      )}
      aria-label={isBath ? 'Lift onto paper' : 'Return to the bath'}
      title={isBath ? 'Lift onto paper' : 'Return to the bath'}
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
