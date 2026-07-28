'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { StaggerGroup, StaggerItem } from '@/components/animations/motion';

const collections = [
  {
    title: 'Mass Stack Pro',
    description: 'Curated 12-week mass accumulation protocol with full PCT support.',
    href: '/product/mass-stack-pro',
    image: 'https://images.pexels.com/photos/3683063/pexels-photo-3683063.jpeg?auto=compress&cs=tinysrgb&w=900',
    badge: 'Bestseller',
  },
  {
    title: 'Cutting Essentials',
    description: 'Thermogenic and lipolytic compounds for body composition research.',
    href: '/shop?category=fat-burners',
    image: 'https://images.pexels.com/photos/3683089/pexels-photo-3683089.jpeg?auto=compress&cs=tinysrgb&w=900',
    badge: 'Trending',
  },
  {
    title: 'Peptide Research Kit',
    description: 'High-purity lyophilized peptides with cold-chain shipping.',
    href: '/shop?category=peptides',
    image: 'https://images.pexels.com/photos/3683091/pexels-photo-3683091.jpeg?auto=compress&cs=tinysrgb&w=900',
    badge: 'New',
  },
];

export function FeaturedCollections() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 lg:px-6">
      <StaggerGroup className="grid gap-4 md:grid-cols-3" stagger={0.1}>
        {collections.map((c) => (
          <StaggerItem key={c.title}>
            <Link
              href={c.href}
              className="group relative flex h-full flex-col justify-end overflow-hidden rounded-2xl border border-border/40 bg-card p-6 transition-all duration-500 hover:border-accent/30"
              style={{ minHeight: '340px' }}
            >
              <img
                src={c.image}
                alt={c.title}
                loading="lazy"
                className="absolute inset-0 h-full w-full object-cover opacity-25 transition-all duration-700 group-hover:opacity-35 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-card via-card/85 to-card/40" />
              <div className="relative">
                <span className="inline-block rounded-full bg-accent px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-black">
                  {c.badge}
                </span>
                <h3 className="mt-3 font-display text-2xl font-bold">{c.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  {c.description}
                </p>
                <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-accent">
                  Explore Collection
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </span>
              </div>
            </Link>
          </StaggerItem>
        ))}
      </StaggerGroup>
    </section>
  );
}
