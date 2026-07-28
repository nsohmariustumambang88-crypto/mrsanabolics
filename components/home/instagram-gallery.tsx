'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Instagram, Heart } from 'lucide-react';
import { StaggerGroup, StaggerItem } from '@/components/animations/motion';

const images = [
  { id: 3683099, likes: '2.4k' },
  { id: 3683056, likes: '3.1k' },
  { id: 3683094, likes: '1.8k' },
  { id: 3683091, likes: '2.9k' },
  { id: 3683063, likes: '4.2k' },
  { id: 3683076, likes: '1.5k' },
];

export function InstagramGallery() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 lg:px-6">
      <div className="text-center">
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
          @MrAnabolics
        </span>
        <h2 className="mt-2 font-display text-3xl font-bold tracking-tight md:text-4xl">
          Follow Our Journey
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Tag us in your posts for a chance to be featured.
        </p>
      </div>
      <StaggerGroup className="mt-10 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6" stagger={0.05}>
        {images.map((img) => (
          <StaggerItem key={img.id}>
            <Link
              href="#"
              className="group relative block aspect-square overflow-hidden rounded-xl bg-background"
            >
              <img
                src={`https://images.pexels.com/photos/${img.id}/pexels-photo-${img.id}.jpeg?auto=compress&cs=tinysrgb&w=400`}
                alt="Instagram post"
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 backdrop-blur-sm transition-opacity duration-300 group-hover:opacity-100">
                <div className="flex flex-col items-center gap-1 text-white">
                  <Instagram className="h-6 w-6" />
                  <span className="flex items-center gap-1 text-xs">
                    <Heart className="h-3 w-3 fill-current" />
                    {img.likes}
                  </span>
                </div>
              </div>
            </Link>
          </StaggerItem>
        ))}
      </StaggerGroup>
    </section>
  );
}
