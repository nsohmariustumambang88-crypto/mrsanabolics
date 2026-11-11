import Link from 'next/link';
import type { RenderedNote } from '@/lib/catalogue/product-notes';

/*
  "From the shop": the note written for this one product (lib/catalogue/product-notes.ts).

  A server component, handed to <ProductDetail> as a ready element, so the note is in the first
  HTML response and adds nothing to the client bundle. Plain paragraphs and real links; the
  heading says who wrote it and the closing line says what it was written from, because a note
  in the shop's voice must never read as a customer's.

  The two columns sit on the product hero's grid: the heading under the photograph, the text
  under the buy panel, with the hero's vertical rule carried down between them.
*/

const DATE = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

export function ProductNote({ note }: { note: RenderedNote }) {
  return (
    <section aria-labelledby="from-the-shop" className="border-b border-rule">
      <div className="mx-auto grid max-w-[86rem] lg:grid-cols-2">
        <div className="border-rule px-4 pt-10 sm:px-6 lg:border-r lg:px-10 lg:py-14">
          <h2 id="from-the-shop" className="font-display text-2xl font-semibold tracking-[-0.03em]">
            From the shop
          </h2>
          <p className="measure mt-3 text-sm leading-relaxed text-ink-soft">
            Written by MrsAnabolics for this listing.
          </p>
        </div>

        <div className="px-4 pb-10 pt-5 sm:px-6 lg:px-10 lg:py-14">
          {note.paragraphs.map((paragraph, i) => (
            <p
              key={i}
              className={`measure text-sm leading-relaxed ${i === 0 ? 'text-ink' : 'mt-4 text-ink-soft'}`}
            >
              {paragraph.map((segment, j) =>
                typeof segment === 'string' ? (
                  segment
                ) : (
                  <Link
                    key={j}
                    href={segment.href}
                    className="text-pigment-indigo underline decoration-rule-strong underline-offset-[3px] transition-colors hover:decoration-pigment-indigo"
                  >
                    {segment.text}
                  </Link>
                )
              )}
            </p>
          ))}
          <p className="measure mt-6 border-t border-rule pt-4 text-xs leading-relaxed text-ink-faint">
            Read from the pack in our photograph and our own listing on{' '}
            <time dateTime={note.checked}>{DATE.format(new Date(note.checked))}</time>. Any price per
            milligram is worked out from today’s price.
          </p>
        </div>
      </div>
    </section>
  );
}
