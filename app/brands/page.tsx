import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { brands } from '@/lib/data/brands';

export const metadata = {
  title: 'Brands',
  description: 'Browse all MrAnabolics partner brands.',
};

export default function BrandsPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-16 lg:px-6">
      <div className="text-center">
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
          Trusted Manufacturers
        </span>
        <h1 className="mt-3 font-display text-4xl font-bold tracking-tight md:text-5xl">
          All Brands
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
          We partner exclusively with GMP-certified manufacturers that meet our
          uncompromising standards.
        </p>
      </div>

      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {brands.map((b) => (
          <Link
            key={b.slug}
            href={`/brands/${b.slug}`}
            className="group relative flex flex-col overflow-hidden rounded-2xl border border-border/50 bg-card p-6 transition-all duration-300 hover:border-accent/40 hover:bg-secondary/40"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-secondary to-secondary/50 font-display text-2xl font-bold text-accent">
                {b.name.charAt(0)}
              </div>
              <div>
                <h3 className="text-lg font-semibold">{b.name}</h3>
                <p className="text-xs text-muted-foreground">{b.productCount} products</p>
              </div>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{b.description}</p>
            <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-accent">
              View Products
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
