'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { Mail, Check, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function Newsletter() {
  const [email, setEmail] = React.useState('');
  const [submitted, setSubmitted] = React.useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) setSubmitted(true);
  };

  return (
    <section className="mx-auto max-w-7xl px-4 py-20 lg:px-6">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="relative overflow-hidden rounded-3xl border border-border/30 bg-gradient-to-br from-secondary/50 via-card to-card p-8 md:p-16"
      >
        <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-accent-glow blur-3xl" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/40 to-transparent" />
        <div className="relative mx-auto max-w-2xl text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10">
            <Mail className="h-7 w-7 text-accent" />
          </div>
          <div className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/5 px-3 py-1 text-xs font-medium text-accent">
            <Sparkles className="h-3 w-3" />
            Exclusive Access
          </div>
          <h2 className="mt-5 font-display text-3xl font-bold tracking-tight md:text-4xl">
            Join the inner circle
          </h2>
          <p className="mt-3 text-sm text-muted-foreground md:text-base">
            Get exclusive offers, early access to new products, and
            research-backed guides delivered to your inbox. No spam, ever.
          </p>
          {submitted ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mt-8 flex items-center justify-center gap-2 rounded-xl border border-accent/40 bg-accent/10 p-4 text-accent"
            >
              <Check className="h-5 w-5" />
              <span className="font-medium">
                You&apos;re in. Check your inbox to confirm.
              </span>
            </motion.div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="mx-auto mt-8 flex max-w-md flex-col gap-3 sm:flex-row"
            >
              <Input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="h-12 bg-background"
              />
              <Button
                type="submit"
                className="h-12 bg-accent font-semibold text-black hover:bg-accent/90"
              >
                Subscribe
              </Button>
            </form>
          )}
          <p className="mt-4 text-xs text-muted-foreground">
            By subscribing you agree to our Privacy Policy. Unsubscribe anytime.
          </p>
        </div>
      </motion.div>
    </section>
  );
}
