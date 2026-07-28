'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { brands } from '@/lib/data/brands';
import { SectionHeading } from '@/components/product/section-heading';
import { StaggerGroup, StaggerItem } from '@/components/animations/motion';

export function PopularBrands() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 lg:px-6">
      <SectionHeading
        eyebrow="Trusted Manufacturers"
        title="Popular Brands"
        description="We partner exclusively with GMP-certified manufacturers that meet our uncompromising standards."
        href="/brands"
      />
      <StaggerGroup className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-4" stagger={0.06}>
        {brands.slice(0, 8).map((b) => (
          <StaggerItem key={b.slug}>
            <Link
              href={`/brands/${b.slug}`}
              className="group relative flex flex-col items-center justify-center overflow-hidden rounded-2xl border border-border/40 bg-card p-8 text-center transition-all duration-500 hover:border-accent/30 hover:bg-secondary/30"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-accent/0 to-accent/0 transition-all duration-500 group-hover:from-accent/5 group-hover:to-transparent" />
              <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-secondary to-secondary/30 font-display text-3xl font-bold text-accent transition-transform duration-500 group-hover:scale-110">
                {b.name.charAt(0)}
              </div>
              <h3 className="relative mt-4 text-base font-semibold">{b.name}</h3>
              <p className="relative mt-1 text-xs text-muted-foreground">
                {b.productCount} products
              </p>
              <span className="relative mt-3 inline-flex items-center gap-1 text-xs font-medium text-accent opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                View Products <ArrowRight className="h-3 w-3" />
              </span>
            </Link>
          </StaggerItem>
        ))}
      </StaggerGroup>
    </section>
  );
}
