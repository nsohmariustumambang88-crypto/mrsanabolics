'use client';

import * as React from 'react';

/*
  The house mark: the owner's red bull on a black coin with a gold ring.

  Chosen by the owner to replace the ebru drop mark everywhere the brand appears. The coin and
  its ring are drawn here as vectors, so they stay sharp from a 28px avatar to a 64px header; the
  bull itself is the owner's illustration in its own red, cut out of its white background by
  `npm run brand:build` and served from /brand/bull.webp. See scripts/make-brand.mjs.

  The DRIP — gold running off the bottom of the coin — follows the reference the owner gave for
  the top-left of the header. It is a prop rather than a default, because at avatar size and in
  a tight row it reads as a smudge; brand moments take it, working UI does not.

  Gradient and clip ids come from useId, because several emblems can be on one page and SVG ids
  are document-global: a second emblem referencing the first one's gradient breaks the moment the
  first sits inside something hidden (the mobile menu, a closed drawer). The colons useId emits
  are stripped — `url(#:r1:)` is not reliably resolved.

  The metal is literal hex, not theme tokens. A logo is an asset that must look identical on the
  light sheet and the dark bath; it carries its own black coin so it reads on both.
*/

const GOLD = [
  { at: '0%', color: '#fbe7a1' },
  { at: '22%', color: '#e2bd62' },
  { at: '48%', color: '#a8762a' },
  { at: '70%', color: '#d9ad52' },
  { at: '100%', color: '#8c5f1c' },
];

/* Coin geometry, in viewBox units. */
const CX = 60;
const CY = 58;
const R = 55;

/**
 * Drips hanging from the bottom of the ring: x position, length and width. Hand-placed rather
 * than generated, so the mark is identical everywhere it appears.
 */
const DRIPS: { x: number; length: number; width: number }[] = [
  { x: 43, length: 9, width: 5.2 },
  { x: 53, length: 19, width: 6.4 },
  { x: 64, length: 11, width: 5.6 },
  { x: 74, length: 16, width: 5.8 },
];

/** Where the ring's outer edge is at a given x, near the bottom of the coin. */
function ringBottomAt(x: number): number {
  const dx = x - CX;
  return CY + Math.sqrt(Math.max(0, R * R - dx * dx));
}

/** A capsule that starts inside the ring and ends in a bulb: one drop of gold. */
function dripPath({ x, length, width }: { x: number; length: number; width: number }): string {
  const top = ringBottomAt(x) - 4;
  const bottom = top + length;
  const half = width / 2;
  const bulb = half * 1.25;
  return [
    `M ${x - half} ${top}`,
    `L ${x - half} ${bottom - bulb}`,
    /* The bulb: a wider round end, the way a drip gathers before it falls. */
    `C ${x - half} ${bottom - bulb * 0.2}, ${x - bulb} ${bottom}, ${x} ${bottom + bulb * 0.55}`,
    `C ${x + bulb} ${bottom}, ${x + half} ${bottom - bulb * 0.2}, ${x + half} ${bottom - bulb}`,
    `L ${x + half} ${top}`,
    'Z',
  ].join(' ');
}

export function BullEmblem({
  className,
  drip = false,
  title,
}: {
  className?: string;
  /** Gold running off the bottom of the coin. For brand moments, not working UI. */
  drip?: boolean;
  /** Accessible name. Omit when a visible wordmark beside it already names the brand. */
  title?: string;
}) {
  const raw = React.useId().replace(/:/g, '');
  const goldId = `bull-gold-${raw}`;
  const clipId = `bull-clip-${raw}`;
  const height = drip ? 138 : 116;

  return (
    <svg
      viewBox={`0 0 120 ${height}`}
      className={className}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      <defs>
        {/* One sweep of metal across the whole mark, so the drips continue the ring's shading. */}
        <linearGradient id={goldId} x1="0" y1="0" x2="0" y2={height} gradientUnits="userSpaceOnUse">
          {GOLD.map((stop) => (
            <stop key={stop.at} offset={stop.at} stopColor={stop.color} />
          ))}
        </linearGradient>
        <clipPath id={clipId}>
          <circle cx={CX} cy={CY} r={R - 9} />
        </clipPath>
      </defs>

      {/* Drips first, so the ring sits over where they leave it. */}
      {drip && DRIPS.map((d) => <path key={d.x} d={dripPath(d)} fill={`url(#${goldId})`} />)}

      <circle cx={CX} cy={CY} r={R} fill={`url(#${goldId})`} />
      <circle cx={CX} cy={CY} r={R - 4} fill="#0c0a07" />
      <circle
        cx={CX}
        cy={CY}
        r={R - 7}
        fill="none"
        stroke={`url(#${goldId})`}
        strokeWidth="0.9"
      />

      <image
        href="/brand/bull.webp"
        x={CX - 40}
        y={CY - 38}
        width="80"
        height="80"
        preserveAspectRatio="xMidYMid meet"
        clipPath={`url(#${clipId})`}
      />
    </svg>
  );
}
