/*
  The house mark: one drop of pigment, seen from above.

  A single contact point spreading into concentric rings — the first thing that happens in a
  bath and the only mark ebru makes on its own. Drawn, not composed from primitives, and the
  rings carry the two lead pigments so the mark states the palette wherever it appears.
*/

export function DropMark({
  className,
  title,
}: {
  className?: string;
  title?: string;
}) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      role={title ? 'img' : 'presentation'}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <circle cx="16" cy="16" r="15" className="stroke-pigment-indigo" strokeWidth="1.5" />
      <circle
        cx="16"
        cy="16"
        r="10.5"
        className="stroke-pigment-indigo-lift"
        strokeWidth="1.25"
        opacity="0.9"
      />
      <circle
        cx="16"
        cy="16"
        r="6.25"
        className="stroke-pigment-indigo"
        strokeWidth="1.25"
        opacity="0.7"
      />
      <circle cx="16" cy="16" r="3" className="fill-pigment-madder" />
    </svg>
  );
}

/*
  The stylus. Used where the site talks about the act of drawing through the size —
  one stroke, one direction, tapered to the point that touches the surface.
*/
export function StylusMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M21 3 9.5 14.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M9.5 14.5 6.8 17.2a1.4 1.4 0 0 0 0 2l.1.1a1.4 1.4 0 0 0 2 0l2.6-2.7Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M3 21c1.6-.4 2.6-1 3.2-1.8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
