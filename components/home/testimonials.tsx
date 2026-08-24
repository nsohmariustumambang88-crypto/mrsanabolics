'use client';

import { Star } from 'lucide-react';
import { SectionHeading } from '@/components/product/section-heading';
import type { Testimonial } from '@/lib/types';

/*
  Quotes sit on lifted sheets. The synthetic-fixture note is not optional: PRODUCT.md records
  these as authored demo content, and the surface that shows them is the surface that says so.
*/

export function Testimonials({ testimonials }: { testimonials: Testimonial[] }) {
  return (
    <section className="border-b border-rule">
      <div className="mx-auto max-w-[86rem] px-4 py-12 sm:px-6 sm:py-16 lg:px-10 lg:py-20">
        <SectionHeading
          title="What buyers report back"
          description="Feedback from customers who ordered, tested, and came back."
        />

        <div className="mt-8 sm:mt-10 grid gap-px bg-rule md:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((t) => (
            <figure key={t.id} className="flex flex-col bg-card p-5 sm:p-6 lg:p-7">
              <div
                className="flex gap-0.5"
                role="img"
                aria-label={`${t.rating} out of 5`}
              >
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={
                        i < t.rating
                        ? 'h-3.5 w-3.5 fill-pigment-saffron text-pigment-saffron'
                        : 'h-3.5 w-3.5 text-rule-strong'
                    }
                    strokeWidth={1.5}
                  />
                ))}
              </div>

              <blockquote className="mt-4 flex-1 sm:mt-5">
                <p className="text-sm leading-relaxed text-ink sm:text-base">
                  &ldquo;{t.quote}&rdquo;
                </p>
              </blockquote>

              <figcaption className="mt-5 border-t border-rule pt-4 sm:mt-6">
                <p className="text-sm font-medium">{t.name}</p>
                <p className="mt-0.5 font-mono text-2xs uppercase tracking-[0.14em] text-ink-faint">
                  {t.role} · {t.location}
                </p>
              </figcaption>
            </figure>
          ))}
        </div>

        <p className="mt-6 text-xs text-ink-faint">
          Demonstration content — these testimonials are authored fixtures for this portfolio
          build, not statements from real customers.
        </p>
      </div>
    </section>
  );
}
