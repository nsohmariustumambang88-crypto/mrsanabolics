import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { categories } from '@/lib/data/categories';

export const metadata = {
  title: 'Categories',
  description: 'Browse all MrAnabolics product categories.',
};

const iconMap: Record<string, string> = {
  Syringe: '💉', Pill: '💊', FlaskConical: '🧪', ShieldPlus: '🛡️',
  Dna: '🧬', Flame: '🔥', Activity: '📈', PackagePlus: '📦',
  TestTube: '⚗️', Boxes: '🗃️', Wrench: '🔧',
};

export default function CategoriesPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-16 lg:px-6">
      <div className="text-center">
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
          Browse
        </span>
        <h1 className="mt-3 font-display text-4xl font-bold tracking-tight md:text-5xl">
          All Categories
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
          Eleven specialized categories covering every stage of your research
          protocol.
        </p>
      </div>

      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((c) => (
          <Link
            key={c.slug}
            href={`/shop?category=${c.slug}`}
            className="group relative flex flex-col overflow-hidden rounded-2xl border border-border/50 bg-card p-6 transition-all duration-300 hover:border-accent/40 hover:bg-secondary/40"
          >
            <div className="absolute right-4 top-4 h-20 w-20 rounded-full bg-accent/5 transition-transform duration-500 group-hover:scale-150" />
            <div className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-secondary text-2xl">
              {iconMap[c.icon] || '🔬'}
            </div>
            <h3 className="relative mt-4 text-lg font-semibold">{c.name}</h3>
            <p className="relative mt-1.5 text-sm text-muted-foreground">{c.description}</p>
            <div className="relative mt-4 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{c.productCount} products</span>
              <ArrowRight className="h-4 w-4 text-muted-foreground transition-all group-hover:translate-x-1 group-hover:text-accent" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
