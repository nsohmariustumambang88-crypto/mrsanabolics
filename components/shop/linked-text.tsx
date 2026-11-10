import { Fragment } from 'react';
import Link from 'next/link';

/*
  Renders copy written with [label](/path) links, as GROUP_NOTES and BRAND_INTROS in
  lib/catalogue/collection-copy.ts are. Only site-internal paths become links; anything else is
  left as the text it is, so a typo cannot turn into a link to somewhere unexpected. No HTML is
  injected: the text is split and each piece is a React child.
*/

const PART = /(\[[^\]]+\]\(\/[^)\s]*\))/g;
const ONE = /^\[([^\]]+)\]\((\/[^)\s]*)\)$/;

export function LinkedText({ text }: { text: string }) {
  return (
    <>
      {text.split(PART).map((part, i) => {
        const link = part.match(ONE);
        if (!link) return <Fragment key={i}>{part}</Fragment>;
        return (
          <Link
            key={i}
            href={link[2]}
            className="text-pigment-indigo underline decoration-rule-strong underline-offset-[3px] transition-colors hover:decoration-pigment-indigo"
          >
            {link[1]}
          </Link>
        );
      })}
    </>
  );
}
