import { Globe } from 'lucide-react';
import type { CountryCode } from '@/lib/countries';
import { cn } from '@/lib/utils';

/*
  Flags, drawn here at 20×14 rather than taken from emoji.

  Emoji flags are not icons this build allows, and on Windows they do not render at all: the
  visitor sees the two letters "ES" in a box. These are simplified to what survives at 14px tall —
  the US has seven stripes and no stars, the Southern Cross is four dots — which is enough to
  recognise a flag at a glance, and the country code always sits beside it in text.

  Their colours are the flags' own and sit outside the ebru palette deliberately, the same way the
  owner's bull does: a flag in house pigments is not that country's flag.
*/

function Svg({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <svg
      viewBox="0 0 20 14"
      aria-hidden="true"
      focusable="false"
      className={cn('h-3.5 w-5 shrink-0 rounded-[2px] ring-1 ring-rule', className)}
    >
      {children}
    </svg>
  );
}

function UnionJack({ scale = 1 }: { scale?: number }) {
  return (
    <g transform={`scale(${scale})`}>
      <rect width="20" height="14" fill="#012169" />
      <path d="M0 0L20 14M20 0L0 14" stroke="#fff" strokeWidth="2.8" />
      <path d="M0 0L20 14M20 0L0 14" stroke="#C8102E" strokeWidth="1" />
      <path d="M10 0V14M0 7H20" stroke="#fff" strokeWidth="4" />
      <path d="M10 0V14M0 7H20" stroke="#C8102E" strokeWidth="2.4" />
    </g>
  );
}

export function CountryFlag({ code, className }: { code: CountryCode | null; className?: string }) {
  switch (code) {
    case 'US':
      return (
        <Svg className={className}>
          <rect width="20" height="14" fill="#fff" />
          {[0, 4, 8, 12].map((y) => (
            <rect key={y} y={y} width="20" height="2" fill="#B22234" />
          ))}
          <rect width="9" height="8" fill="#3C3B6E" />
        </Svg>
      );
    case 'GB':
      return (
        <Svg className={className}>
          <UnionJack />
        </Svg>
      );
    case 'CA':
      return (
        <Svg className={className}>
          <rect width="20" height="14" fill="#fff" />
          <rect width="5" height="14" fill="#D80621" />
          <rect x="15" width="5" height="14" fill="#D80621" />
          <path
            d="M10 2.6l.9 1.7 1-.5-.4 2.3 1.5-1.4.4.9 1.3-.3-.5 1.7.7.4-2.4 1.8.3.9-2.3-.3V11h-.6V9.8l-2.3.3.3-.9L5.6 7.4l.7-.4-.5-1.7 1.3.3.4-.9 1.5 1.4-.4-2.3 1 .5z"
            fill="#D80621"
          />
        </Svg>
      );
    case 'AU':
      return (
        <Svg className={className}>
          <rect width="20" height="14" fill="#012169" />
          <UnionJack scale={0.5} />
          <circle cx="5" cy="10.6" r="1.5" fill="#fff" />
          <circle cx="15" cy="2.6" r="0.75" fill="#fff" />
          <circle cx="12.3" cy="6.2" r="0.75" fill="#fff" />
          <circle cx="17.6" cy="5.6" r="0.75" fill="#fff" />
          <circle cx="15" cy="11.4" r="0.85" fill="#fff" />
        </Svg>
      );
    case 'ES':
      return (
        <Svg className={className}>
          <rect width="20" height="14" fill="#AA151B" />
          <rect y="3.5" width="20" height="7" fill="#F1BF00" />
        </Svg>
      );
    case 'FR':
      return (
        <Svg className={className}>
          <rect width="20" height="14" fill="#fff" />
          <rect width="6.67" height="14" fill="#0055A4" />
          <rect x="13.33" width="6.67" height="14" fill="#EF4135" />
        </Svg>
      );
    case 'DE':
      return (
        <Svg className={className}>
          <rect width="20" height="14" fill="#000" />
          <rect y="4.67" width="20" height="4.67" fill="#DD0000" />
          <rect y="9.33" width="20" height="4.67" fill="#FFCE00" />
        </Svg>
      );
    case 'IT':
      return (
        <Svg className={className}>
          <rect width="20" height="14" fill="#fff" />
          <rect width="6.67" height="14" fill="#009246" />
          <rect x="13.33" width="6.67" height="14" fill="#CE2B37" />
        </Svg>
      );
    default:
      return <Globe className={cn('h-3.5 w-5 shrink-0', className)} strokeWidth={1.6} aria-hidden="true" />;
  }
}
