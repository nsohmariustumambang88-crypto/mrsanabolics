'use client';

import * as React from 'react';
import Link from 'next/link';
import { Calendar, Clock, Search, ArrowRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { blogPosts } from '@/lib/data/blog';

export default function BlogPage() {
  const [query, setQuery] = React.useState('');
  const [category, setCategory] = React.useState('All');

  const categories = ['All', ...Array.from(new Set(blogPosts.map((p) => p.category)))];

  const filtered = blogPosts.filter((p) => {
    const matchesQuery =
      p.title.toLowerCase().includes(query.toLowerCase()) ||
      p.excerpt.toLowerCase().includes(query.toLowerCase());
    const matchesCategory = category === 'All' || p.category === category;
    return matchesQuery && matchesCategory;
  });

  const featured = filtered[0];
  const rest = filtered.slice(1);

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 lg:px-6">
      <div className="text-center">
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
          Knowledge Base
        </span>
        <h1 className="mt-3 font-display text-4xl font-bold tracking-tight md:text-5xl">
          The MrAnabolics Blog
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
          Research-backed guides, protocol breakdowns, and education from our
          team of experts.
        </p>
      </div>

      <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search articles..."
            className="pl-12"
          />
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${
              category === c
                ? 'border-accent bg-accent text-black'
                : 'border-border text-muted-foreground hover:text-foreground'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {featured && (
        <Link
          href={`/blog/${featured.slug}`}
          className="group mt-12 grid overflow-hidden rounded-3xl border border-border/50 bg-card transition-all hover:border-accent/40"
        >
          <div className="grid md:grid-cols-2">
            <div className="relative aspect-[16/10] overflow-hidden bg-background md:aspect-auto">
              <img
                src={featured.image}
                alt={featured.title}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            </div>
            <div className="flex flex-col justify-center p-8 md:p-12">
              <Badge className="w-fit bg-accent/20 text-accent">{featured.category}</Badge>
              <h2 className="mt-4 font-display text-2xl font-bold leading-tight transition-colors group-hover:text-accent md:text-3xl">
                {featured.title}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {featured.excerpt}
              </p>
              <div className="mt-6 flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  {new Date(featured.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  {featured.readTime}
                </span>
                <span>by {featured.author}</span>
              </div>
              <span className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-accent">
                Read Article
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </span>
            </div>
          </div>
        </Link>
      )}

      <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {rest.map((post) => (
          <Link
            key={post.id}
            href={`/blog/${post.slug}`}
            className="group flex flex-col overflow-hidden rounded-2xl border border-border/50 bg-card transition-all hover:border-accent/40 hover:shadow-xl hover:shadow-black/40"
          >
            <div className="relative aspect-[16/10] overflow-hidden bg-background">
              <img
                src={post.image}
                alt={post.title}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <Badge className="absolute left-3 top-3 bg-background/80 backdrop-blur">
                {post.category}
              </Badge>
            </div>
            <div className="flex flex-1 flex-col p-5">
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {new Date(post.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {post.readTime}
                </span>
              </div>
              <h3 className="mt-3 line-clamp-2 text-lg font-semibold leading-snug transition-colors group-hover:text-accent">
                {post.title}
              </h3>
              <p className="mt-2 line-clamp-2 flex-1 text-sm text-muted-foreground">
                {post.excerpt}
              </p>
              <div className="mt-4 flex items-center gap-1.5 text-sm font-medium text-accent">
                Read More
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
