'use client';

import * as React from 'react';
import { Bath, composeSheet } from './marbling';
import { cn } from '@/lib/utils';

type Props = {
  className?: string;
  /** Same seed, same sheet. Change it to float a different pattern. */
  seed?: number;
  /** Which pigment variables to float. Index 0 is the ground thrown between every ink. */
  pigments?: string[];
  /** Pointer drags comb the pigment. Off for fields sitting behind text. */
  interactive?: boolean;
  /** 0–1. Fidelity against time: the hero runs high, small decorative tiles run low. */
  density?: number;
  /** The bath composed blot by blot on first paint. Off by default: the site's motion
      budget is spent elsewhere, and a hero that assembles itself delays the headline. */
  animate?: boolean;
};

const DEFAULT_PIGMENTS = [
  /*
    Index 0 is the size coat: the ground the bath is covered with and the tone thrown between
    every ink. It is deliberately NOT the sheet's value — when it was, half the field read as
    bare paper. White pigment stays in the set as an ink, where it belongs.
  */
  '--size-coat',
  '--pig-indigo',
  '--paper-raised',
  '--pig-madder',
  '--pig-indigo-lift',
  '--pig-saffron',
];

function readPigments(vars: string[]): string[] {
  const styles = getComputedStyle(document.documentElement);
  return vars.map((v) => {
    const raw = styles.getPropertyValue(v).trim();
    return raw ? `hsl(${raw})` : 'hsl(0 0% 50%)';
  });
}

export function MarbleBath({
  className,
  seed = 7,
  pigments = DEFAULT_PIGMENTS,
  interactive = false,
  density = 1,
  animate = false,
}: Props) {
  const hostRef = React.useRef<HTMLDivElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const bathRef = React.useRef<Bath | null>(null);
  const frameRef = React.useRef<number>();
  const dragRef = React.useRef<{ x: number; y: number } | null>(null);
  const [themeKey, setThemeKey] = React.useState(0);

  /*
    A page can carry a dozen baths. Composing every one on mount would spend seconds of main
    thread before the first of them is anywhere near the viewport, so each sheet waits until
    it is close to being seen.
  */
  const [live, setLive] = React.useState(false);

  React.useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    if (typeof IntersectionObserver === 'undefined') {
      setLive(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setLive(true);
          io.disconnect();
        }
      },
      { rootMargin: '400px 0px' }
    );
    io.observe(host);
    return () => io.disconnect();
  }, []);

  /* Re-float the sheet when the substrate changes: the same pigments on a different ground. */
  React.useEffect(() => {
    const observer = new MutationObserver(() => setThemeKey((k) => k + 1));
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });
    return () => observer.disconnect();
  }, []);

  React.useEffect(() => {
    if (!live) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let disposed = false;
    let revealed = 0;

    const paint = (upTo: number) => {
      const rect = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, rect.width, rect.height);
      bathRef.current?.render(ctx, upTo);
    };

    const build = () => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const bath = new Bath(rect.width, rect.height);
      composeSheet(bath, readPigments(pigments), seed, { density });
      bathRef.current = bath;

      if (!animate || reduceMotion) {
        revealed = bath.blots.length;
        paint(revealed);
        return;
      }

      /* The lift: the sheet surfaces out of the size, then holds. */
      revealed = 0;
      const total = bath.blots.length;
      const start = performance.now();
      const duration = 1400;

      const step = (now: number) => {
        if (disposed) return;
        const t = Math.min((now - start) / duration, 1);
        /* Exponential ease-out from an already-visible default. */
        const eased = 1 - Math.pow(1 - t, 3);
        revealed = Math.max(1, Math.round(eased * total));
        paint(revealed);
        if (t < 1) frameRef.current = requestAnimationFrame(step);
      };
      frameRef.current = requestAnimationFrame(step);
    };

    build();

    let resizeTimer: ReturnType<typeof setTimeout>;
    let lastWidth = canvas.getBoundingClientRect().width;
    const resizeObserver = new ResizeObserver(() => {
      const width = canvas.getBoundingClientRect().width;
      /* Composition is expensive; only re-float on a real width change. */
      if (Math.abs(width - lastWidth) < 24) return;
      lastWidth = width;
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (frameRef.current) cancelAnimationFrame(frameRef.current);
        build();
      }, 180);
    });
    resizeObserver.observe(canvas);

    /* Combing the bath. The stroke is irreversible — the pigment does not come back. */
    const localPoint = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    const onDown = (e: PointerEvent) => {
      if (!interactive) return;
      dragRef.current = localPoint(e);
      canvas.setPointerCapture(e.pointerId);
    };

    const onMove = (e: PointerEvent) => {
      if (!interactive || !dragRef.current || !bathRef.current) return;
      const p = localPoint(e);
      const prev = dragRef.current;
      const dist = Math.hypot(p.x - prev.x, p.y - prev.y);
      if (dist < 5) return;
      const unit = Math.min(bathRef.current.width, bathRef.current.height);
      bathRef.current.tine(
        prev.x,
        prev.y,
        p.x,
        p.y,
        Math.min(dist * 0.85, unit * 0.05),
        unit * 0.03,
        0.4
      );
      dragRef.current = p;
      paint(revealed);
    };

    const onUp = (e: PointerEvent) => {
      dragRef.current = null;
      if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
    };

    if (interactive) {
      canvas.addEventListener('pointerdown', onDown);
      canvas.addEventListener('pointermove', onMove);
      canvas.addEventListener('pointerup', onUp);
      canvas.addEventListener('pointercancel', onUp);
    }

    return () => {
      disposed = true;
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      clearTimeout(resizeTimer);
      resizeObserver.disconnect();
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointercancel', onUp);
    };
  }, [live, seed, pigments, interactive, density, animate, themeKey]);

  return (
    <div ref={hostRef} className={cn('relative overflow-hidden', className)}>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full"
        aria-hidden="true"
        style={{
          touchAction: interactive ? 'none' : undefined,
          cursor: interactive ? 'crosshair' : undefined,
        }}
      />
      {/*
        Ink tooth. Floated pigment sits on wet size and dries into paper fibre; without a
        grain the densest ring structure still renders as clean vector. This is the same
        fibre the page ground uses, at a weight that survives a screenshot.
      */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.13] mix-blend-multiply dark:opacity-[0.18] dark:mix-blend-screen"
        style={{ backgroundImage: 'var(--substrate-texture)' }}
      />
    </div>
  );
}
