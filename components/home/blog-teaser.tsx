'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Calendar, Clock } from 'lucide-react';
import { blogPosts } from '@/lib/data/blog';
import { SectionHeading } from '@/components/product/section-heading';
import { Badge } from '@/components/ui/badge';
import { StaggerGroup, StaggerItem } from '@/components/animations/motion';

export function BlogTeaser() {
  const posts = blogPosts.slice(0, 3);
  return (
    <section className="mx-auto max-w-7xl px-4 py-20 lg:px-6">
      <SectionHeading
        eyebrow="Knowledge Base"
        title="Latest Articles"
        description="Research-backed guides, protocol breakdowns, and education from our team."
        href="/blog"
      />
      <StaggerGroup className="mt-10 grid gap-6 md:grid-cols-3" stagger={0.1}>
        {posts.map((post) => (
          <StaggerItem key={post.id}>
            <Link
              href={`/blog/${post.slug}`}
              className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border/40 bg-card transition-all duration-500 hover:border-accent/30 hover:shadow-2xl hover:shadow-black/50"
            >
              <div className="relative aspect-[16/10] overflow-hidden bg-background">
                <img
                  src={post.image}
                  alt={post.title}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-card/60 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                <Badge className="absolute left-3 top-3 glass border-white/10 text-white">
                  {post.category}
                </Badge>
              </div>
              <div className="flex flex-1 flex-col p-5">
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
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
          </StaggerItem>
        ))}
      </StaggerGroup>
    </section>
  );
}
