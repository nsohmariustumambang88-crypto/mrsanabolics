'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Quote, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { testimonials } from '@/lib/data/testimonials';
import { SectionHeading } from '@/components/product/section-heading';

export function Testimonials() {
  const [index, setIndex] = React.useState(0);
  const [direction, setDirection] = React.useState(0);
  const visible = 3;
  const maxIndex = Math.max(0, testimonials.length - visible);

  const next = () => {
    setDirection(1);
    setIndex((i) => Math.min(i + 1, maxIndex));
  };
  const prev = () => {
    setDirection(-1);
    setIndex((i) => Math.max(i - 1, 0));
  };

  return (
    <section className="relative overflow-hidden py-20">
      <div className="absolute inset-0 grid-bg grid-bg-fade opacity-15" />
      <div className="relative mx-auto max-w-7xl px-4 lg:px-6">
        <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
          <SectionHeading
            eyebrow="Social Proof"
            title="What Our Customers Say"
            description="Real reviews from athletes, researchers, and professionals who trust MrAnabolics."
          />
          <div className="hidden gap-2 md:flex">
            <Button variant="outline" size="icon" onClick={prev} disabled={index === 0}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={next} disabled={index >= maxIndex}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="mt-10 overflow-hidden">
          <motion.div
            className="flex"
            animate={{ x: `-${index * (100 / visible)}%` }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            {testimonials.map((t) => (
              <div
                key={t.id}
                className="w-full shrink-0 px-2"
                style={{ width: `${100 / visible}%` }}
              >
                <div className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-border/40 bg-card p-6 transition-colors hover:border-accent/20">
                  <Quote className="h-8 w-8 text-accent/20" />
                  <div className="mt-3 flex">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star
                        key={i}
                        className={
                          i <= t.rating
                            ? 'h-4 w-4 fill-amber-400 text-amber-400'
                            : 'h-4 w-4 fill-muted text-muted'
                        }
                      />
                    ))}
                  </div>
                  <p className="mt-4 flex-1 text-sm leading-relaxed text-muted-foreground">
                    &ldquo;{t.quote}&rdquo;
                  </p>
                  <div className="mt-6 flex items-center gap-3 border-t border-border/30 pt-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-accent to-emerald-600 font-display text-sm font-bold text-black">
                      {t.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{t.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {t.role} · {t.location}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Progress dots */}
        <div className="mt-6 flex justify-center gap-2">
          {Array.from({ length: maxIndex + 1 }).map((_, i) => (
            <button
              key={i}
              onClick={() => {
                setDirection(i > index ? 1 : -1);
                setIndex(i);
              }}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === index ? 'w-8 bg-accent' : 'w-1.5 bg-border'
              }`}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
