'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { brands } from '@/lib/data/brands';
import { getProductsByBrand } from '@/lib/data/products';
import { ProductCard } from '@/components/product/product-card';

export default function BrandPage() {
  const params = useParams<{ slug: string }>();
  const brand = brands.find((b) => b.slug === params.slug);
  const products = getProductsByBrand(params.slug);

  if (!brand) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-24 text-center">
        <h1 className="font-display text-3xl font-bold">Brand not found</h1>
        <Link href="/brands" className="mt-6 inline-block text-accent hover:underline">
          Back to Brands
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 lg:px-6">
      <nav className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Link href="/" className="hover:text-foreground">Home</Link>
        <ChevronRight className="h-3 w-3" />
        <Link href="/brands" className="hover:text-foreground">Brands</Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground">{brand.name}</span>
      </nav>

      <div className="mt-6 flex items-center gap-5">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-accent to-emerald-600 font-display text-3xl font-bold text-black">
          {brand.name.charAt(0)}
        </div>
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight md:text-4xl">{brand.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{brand.productCount} products available</p>
        </div>
      </div>

      <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground">
        {brand.description}
      </p>

      <div className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>

      {products.length === 0 && (
        <div className="rounded-2xl border border-border/50 bg-card p-16 text-center text-muted-foreground">
          No products available from this brand yet.
        </div>
      )}
    </div>
  );
}
