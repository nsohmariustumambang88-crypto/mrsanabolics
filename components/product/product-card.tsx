'use client';

import * as React from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, ShoppingBag, Star, Check, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useStore } from '@/components/providers/store-provider';
import { formatPrice } from '@/lib/format';
import type { Product } from '@/lib/types';
import { cn } from '@/lib/utils';

export function ProductCard({ product }: { product: Product }) {
  const { addToCart, toggleWishlist, isWishlisted } = useStore();
  const [added, setAdded] = React.useState(false);
  const [hovered, setHovered] = React.useState(false);
  const wished = isWishlisted(product.id);

  const discount = product.compareAtPrice
    ? Math.round((1 - product.price / product.compareAtPrice) * 100)
    : 0;

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart(product, 1);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  const handleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist(product.id);
  };

  return (
    <motion.div
      whileHover={{ y: -6 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-border/40 bg-card card-hover hover:border-accent/30 hover:shadow-2xl hover:shadow-black/50"
    >
      <Link
        href={`/product/${product.slug}`}
        className="relative aspect-square overflow-hidden bg-background"
      >
        {/* Image with crossfade on hover */}
        <img
          src={product.images[0]}
          alt={product.name}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
        />
        {product.images[1] && (
          <img
            src={product.images[1]}
            alt={product.name}
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100"
          />
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-card/80 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

        {/* Badges */}
        <div className="absolute left-3 top-3 flex flex-col gap-1.5">
          {product.isNew && (
            <Badge className="bg-accent text-[10px] font-bold text-black shadow-lg">
              NEW
            </Badge>
          )}
          {discount > 0 && (
            <Badge className="bg-destructive text-[10px] font-bold shadow-lg">
              -{discount}%
            </Badge>
          )}
          {product.isBestSeller && (
            <Badge className="bg-amber-500 text-[10px] font-bold text-black shadow-lg">
              BESTSELLER
            </Badge>
          )}
        </div>

        {/* Quick view on hover */}
        <AnimatePresence>
          {hovered && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.2 }}
              className="absolute bottom-3 left-3 right-3 flex items-center justify-center gap-1.5 rounded-xl glass-strong px-3 py-2 text-xs font-medium text-muted-foreground"
            >
              <Eye className="h-3.5 w-3.5" />
              Quick View
            </motion.div>
          )}
        </AnimatePresence>

        {!product.inStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <span className="text-sm font-semibold text-muted-foreground">
              Out of Stock
            </span>
          </div>
        )}
      </Link>

      {/* Wishlist button */}
      <button
        onClick={handleWishlist}
        className={cn(
          'absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full border backdrop-blur transition-all duration-300',
          wished
            ? 'border-accent bg-accent/20 text-accent'
            : 'border-white/10 bg-background/60 text-muted-foreground hover:text-foreground'
        )}
        aria-label="Toggle wishlist"
      >
        <Heart className={cn('h-4 w-4 transition-transform', wished && 'fill-current scale-110')} />
      </button>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-center justify-between">
          <Link href={`/brands/${product.brandSlug}`} className="text-xs font-medium uppercase tracking-wider text-accent transition-colors hover:underline">
            {product.brand}
          </Link>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
            <span className="font-medium">{product.rating}</span>
            <span className="text-muted-foreground/60">({product.reviewCount})</span>
          </div>
        </div>
        <Link href={`/product/${product.slug}`}>
          <h3 className="mt-1.5 line-clamp-2 text-sm font-semibold leading-snug transition-colors hover:text-accent">
            {product.name}
          </h3>
        </Link>
        <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
          {product.category}
        </p>

        <div className="mt-3 flex items-end justify-between">
          <div className="flex flex-col">
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-bold">
                {formatPrice(product.price)}
              </span>
              {product.compareAtPrice && (
                <span className="text-sm text-muted-foreground line-through">
                  {formatPrice(product.compareAtPrice)}
                </span>
              )}
            </div>
            {product.inStock && product.stockCount < 60 && (
              <span className="mt-0.5 text-[10px] text-amber-500/80">
                Only {product.stockCount} left
              </span>
            )}
          </div>
        </div>

        <Button
          onClick={handleAdd}
          disabled={!product.inStock}
          className={cn(
            'mt-3 w-full gap-2 transition-all duration-300',
            added
              ? 'bg-accent text-black hover:bg-accent'
              : 'bg-secondary text-foreground hover:bg-secondary/70'
          )}
        >
          <AnimatePresence mode="wait">
            {added ? (
              <motion.span
                key="added"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="flex items-center gap-2"
              >
                <Check className="h-4 w-4" /> Added
              </motion.span>
            ) : (
              <motion.span
                key="add"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="flex items-center gap-2"
              >
                <ShoppingBag className="h-4 w-4" /> Add to Cart
              </motion.span>
            )}
          </AnimatePresence>
        </Button>
      </div>
    </motion.div>
  );
}
