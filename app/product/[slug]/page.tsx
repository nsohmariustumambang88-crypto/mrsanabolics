'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart,
  ShoppingBag,
  Check,
  Minus,
  Plus,
  Star,
  Truck,
  RotateCcw,
  ShieldCheck,
  ChevronRight,
  ZoomIn,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { useStore } from '@/components/providers/store-provider';
import { getProductBySlug, getRelatedProducts } from '@/lib/data/products';
import { formatPrice } from '@/lib/format';
import { cn } from '@/lib/utils';
import { ProductCard } from '@/components/product/product-card';
import { StarRating } from '@/components/product/star-rating';
import { StaggerGroup, StaggerItem } from '@/components/animations/motion';

export default function ProductPage() {
  const params = useParams<{ slug: string }>();
  const product = getProductBySlug(params.slug);
  const { addToCart, toggleWishlist, isWishlisted } = useStore();

  const [quantity, setQuantity] = React.useState(1);
  const [activeImage, setActiveImage] = React.useState(0);
  const [zoomed, setZoomed] = React.useState(false);
  const [added, setAdded] = React.useState(false);
  const [stickyVisible, setStickyVisible] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => setStickyVisible(window.scrollY > 600);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  React.useEffect(() => {
    setActiveImage(0);
    setQuantity(1);
  }, [params.slug]);

  if (!product) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-24 text-center">
        <h1 className="font-display text-3xl font-bold">Product not found</h1>
        <Button asChild className="mt-6 bg-accent text-black hover:bg-accent/90">
          <Link href="/shop">Back to Shop</Link>
        </Button>
      </div>
    );
  }

  const related = getRelatedProducts(product);
  const wished = isWishlisted(product.id);
  const discount = product.compareAtPrice
    ? Math.round((1 - product.price / product.compareAtPrice) * 100)
    : 0;

  const handleAdd = () => {
    addToCart(product, quantity);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 lg:px-6">
      <nav className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Link href="/" className="hover:text-foreground">Home</Link>
        <ChevronRight className="h-3 w-3" />
        <Link href="/shop" className="hover:text-foreground">Shop</Link>
        <ChevronRight className="h-3 w-3" />
        <Link href={`/shop?category=${product.categorySlug}`} className="hover:text-foreground">
          {product.category}
        </Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground">{product.name}</span>
      </nav>

      <div className="mt-6 grid gap-10 lg:grid-cols-2">
        {/* Gallery */}
        <div className="space-y-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="relative aspect-square overflow-hidden rounded-2xl border border-border/40 bg-background cursor-zoom-in"
            onMouseEnter={() => setZoomed(true)}
            onMouseLeave={() => setZoomed(false)}
          >
            <AnimatePresence mode="wait">
              <motion.img
                key={activeImage}
                src={product.images[activeImage]}
                alt={product.name}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className={cn(
                  'h-full w-full object-cover transition-transform duration-700',
                  zoomed && 'scale-150'
                )}
              />
            </AnimatePresence>
            <div className="absolute left-4 top-4 flex flex-col gap-2">
              {product.isNew && <Badge className="bg-accent text-black">NEW</Badge>}
              {discount > 0 && <Badge className="bg-destructive">-{discount}%</Badge>}
            </div>
            <div className="absolute bottom-4 right-4 flex h-9 w-9 items-center justify-center rounded-full glass">
              <ZoomIn className="h-4 w-4 text-muted-foreground" />
            </div>
          </motion.div>
          <div className="grid grid-cols-4 gap-3">
            {product.images.map((img, i) => (
              <button
                key={i}
                onClick={() => setActiveImage(i)}
                className={cn(
                  'relative aspect-square overflow-hidden rounded-xl border-2 bg-background transition-all duration-300',
                  activeImage === i ? 'border-accent' : 'border-border hover:border-border/80'
                )}
              >
                <img src={img} alt={`${product.name} ${i + 1}`} className="h-full w-full object-cover" />
                {activeImage === i && (
                  <motion.div
                    layoutId="activeThumb"
                    className="absolute inset-0 rounded-xl ring-2 ring-accent"
                  />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Info */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="flex items-center gap-2">
            <Link href={`/brands/${product.brandSlug}`} className="text-sm font-medium uppercase tracking-wider text-accent hover:underline">
              {product.brand}
            </Link>
            <span className="text-muted-foreground">·</span>
            <Link href={`/shop?category=${product.categorySlug}`} className="text-sm text-muted-foreground hover:text-foreground">
              {product.category}
            </Link>
          </div>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-tight md:text-4xl">
            {product.name}
          </h1>

          <div className="mt-3 flex items-center gap-3">
            <StarRating rating={product.rating} size="md" showValue />
            <span className="text-sm text-muted-foreground">
              {product.reviewCount} reviews
            </span>
          </div>

          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            {product.description}
          </p>

          <div className="mt-6 flex items-baseline gap-3">
            <span className="font-display text-4xl font-bold">{formatPrice(product.price)}</span>
            {product.compareAtPrice && (
              <span className="text-xl text-muted-foreground line-through">
                {formatPrice(product.compareAtPrice)}
              </span>
            )}
            {discount > 0 && (
              <Badge className="bg-accent/15 text-accent">Save {discount}%</Badge>
            )}
          </div>

          <div className="mt-4 flex items-center gap-2 text-sm">
            {product.inStock ? (
              <>
                <Check className="h-4 w-4 text-accent" />
                <span className="text-accent">In Stock</span>
                <span className="text-muted-foreground">
                  · {product.stockCount} units available
                </span>
              </>
            ) : (
              <span className="text-destructive">Out of Stock</span>
            )}
          </div>

          <Separator className="my-6" />

          <div className="flex items-center gap-3">
            <div className="flex items-center rounded-xl border border-border">
              <button
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="flex h-11 w-11 items-center justify-center rounded-l-xl text-muted-foreground transition-colors hover:text-foreground"
                aria-label="Decrease quantity"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-12 text-center font-semibold">{quantity}</span>
              <button
                onClick={() => setQuantity((q) => q + 1)}
                className="flex h-11 w-11 items-center justify-center rounded-r-xl text-muted-foreground transition-colors hover:text-foreground"
                aria-label="Increase quantity"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <Button
              onClick={handleAdd}
              disabled={!product.inStock}
              className="flex-1 gap-2 bg-accent text-base font-semibold text-black hover:bg-accent/90"
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
                    <Check className="h-5 w-5" /> Added to Cart
                  </motion.span>
                ) : (
                  <motion.span
                    key="add"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="flex items-center gap-2"
                  >
                    <ShoppingBag className="h-5 w-5" /> Add to Cart
                  </motion.span>
                )}
              </AnimatePresence>
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => toggleWishlist(product.id)}
              className={cn('h-11 w-11', wished && 'border-accent text-accent')}
            >
              <Heart className={cn('h-5 w-5', wished && 'fill-current')} />
            </Button>
          </div>

          <div className="mt-6 grid grid-cols-3 gap-3">
            {[
              { icon: Truck, label: 'Free shipping over $150' },
              { icon: ShieldCheck, label: 'Lab-verified purity' },
              { icon: RotateCcw, label: '14-day returns' },
            ].map((f) => (
              <div key={f.label} className="flex flex-col items-center gap-2 rounded-xl border border-border/30 bg-secondary/20 p-4 text-center">
                <f.icon className="h-5 w-5 text-accent" />
                <span className="text-xs text-muted-foreground">{f.label}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="mt-16"
      >
        <Tabs defaultValue="description">
          <TabsList className="flex w-full flex-wrap justify-start gap-1 bg-transparent p-0">
            {['description', 'specifications', 'reviews', 'shipping', 'faq'].map((t) => (
              <TabsTrigger
                key={t}
                value={t}
                className="data-[state=active]:bg-secondary capitalize"
              >
                {t === 'faq' ? 'FAQ' : t}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="description" className="mt-6">
            <div className="grid gap-8 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <h3 className="font-display text-xl font-bold">Overview</h3>
                <p className="mt-3 leading-relaxed text-muted-foreground">
                  {product.longDescription}
                </p>
                <h4 className="mt-8 font-semibold">Benefits</h4>
                <ul className="mt-3 space-y-2">
                  {product.benefits.map((b, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="font-semibold">Directions</h4>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {product.directions}
                </p>
                <h4 className="mt-6 font-semibold">Ingredients</h4>
                <ul className="mt-3 space-y-1.5">
                  {product.ingredients.map((ing, i) => (
                    <li key={i} className="text-sm text-muted-foreground">
                      · {ing}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="specifications" className="mt-6">
            <div className="overflow-hidden rounded-2xl border border-border/40">
              <table className="w-full text-sm">
                <tbody>
                  {product.specifications.map((s, i) => (
                    <tr key={i} className={i % 2 === 0 ? 'bg-secondary/30' : ''}>
                      <td className="w-1/3 px-4 py-3 font-medium">{s.label}</td>
                      <td className="px-4 py-3 text-muted-foreground">{s.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          <TabsContent value="reviews" className="mt-6">
            <div className="grid gap-8 lg:grid-cols-3">
              <div>
                <div className="rounded-2xl border border-border/40 bg-card p-6 text-center">
                  <p className="font-display text-5xl font-bold">{product.rating}</p>
                  <StarRating rating={product.rating} size="md" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    Based on {product.reviewCount} reviews
                  </p>
                </div>
              </div>
              <div className="space-y-4 lg:col-span-2">
                {product.reviews.map((r) => (
                  <div key={r.id} className="rounded-2xl border border-border/40 bg-card p-5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-accent to-emerald-600 font-display text-sm font-bold text-black">
                          {r.author.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-semibold">{r.author}</p>
                          <StarRating rating={r.rating} size="sm" />
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                    <h4 className="mt-3 font-semibold">{r.title}</h4>
                    <p className="mt-1 text-sm text-muted-foreground">{r.body}</p>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="shipping" className="mt-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="rounded-2xl border border-border/40 bg-card p-6">
                <Truck className="h-6 w-6 text-accent" />
                <h4 className="mt-3 font-semibold">Shipping</h4>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {product.shipping}
                </p>
              </div>
              <div className="rounded-2xl border border-border/40 bg-card p-6">
                <RotateCcw className="h-6 w-6 text-accent" />
                <h4 className="mt-3 font-semibold">Returns</h4>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {product.returns}
                </p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="faq" className="mt-6">
            <Accordion type="single" collapsible className="space-y-3">
              {product.faqs.map((f, i) => (
                <AccordionItem key={i} value={`item-${i}`} className="rounded-xl border border-border/40 px-4">
                  <AccordionTrigger className="text-sm font-medium hover:no-underline">
                    {f.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground">
                    {f.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </TabsContent>
        </Tabs>
      </motion.div>

      {/* Related */}
      {related.length > 0 && (
        <div className="mt-20">
          <h2 className="font-display text-2xl font-bold tracking-tight md:text-3xl">
            Related Products
          </h2>
          <StaggerGroup className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4" stagger={0.08}>
            {related.map((p) => (
              <StaggerItem key={p.id}>
                <ProductCard product={p} />
              </StaggerItem>
            ))}
          </StaggerGroup>
        </div>
      )}

      {/* Sticky add to cart */}
      <AnimatePresence>
        {stickyVisible && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed bottom-0 left-0 right-0 z-30 glass-strong border-t border-border/40"
          >
            <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 lg:px-6">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 overflow-hidden rounded-lg bg-background">
                  <img src={product.images[0]} alt={product.name} className="h-full w-full object-cover" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{product.name}</p>
                  <p className="text-sm font-bold text-accent">{formatPrice(product.price)}</p>
                </div>
              </div>
              <Button
                onClick={handleAdd}
                disabled={!product.inStock}
                className="gap-2 bg-accent text-black hover:bg-accent/90"
              >
                <ShoppingBag className="h-4 w-4" />
                Add to Cart
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
