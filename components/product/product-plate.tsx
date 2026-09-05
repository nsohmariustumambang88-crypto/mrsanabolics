import Image from 'next/image';
import { buildPlateSvg, markingFor } from '@/lib/plate-svg';
import { categoryPigment } from '@/lib/site';
import type { ProductSummary } from '@/lib/types';
import { cn } from '@/lib/utils';

/*
  Catalogue imagery.

  These are real raster images now, not inline SVG: `npm run images:generate` renders each
  plate to a 1200x1300 PNG, uploads it to Cloudinary under mranabolics/products/<slug>, and
  writes the public ID into Postgres. Delivery goes through the custom loader, so each surface
  gets an appropriately sized AVIF/WebP rather than one file scaled by the browser.

  Why raster matters beyond file size: an inline SVG cannot be shared, cannot appear in an
  Open Graph card, cannot be saved, and cannot be cached by a CDN. It was never really an image.

  THE MARKING IS DOM TEXT, NOT PART OF THE PICTURE. Burning it into the raster would have
  meant shipping whatever mono font existed on the build machine — JetBrains Mono is loaded by
  next/font in the browser and is not installed on the OS — and text inside an image cannot be
  selected, translated, or read aloud. Keeping it live also means a specification change
  relabels every surface without regenerating a single asset.

  The inline SVG survives as a fallback for a product with no uploaded image yet, drawn from
  the same geometry in lib/plate-svg.ts so the two cannot drift.
*/

/**
 * Photographs live under mranabolics/library/ (see prisma/upload-library.ts); generated
 * plates live under mranabolics/products/. The prefix is the only difference the UI needs.
 */
export function isPhotograph(source: string | undefined): boolean {
  return Boolean(source && source.startsWith('mranabolics/library/'));
}

export function ProductPlate({
  product,
  className,
  showMarking = true,
  sizes = '(min-width: 1280px) 25vw, (min-width: 640px) 33vw, 50vw',
  priority = false,
}: {
  product: ProductSummary;
  className?: string;
  showMarking?: boolean;
  /** Which srcset candidate to take. Wrong values pull a 1200px file into a 44px thumbnail. */
  sizes?: string;
  priority?: boolean;
}) {
  const source = product.images?.[0];

  /*
    The marking carries the concentration, so it has to clear the legibility floor — at
    ink-faint over the plate's ground it measured 3.4:1, and quiet is not the same as
    unreadable. Padding keeps the wider markings ("40 MCG PER TABLET") off the plate edge.

    Which ink depends on what it sits on, and the two cases genuinely differ. The raster is
    generated once from the light tokens and served on both substrates, so its marking takes
    the fixed plate ink. The inline SVG is drawn live from --plate-size / --plate-band, which
    do flip, so its marking flips with them.
  */
  const markingOn = (tone: string) =>
    showMarking ? (
      <span
        className={cn(
          'pointer-events-none absolute inset-x-0 bottom-3 z-10 px-3 text-center font-mono text-2xs uppercase tracking-[0.14em]',
          tone
        )}
      >
        {markingFor(product)}
      </span>
    ) : null;

  if (source) {
    /*
      Two kinds of uploaded image. A generated plate fills its frame and carries the marking
      as live text over it. A photograph from the store's library is shown whole — most are
      square, the rest would lose their caps or labels to a cover crop — and carries no
      marking, because the label in the picture already says what the vial holds and a second
      line of text over a photograph is clutter, not information.
    */
    const photograph = isPhotograph(source);
    return (
      <>
        <Image
          src={source}
          alt={`${product.name} — ${product.category}`}
          fill
          sizes={sizes}
          priority={priority}
          className={cn(photograph ? 'object-contain' : 'object-cover', className)}
        />
        {photograph ? null : markingOn('text-plate-ink')}
      </>
    );
  }

  /* No uploaded asset: draw the plate inline from the same geometry. */
  const svg = buildPlateSvg(product, {
    colors: {
      ink: categoryPigment(product.categorySlug),
      size: 'hsl(var(--plate-size))',
      band: 'hsl(var(--plate-band))',
      rule: 'hsl(var(--rule-strong))',
      label: 'hsl(var(--ink-faint))',
    },
    showMarking: false,
  });

  return (
    <>
      <svg
        viewBox="0 0 240 260"
        className={cn('h-full w-full', className)}
        role="img"
        aria-label={`${product.name} — ${product.category} plate`}
        preserveAspectRatio="xMidYMid slice"
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      {markingOn('text-ink-soft')}
    </>
  );
}
