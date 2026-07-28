'use client';

import * as React from 'react';
import Link from 'next/link';
import { Search, MessageCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion';
import { faqs } from '@/lib/data/faqs';

export default function FaqPage() {
  const [query, setQuery] = React.useState('');

  const filtered = faqs.filter(
    (f) =>
      f.question.toLowerCase().includes(query.toLowerCase()) ||
      f.answer.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 lg:px-6">
      <div className="text-center">
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
          Help Center
        </span>
        <h1 className="mt-3 font-display text-4xl font-bold tracking-tight md:text-5xl">
          Frequently Asked Questions
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
          Everything you need to know about our products, shipping, payments,
          and policies.
        </p>
      </div>

      <div className="relative mt-8">
        <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search questions..."
          className="h-12 pl-12"
        />
      </div>

      <div className="mt-8">
        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-border/50 bg-card p-12 text-center">
            <p className="text-sm text-muted-foreground">
              No results for &ldquo;{query}&rdquo;
            </p>
          </div>
        ) : (
          <Accordion type="single" collapsible className="space-y-3">
            {filtered.map((f, i) => (
              <AccordionItem key={i} value={`item-${i}`} className="rounded-xl border border-border/50 px-4">
                <AccordionTrigger className="text-left text-base font-medium hover:no-underline">
                  {f.question}
                </AccordionTrigger>
                <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                  {f.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </div>

      <div className="mt-12 rounded-2xl border border-border/40 bg-gradient-to-br from-secondary/40 to-transparent p-8 text-center">
        <MessageCircle className="mx-auto h-8 w-8 text-accent" />
        <h2 className="mt-4 font-display text-2xl font-bold">Still have questions?</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Our support team is available 24/7 and responds in under 2 hours.
        </p>
        <Button asChild className="mt-6 bg-accent text-black hover:bg-accent/90">
          <Link href="/contact">Contact Support</Link>
        </Button>
      </div>
    </div>
  );
}
