'use client';

import * as React from 'react';
import Link from 'next/link';
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion';
import { ArrowRight, ShieldCheck, Star, Zap, FlaskConical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MagneticButton } from '@/components/animations/motion';

const stats = [
  { value: '50K+', label: 'Orders shipped' },
  { value: '99.2%', label: 'Avg. purity' },
  { value: '40+', label: 'Countries' },
  { value: '4.9/5', label: 'Customer rating' },
];

const heroImage = 'https://images.pexels.com/photos/3683099/pexels-photo-3683099.jpeg?auto=compress&cs=tinysrgb&w=800';

export function Hero() {
  const reduce = useReducedMotion();
  const containerRef = React.useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end start'],
  });

  const y = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : 150]);
  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], [1, reduce ? 1 : 1.1]);
  const imageY = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : -80]);
  const imageScale = useTransform(scrollYProgress, [0, 1], [1, reduce ? 1 : 1.15]);

  return (
    <section ref={containerRef} className="relative overflow-hidden">
      <div className="absolute inset-0 grid-bg grid-bg-fade opacity-50" />
      <div className="absolute left-1/2 top-0 h-[700px] w-[1000px] -translate-x-1/2 rounded-full bg-accent-glow blur-3xl" />
      <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-background to-transparent" />

      <motion.div style={{ y, opacity, scale }} className="relative mx-auto max-w-7xl px-4 py-24 lg:px-6 lg:py-32">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          {/* Left: content */}
          <div className="text-center lg:text-left">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-secondary/30 px-4 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur"
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
              </span>
              Lab-tested · Third-party verified · Discreet shipping
            </motion.div>

            <h1 className="mt-6 font-display text-5xl font-extrabold leading-[1.02] tracking-tight md:text-7xl">
              <span className="block overflow-hidden">
                <motion.span
                  className="block"
                  initial={{ y: '100%' }}
                  animate={{ y: '0%' }}
                  transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                >
                  Premium performance
                </motion.span>
              </span>
              <span className="block overflow-hidden">
                <motion.span
                  className="block text-gradient-accent"
                  initial={{ y: '100%' }}
                  animate={{ y: '0%' }}
                  transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                >
                  without compromise
                </motion.span>
              </span>
            </h1>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="mx-auto mt-6 max-w-lg text-base leading-relaxed text-muted-foreground lg:mx-0 md:text-lg"
            >
              Pharmaceutical-grade compounds, independently tested for purity
              and potency. Trusted by elite athletes and researchers in over 40
              countries.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.45, ease: [0.16, 1, 0.3, 1] }}
              className="mt-8 flex flex-col items-center gap-3 sm:flex-row lg:justify-start justify-center"
            >
              <MagneticButton>
                <Button
                  asChild
                  size="lg"
                  className="group relative gap-2 overflow-hidden bg-accent px-8 text-base font-semibold text-black hover:bg-accent/90"
                >
                  <Link href="/shop">
                    <span className="relative z-10 flex items-center gap-2">
                      Shop Now
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </span>
                  </Link>
                </Button>
              </MagneticButton>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-border/50 bg-secondary/20 backdrop-blur hover:bg-secondary/40"
              >
                <Link href="/categories">Explore Categories</Link>
              </Button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-xs text-muted-foreground lg:justify-start"
            >
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-accent" /> GMP-certified
              </span>
              <span className="flex items-center gap-1.5">
                <Star className="h-4 w-4 text-accent" /> 4.9/5 from 12,000+ reviews
              </span>
              <span className="flex items-center gap-1.5">
                <Zap className="h-4 w-4 text-accent" /> 24h dispatch
              </span>
            </motion.div>
          </div>

          {/* Right: floating product visual */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="relative hidden lg:block"
          >
            <motion.div
              style={{ y: imageY, scale: imageScale }}
              className="relative"
            >
              {/* Glow ring */}
              <div className="absolute left-1/2 top-1/2 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/10 blur-3xl" />

              {/* Main product card */}
              <motion.div
                animate={reduce ? {} : { y: [0, -16, 0] }}
                transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
                className="relative z-10 overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-secondary/60 to-card shadow-2xl shadow-black/60"
              >
                <div className="relative aspect-[4/5] overflow-hidden">
                  <img
                    src={heroImage}
                    alt="Premium performance supplement"
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />

                  {/* Floating spec badges */}
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.8, duration: 0.6 }}
                    className="absolute left-4 top-4 flex items-center gap-2 rounded-xl glass px-3 py-2"
                  >
                    <FlaskConical className="h-4 w-4 text-accent" />
                    <span className="text-xs font-semibold">99.2% Pure</span>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 1, duration: 0.6 }}
                    className="absolute right-4 top-20 flex items-center gap-2 rounded-xl glass px-3 py-2"
                  >
                    <ShieldCheck className="h-4 w-4 text-accent" />
                    <span className="text-xs font-semibold">Lab Verified</span>
                  </motion.div>

                  {/* Bottom product info */}
                  <div className="absolute bottom-0 left-0 right-0 p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-accent">NovaLabs</p>
                        <p className="font-display text-lg font-bold">Testosterone Enanthate 300</p>
                      </div>
                      <div className="rounded-lg bg-accent px-3 py-1.5 font-display text-sm font-bold text-black">
                        $89
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Floating stat card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.2, duration: 0.6 }}
                className="absolute -bottom-6 -left-8 z-20 rounded-2xl glass-strong p-4 shadow-xl"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/15">
                    <Star className="h-5 w-5 fill-accent text-accent" />
                  </div>
                  <div>
                    <p className="font-display text-xl font-bold">4.9/5</p>
                    <p className="text-xs text-muted-foreground">12,000+ reviews</p>
                  </div>
                </div>
              </motion.div>

              {/* Floating dispatch card */}
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.4, duration: 0.6 }}
                className="absolute -right-6 top-12 z-20 rounded-2xl glass-strong p-4 shadow-xl"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/15">
                    <Zap className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <p className="font-display text-sm font-bold">24h Dispatch</p>
                    <p className="text-xs text-muted-foreground">Tracked worldwide</p>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </motion.div>
        </div>

        {/* Stats row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.7 }}
          className="mt-16 grid grid-cols-2 gap-4 md:grid-cols-4 lg:mt-20"
        >
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.8 + i * 0.08 }}
              className="group relative overflow-hidden rounded-2xl border border-border/40 bg-secondary/20 p-5 text-center backdrop-blur transition-colors hover:border-accent/30"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
              <p className="relative font-display text-3xl font-bold text-gradient-accent md:text-4xl">
                {s.value}
              </p>
              <p className="relative mt-1 text-xs text-muted-foreground">{s.label}</p>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>
    </section>
  );
}
