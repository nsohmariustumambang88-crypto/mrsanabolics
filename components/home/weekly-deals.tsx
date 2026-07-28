'use client';

import * as React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SectionHeading } from '@/components/product/section-heading';
import { ProductCard } from '@/components/product/product-card';
import { StaggerGroup, StaggerItem } from '@/components/animations/motion';
import type { Product } from '@/lib/types';

function useCountdown(hoursFromNow: number) {
  const [target] = React.useState(() => {
    const d = new Date();
    d.setHours(d.getHours() + hoursFromNow);
    d.setMinutes(0, 0, 0);
    return d.getTime();
  });
  const [remaining, setRemaining] = React.useState(target - Date.now());
  React.useEffect(() => {
    const t = setInterval(() => setRemaining(target - Date.now()), 1000);
    return () => clearInterval(t);
  }, [target]);
  const total = Math.max(0, remaining);
  const days = Math.floor(total / (1000 * 60 * 60 * 24));
  const hours = Math.floor((total / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((total / (1000 * 60)) % 60);
  const seconds = Math.floor((total / 1000) % 60);
  return { days, hours, minutes, seconds };
}

function TimeBox({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border border-border/50 bg-secondary/50 font-display text-2xl font-bold tabular-nums backdrop-blur md:h-20 md:w-20 md:text-3xl">
        <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent" />
        <span className="relative">{String(value).padStart(2, '0')}</span>
      </div>
      <span className="mt-2 text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
    </div>
  );
}

export function WeeklyDeals({ products }: { products: Product[] }) {
  const { days, hours, minutes, seconds } = useCountdown(72);

  return (
    <section className="relative overflow-hidden bg-black py-24">
      <div className="absolute inset-0 grid-bg grid-bg-fade opacity-20" />
      <div className="absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent-glow blur-3xl" />
      <div className="relative mx-auto max-w-7xl px-4 lg:px-6">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="relative overflow-hidden rounded-3xl border border-border/30 bg-gradient-to-br from-secondary/40 via-card/40 to-transparent p-8 backdrop-blur md:p-14"
        >
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/40 to-transparent" />
          <div className="flex flex-col items-center text-center">
            <Badge className="bg-destructive/15 text-destructive">
              <Clock className="mr-1 h-3 w-3" /> Limited Time
            </Badge>
            <h2 className="mt-5 font-display text-4xl font-bold tracking-tight md:text-5xl">
              Weekly Deals
            </h2>
            <p className="mt-3 max-w-md text-sm text-muted-foreground md:text-base">
              Save up to 30% on selected premium products. Offers expire when
              the timer hits zero.
            </p>
            <div className="mt-10 flex items-center gap-3 md:gap-4">
              <TimeBox value={days} label="Days" />
              <span className="font-display text-3xl font-bold text-muted-foreground/40">:</span>
              <TimeBox value={hours} label="Hours" />
              <span className="font-display text-3xl font-bold text-muted-foreground/40">:</span>
              <TimeBox value={minutes} label="Mins" />
              <span className="font-display text-3xl font-bold text-muted-foreground/40">:</span>
              <TimeBox value={seconds} label="Secs" />
            </div>
            <Button
              asChild
              className="group mt-10 gap-2 bg-accent font-semibold text-black hover:bg-accent/90"
            >
              <Link href="/shop?filter=deals">
                Shop All Deals
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
          </div>
        </motion.div>

        <StaggerGroup className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4" stagger={0.07}>
          {products.map((p) => (
            <StaggerItem key={p.id}>
              <ProductCard product={p} />
            </StaggerItem>
          ))}
        </StaggerGroup>
      </div>
    </section>
  );
}
