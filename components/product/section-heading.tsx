'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export function SectionHeading({
  eyebrow,
  title,
  description,
  href,
  hrefLabel = 'View all',
  className,
  align = 'left',
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  href?: string;
  hrefLabel?: string;
  className?: string;
  align?: 'left' | 'center';
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-start justify-between gap-4 md:flex-row md:items-end',
        align === 'center' && 'md:flex-col md:items-center text-center',
        className
      )}
    >
      <div className={cn(align === 'center' && 'text-center')}>
        {eyebrow && (
          <motion.span
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="inline-block text-xs font-semibold uppercase tracking-[0.2em] text-accent"
          >
            {eyebrow}
          </motion.span>
        )}
        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="mt-2 font-display text-3xl font-bold tracking-tight md:text-4xl"
        >
          {title}
        </motion.h2>
        {description && (
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
              'mt-2 max-w-2xl text-sm text-muted-foreground md:text-base',
              align === 'center' && 'mx-auto'
            )}
          >
            {description}
          </motion.p>
        )}
      </div>
      {href && (
        <motion.div
          initial={{ opacity: 0, x: 10 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className={cn(align === 'center' && 'md:mt-0')}
        >
          <Link
            href={href}
            className="group flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            {hrefLabel}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </motion.div>
      )}
    </div>
  );
}
