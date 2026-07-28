'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { categories } from '@/lib/data/categories';
import { SectionHeading } from '@/components/product/section-heading';
import { StaggerGroup, StaggerItem } from '@/components/animations/motion';

const iconMap: Record<string, string> = {
  Syringe: '💉', Pill: '💊', FlaskConical: '🧪', ShieldPlus: '🛡️',
  Dna: '🧬', Flame: '🔥', Activity: '📈', PackagePlus: '📦',
  TestTube: '⚗️', Boxes: '🗃️', Wrench: '🔧',
};

export function FeaturedCategories() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-20 lg:px-6">
      <SectionHeading
        eyebrow="Browse"
        title="Featured Categories"
        description="Eleven specialized categories covering every stage of your research protocol."
        href="/categories"
      />
      <StaggerGroup className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4" stagger={0.06}>
        {categories.slice(0, 8).map((c) => (
          <StaggerItem key={c.slug}>
            <Link
              href={`/shop?category=${c.slug}`}
              className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border/40 bg-card p-6 transition-all duration-500 hover:border-accent/30 hover:bg-secondary/30"
            >
              <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-accent/5 transition-all duration-700 group-hover:scale-[2] group-hover:bg-accent/10" />
              <div className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-secondary text-2xl transition-transform duration-500 group-hover:scale-110">
                {iconMap[c.icon] || '🔬'}
              </div>
              <h3 className="relative mt-4 text-base font-semibold">{c.name}</h3>
              <p className="relative mt-1 line-clamp-2 text-xs text-muted-foreground">
                {c.description}
              </p>
              <div className="relative mt-4 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {c.productCount} products
                </span>
                <div className="flex h-7 w-7 items-center justify-center rounded-full border border-border/40 transition-all duration-300 group-hover:border-accent group-hover:bg-accent group-hover:text-black">
                  <ArrowRight className="h-3.5 w-3.5" />
                </div>
              </div>
            </Link>
          </StaggerItem>
        ))}
      </StaggerGroup>
    </section>
  );
}
