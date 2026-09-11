import Image from 'next/image';
import { cn } from '@/lib/utils';

/*
  The house mark: the owner's red bull, and nothing around it.

  The owner asked for the bull alone, with no coin, ring or frame, in its own colours. It is the
  owner's illustration cut out of its white background by `npm run brand:build` (see
  scripts/make-brand.mjs), so it stands directly on the sheet in the light theme and on the bath
  in the dark one. Its black outline keeps its edge readable on both.

  `unoptimized` is load-bearing. next.config.js routes every next/image through the Cloudinary
  loader, which treats a path that does not start with http as a Cloudinary public ID; without
  this flag the logo would be requested from Cloudinary under a name that does not exist there.
  The file is already sized and compressed for the job, so there is nothing for an optimiser to do.

  Size it by width only (`w-*`). Height follows the drawing's own proportions.
*/

/** The served file's pixel size. `npm run brand:build` prints these when it regenerates it. */
export const BULL_WIDTH = 320;
export const BULL_HEIGHT = 292;

export function BullMark({
  className,
  title,
  priority = false,
}: {
  className?: string;
  /** Accessible name. Omit when a visible wordmark or the link's own label already names the brand. */
  title?: string;
  /** For the header, where the bull is on screen before anything else is. */
  priority?: boolean;
}) {
  return (
    <Image
      src="/brand/bull.webp"
      alt={title ?? ''}
      width={BULL_WIDTH}
      height={BULL_HEIGHT}
      unoptimized
      priority={priority}
      draggable={false}
      className={cn('h-auto select-none', className)}
    />
  );
}
