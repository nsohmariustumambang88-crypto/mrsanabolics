'use client';

import * as React from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  SlidersHorizontal,
  LayoutGrid,
  List,
  X,
  Star,
  Heart,
  ShoppingBag,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { ProductCard } from '@/components/product/product-card';
import { ProductGridSkeleton } from '@/components/ui/skeleton';
import { useStore } from '@/components/providers/store-provider';
import { products } from '@/lib/data/products';
import { categories } from '@/lib/data/categories';
import { brands } from '@/lib/data/brands';
import { formatPrice } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Product } from '@/lib/types';

const sortOptions = [
  { value: 'newest', label: 'Newest' },
  { value: 'popularity', label: 'Popularity' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
  { value: 'rating', label: 'Top Rated' },
];

export default function ShopPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const category = searchParams.get('category') || '';
  const brand = searchParams.get('brand') || '';
  const filter = searchParams.get('filter') || '';
  const q = searchParams.get('q') || '';
  const sort = searchParams.get('sort') || 'newest';
  const view = (searchParams.get('view') as 'grid' | 'list') || 'grid';

  const [maxPrice, setMaxPrice] = React.useState(300);
  const [minRating, setMinRating] = React.useState(0);
  const [inStockOnly, setInStockOnly] = React.useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  const updateParams = (updates: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([k, v]) => {
      if (v) params.set(k, v);
      else params.delete(k);
    });
    setLoading(true);
    router.push(`/shop?${params.toString()}`);
    setTimeout(() => setLoading(false), 400);
  };

  const filtered = React.useMemo(() => {
    let list = [...products];
    if (category) list = list.filter((p) => p.categorySlug === category);
    if (brand) list = list.filter((p) => p.brandSlug === brand);
    if (q) {
      const query = q.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.brand.toLowerCase().includes(query) ||
          p.category.toLowerCase().includes(query)
      );
    }
    if (filter === 'best-sellers') list = list.filter((p) => p.isBestSeller);
    if (filter === 'new') list = list.filter((p) => p.isNew);
    if (filter === 'trending') list = list.filter((p) => p.isTrending);
    if (filter === 'deals') list = list.filter((p) => p.isDeal);
    list = list.filter((p) => p.price <= maxPrice);
    list = list.filter((p) => p.rating >= minRating);
    if (inStockOnly) list = list.filter((p) => p.inStock);

    switch (sort) {
      case 'popularity':
        list.sort((a, b) => b.reviewCount - a.reviewCount);
        break;
      case 'price-asc':
        list.sort((a, b) => a.price - b.price);
        break;
      case 'price-desc':
        list.sort((a, b) => b.price - a.price);
        break;
      case 'rating':
        list.sort((a, b) => b.rating - a.rating);
        break;
      default:
        list.sort((a, b) => (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0));
    }
    return list;
  }, [category, brand, filter, q, sort, maxPrice, minRating, inStockOnly]);

  const activeCategory = categories.find((c) => c.slug === category);
  const activeBrand = brands.find((b) => b.slug === brand);

  const FilterContent = () => (
    <div className="space-y-8">
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Category
        </h3>
        <div className="mt-3 space-y-1">
          <button
            onClick={() => updateParams({ category: '' })}
            className={cn(
              'block w-full rounded-lg px-3 py-2 text-left text-sm transition-colors',
              !category ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            All Categories
          </button>
          {categories.map((c) => (
            <button
              key={c.slug}
              onClick={() => updateParams({ category: c.slug })}
              className={cn(
                'flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors',
                category === c.slug ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {c.name}
              <span className="text-xs text-muted-foreground/60">{c.productCount}</span>
            </button>
          ))}
        </div>
      </div>

      <Separator />

      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Brand
        </h3>
        <div className="mt-3 space-y-1">
          <button
            onClick={() => updateParams({ brand: '' })}
            className={cn(
              'block w-full rounded-lg px-3 py-2 text-left text-sm transition-colors',
              !brand ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            All Brands
          </button>
          {brands.map((b) => (
            <button
              key={b.slug}
              onClick={() => updateParams({ brand: b.slug })}
              className={cn(
                'flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors',
                brand === b.slug ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {b.name}
            </button>
          ))}
        </div>
      </div>

      <Separator />

      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Price Range
        </h3>
        <p className="mt-3 text-sm font-medium">
          Up to {formatPrice(maxPrice)}
        </p>
        <input
          type="range"
          min={20}
          max={300}
          step={10}
          value={maxPrice}
          onChange={(e) => setMaxPrice(Number(e.target.value))}
          className="mt-2 w-full accent-accent"
        />
      </div>

      <Separator />

      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Rating
        </h3>
        <div className="mt-3 space-y-1">
          {[0, 4, 4.5, 4.8].map((r) => (
            <button
              key={r}
              onClick={() => setMinRating(r)}
              className={cn(
                'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors',
                minRating === r ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {r === 0 ? (
                'All Ratings'
              ) : (
                <>
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  {r}+ stars
                </>
              )}
            </button>
          ))}
        </div>
      </div>

      <Separator />

      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Availability
        </h3>
        <label className="mt-3 flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 transition-colors hover:bg-secondary/50">
          <input
            type="checkbox"
            checked={inStockOnly}
            onChange={(e) => setInStockOnly(e.target.checked)}
            className="h-4 w-4 accent-accent"
          />
          <span className="text-sm">In stock only</span>
        </label>
      </div>
    </div>
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 lg:px-6">
      <div className="mb-8">
        <nav className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>Home</span>
          <span>/</span>
          <span className="text-foreground">Shop</span>
        </nav>
        <h1 className="mt-3 font-display text-4xl font-bold tracking-tight md:text-5xl">
          {activeCategory ? activeCategory.name : activeBrand ? activeBrand.name : 'All Products'}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          {activeCategory
            ? activeCategory.description
            : activeBrand
            ? activeBrand.description
            : 'Browse our complete catalog of premium, lab-tested performance supplements.'}
        </p>
      </div>

      <div className="flex gap-8">
        <aside className="hidden w-64 shrink-0 lg:block">
          <div className="sticky top-24">
            <FilterContent />
          </div>
        </aside>

        <div className="flex-1">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              Showing <span className="font-medium text-foreground">{filtered.length}</span> products
            </p>
            <div className="flex items-center gap-2">
              <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm" className="lg:hidden">
                    <SlidersHorizontal className="mr-2 h-4 w-4" />
                    Filters
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[320px] overflow-y-auto">
                  <SheetHeader>
                    <SheetTitle>Filters</SheetTitle>
                  </SheetHeader>
                  <div className="px-4 pb-8">
                    <FilterContent />
                  </div>
                </SheetContent>
              </Sheet>

              <Select value={sort} onValueChange={(v) => updateParams({ sort: v })}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  {sortOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex items-center rounded-lg border border-border">
                <button
                  onClick={() => updateParams({ view: 'grid' })}
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-l-lg transition-colors',
                    view === 'grid' ? 'bg-secondary text-foreground' : 'text-muted-foreground'
                  )}
                  aria-label="Grid view"
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
                <button
                  onClick={() => updateParams({ view: 'list' })}
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-r-lg transition-colors',
                    view === 'list' ? 'bg-secondary text-foreground' : 'text-muted-foreground'
                  )}
                  aria-label="List view"
                >
                  <List className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {(category || brand || filter || q) && (
            <div className="mb-6 flex flex-wrap items-center gap-2">
              {category && (
                <Badge variant="secondary" className="gap-1">
                  {activeCategory?.name}
                  <button onClick={() => updateParams({ category: '' })}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {brand && (
                <Badge variant="secondary" className="gap-1">
                  {activeBrand?.name}
                  <button onClick={() => updateParams({ brand: '' })}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {filter && (
                <Badge variant="secondary" className="gap-1 capitalize">
                  {filter.replace('-', ' ')}
                  <button onClick={() => updateParams({ filter: '' })}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {q && (
                <Badge variant="secondary" className="gap-1">
                  &ldquo;{q}&rdquo;
                  <button onClick={() => updateParams({ q: '' })}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
            </div>
          )}

          {loading ? (
            <ProductGridSkeleton count={8} />
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-border/40 bg-card py-24 text-center">
              <p className="text-lg font-semibold">No products found</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Try adjusting your filters or search terms.
              </p>
              <Button
                onClick={() => router.push('/shop')}
                className="mt-4 bg-accent text-black hover:bg-accent/90"
              >
                Clear All Filters
              </Button>
            </div>
          ) : view === 'grid' ? (
            <motion.div
              layout
              className="grid grid-cols-2 gap-4 md:grid-cols-3"
            >
              <AnimatePresence mode="popLayout">
                {filtered.map((p) => (
                  <motion.div
                    key={p.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <ProductCard product={p} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          ) : (
            <div className="space-y-4">
              {filtered.map((p) => (
                <ListProductRow key={p.id} product={p} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ListProductRow({ product }: { product: Product }) {
  const { addToCart, toggleWishlist, isWishlisted } = useStore();
  const [added, setAdded] = React.useState(false);
  const wished = isWishlisted(product.id);

  const handleAdd = () => {
    addToCart(product, 1);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  const discount = product.compareAtPrice
    ? Math.round((1 - product.price / product.compareAtPrice) * 100)
    : 0;

  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className="flex flex-col gap-4 rounded-2xl border border-border/40 bg-card p-4 transition-colors hover:border-accent/30 sm:flex-row"
    >
      <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-background sm:w-40">
        <img
          src={product.images[0]}
          alt={product.name}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-700 hover:scale-110"
        />
        {discount > 0 && (
          <Badge className="absolute left-2 top-2 bg-destructive text-[10px] font-bold">
            -{discount}%
          </Badge>
        )}
      </div>
      <div className="flex flex-1 flex-col">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-wider text-accent">
            {product.brand}
          </span>
          <span className="text-xs text-muted-foreground">·</span>
          <span className="text-xs text-muted-foreground">{product.category}</span>
        </div>
        <h3 className="mt-1 text-lg font-semibold">{product.name}</h3>
        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
          {product.description}
        </p>
        <div className="mt-2 flex items-center gap-1 text-xs">
          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
          <span className="font-medium">{product.rating}</span>
          <span className="text-muted-foreground">({product.reviewCount} reviews)</span>
          {product.inStock ? (
            <span className="ml-3 flex items-center gap-1 text-accent">
              <Check className="h-3.5 w-3.5" /> In Stock
            </span>
          ) : (
            <span className="ml-3 text-destructive">Out of Stock</span>
          )}
        </div>
        <div className="mt-auto flex items-center justify-between pt-4">
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold">{formatPrice(product.price)}</span>
            {product.compareAtPrice && (
              <span className="text-sm text-muted-foreground line-through">
                {formatPrice(product.compareAtPrice)}
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => toggleWishlist(product.id)}
              className={cn(wished && 'border-accent text-accent')}
            >
              <Heart className={cn('h-4 w-4', wished && 'fill-current')} />
            </Button>
            <Button
              onClick={handleAdd}
              disabled={!product.inStock}
              className={cn(
                'gap-2',
                added ? 'bg-accent text-black' : 'bg-secondary text-foreground hover:bg-secondary/70'
              )}
            >
              {added ? (
                <>
                  <Check className="h-4 w-4" /> Added
                </>
              ) : (
                <>
                  <ShoppingBag className="h-4 w-4" /> Add to Cart
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
