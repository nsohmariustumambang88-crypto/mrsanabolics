import { cn } from '@/lib/utils';

/*
  Hairline grids draw their rules by letting the container colour show through a 1px gap.
  That means an incomplete final row leaves a bare rule-coloured box in the layout.

  These fillers close the row with the page ground instead, so a short row reads as an empty
  slot in a ruled table rather than as a broken cell. One tier per breakpoint that changes the
  column count, because a filler that closes the row at one width is wrong at the next.

  THE CLASS NAMES ARE SPELLED OUT ON PURPOSE. Tailwind generates utilities by scanning source
  text for literal strings, so a template like `${prefix}:block` produces a class that is in
  the DOM and absent from the stylesheet — the element keeps the base `hidden` and the row
  stays open. That is exactly the bug this component exists to prevent, and it fails silently.
*/

const TIER = {
  sm: { on: 'sm:block', off: 'sm:hidden' },
  md: { on: 'md:block', off: 'md:hidden' },
  lg: { on: 'lg:block', off: 'lg:hidden' },
  xl: { on: 'xl:block', off: 'xl:hidden' },
} as const;

type Prefix = keyof typeof TIER;

export function GridFillers({
  len,
  narrow = 2,
  mid,
  midPrefix = 'md',
  wide,
  widePrefix = 'lg',
  ground = 'bg-paper',
}: {
  len: number;
  narrow?: number;
  mid?: number;
  midPrefix?: Prefix;
  wide: number;
  widePrefix?: Prefix;
  ground?: string;
}) {
  const gapFor = (cols: number) => (cols - (len % cols)) % cols;

  const base = gapFor(narrow);
  const tiers: { prefix: Prefix; gap: number }[] = [
    ...(mid ? [{ prefix: midPrefix, gap: gapFor(mid) }] : []),
    { prefix: widePrefix, gap: gapFor(wide) },
  ];

  const count = Math.max(base, ...tiers.map((t) => t.gap));
  if (count === 0) return null;

  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={`filler-${i}`}
          aria-hidden="true"
          className={cn(
            ground,
            i < base ? 'block' : 'hidden',
            tiers.map((t) => (i < t.gap ? TIER[t.prefix].on : TIER[t.prefix].off))
          )}
        />
      ))}
    </>
  );
}
