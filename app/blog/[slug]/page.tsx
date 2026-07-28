'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Calendar, Clock, ArrowLeft, ArrowRight, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getBlogPostBySlug, blogPosts } from '@/lib/data/blog';

export default function BlogPostPage() {
  const params = useParams<{ slug: string }>();
  const post = getBlogPostBySlug(params.slug);

  if (!post) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-24 text-center">
        <h1 className="font-display text-3xl font-bold">Article not found</h1>
        <Button asChild className="mt-6 bg-accent text-black hover:bg-accent/90">
          <Link href="/blog">Back to Blog</Link>
        </Button>
      </div>
    );
  }

  const related = blogPosts.filter((p) => p.id !== post.id && p.category === post.category).slice(0, 2);

  return (
    <article>
      <div className="relative h-[40vh] min-h-[280px] overflow-hidden border-b border-border/40">
        <img src={post.image} alt={post.title} className="h-full w-full object-cover opacity-40" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 mx-auto max-w-3xl px-4 pb-10 lg:px-6">
          <Link href="/blog" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Back to Blog
          </Link>
          <Badge className="mt-4 bg-accent/20 text-accent">{post.category}</Badge>
          <h1 className="mt-3 font-display text-3xl font-bold leading-tight md:text-4xl">
            {post.title}
          </h1>
          <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              {new Date(post.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              {post.readTime}
            </span>
            <span>by {post.author}</span>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-12 lg:px-6">
        <div className="prose prose-invert max-w-none">
          <p className="text-lg leading-relaxed text-muted-foreground">{post.excerpt}</p>
          <p className="mt-6 leading-relaxed text-muted-foreground">{post.content}</p>
          <p className="mt-6 leading-relaxed text-muted-foreground">
            At MrAnabolics, we believe education is just as important as the
            products themselves. Understanding the science behind what you use
            empowers better decisions and better outcomes. For more information
            on any of our products, including certificates of analysis, reach
            out to our support team anytime.
          </p>
        </div>

        <div className="mt-10 flex items-center justify-between rounded-2xl border border-border/50 bg-card p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-accent to-emerald-600 font-display text-sm font-bold text-black">
              {post.author.charAt(0)}
            </div>
            <div>
              <p className="text-sm font-semibold">{post.author}</p>
              <p className="text-xs text-muted-foreground">MrAnabolics Team</p>
            </div>
          </div>
          <Button variant="outline" size="icon" aria-label="Share article">
            <Share2 className="h-4 w-4" />
          </Button>
        </div>

        {related.length > 0 && (
          <div className="mt-16">
            <h2 className="font-display text-2xl font-bold">Related Articles</h2>
            <div className="mt-6 grid gap-6 sm:grid-cols-2">
              {related.map((r) => (
                <Link
                  key={r.id}
                  href={`/blog/${r.slug}`}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-border/50 bg-card transition-all hover:border-accent/40"
                >
                  <div className="aspect-[16/10] overflow-hidden bg-background">
                    <img src={r.image} alt={r.title} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  </div>
                  <div className="p-5">
                    <h3 className="line-clamp-2 font-semibold transition-colors group-hover:text-accent">{r.title}</h3>
                    <span className="mt-3 inline-flex items-center gap-1.5 text-sm text-accent">
                      Read More <ArrowRight className="h-4 w-4" />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </article>
  );
}
