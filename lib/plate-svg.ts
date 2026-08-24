import { seededRandom } from '@/components/ebru/marbling';
import type { Product } from '@/lib/types';

/*
  The product plate, as SVG markup.

  One geometry, two consumers:

  - the rasteriser (scripts/generate-plates.ts) renders it with LITERAL colours, converts it
    to PNG and uploads it to Cloudinary — those files are the real catalogue images;
  - the React fallback renders it with CSS-variable colours so it still themes live when a
    product has no uploaded image yet.

  Keeping the shapes in one function is the point: a drifted duplicate would mean the picture
  a buyer sees and the picture in the design system slowly stop being the same object.
*/

export type PlateColors = {
  /** The category pigment. */
  ink: string;
  /** The plate's own size — the ground it was floated on. */
  size: string;
  /** The band thrown across it, alternating with the pigment. */
  band: string;
  /** Hairline plate rule. */
  rule: string;
  /** The marking text. */
  label: string;
};

export type Vessel = 'vial' | 'capsule' | 'dropper' | 'syringe' | 'carton';

export function vesselFor(categorySlug: string): Vessel {
  switch (categorySlug) {
    case 'orals':
    case 'pct':
    case 'fat-burners':
      return 'capsule';
    case 'sarms':
      return 'dropper';
    case 'ancillaries':
    case 'accessories':
      return 'syringe';
    case 'bundles':
      return 'carton';
    default:
      return 'vial';
  }
}

/** The strength marking on the label, if the specification carries one. */
export function markingFor(product: Product): string {
  const spec = product.specifications.find((s) =>
    /concentration|strength|dose|volume/i.test(s.label)
  );
  return (spec?.value ?? product.category).toUpperCase();
}

/** Deterministic per-slug seed, so a product's plate is the same sheet every time. */
function slugSeed(slug: string): number {
  let h = 2166136261;
  for (let i = 0; i < slug.length; i++) {
    h ^= slug.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h % 9973);
}

function vesselMarkup(kind: Vessel, ink: string): string {
  const s = `stroke="${ink}" stroke-width="2.1" fill="none"`;

  if (kind === 'capsule') {
    return `
      <rect x="82" y="60" width="76" height="150" rx="38" ${s} />
      <path d="M82 135h76" stroke="${ink}" stroke-width="1.6" />
      <path d="M82 135v37a38 38 0 0 0 76 0v-37Z" fill="${ink}" opacity="0.3" />`;
  }

  if (kind === 'dropper') {
    return `
      <path d="M104 44h32v22h-32z" ${s} />
      <path d="M96 66h48a14 14 0 0 1 14 14v116a14 14 0 0 1-14 14H96a14 14 0 0 1-14-14V80a14 14 0 0 1 14-14Z" ${s} />
      <path d="M82 118h76" stroke="${ink}" stroke-width="1.2" opacity="0.5" />
      <path d="M82 152h76" stroke="${ink}" stroke-width="1.2" opacity="0.5" />
      <path d="M82 168h76v28a14 14 0 0 1-14 14H96a14 14 0 0 1-14-14Z" fill="${ink}" opacity="0.3" />`;
  }

  if (kind === 'syringe') {
    const ticks = [92, 108, 124, 140, 156, 172, 188]
      .map((y) => `<path d="M100 ${y}h12" stroke="${ink}" stroke-width="1.1" opacity="0.55" />`)
      .join('');
    return `
      <path d="M120 26v26" stroke="${ink}" stroke-width="1.6" stroke-linecap="round" />
      <path d="M104 52h32v18h-32z" ${s} />
      <path d="M100 70h40v134h-40z" ${s} />
      <path d="M100 204h40v16h-40z" ${s} />
      <path d="M86 220h68" stroke="${ink}" stroke-width="1.6" stroke-linecap="round" />
      ${ticks}
      <path d="M100 140h40v64h-40z" fill="${ink}" opacity="0.3" />`;
  }

  if (kind === 'carton') {
    return `
      <path d="M72 84 120 60l48 24v96l-48 24-48-24Z" ${s} />
      <path d="m72 84 48 24 48-24" ${s} />
      <path d="M120 108v96" stroke="${ink}" stroke-width="1.6" />
      <path d="m120 108 48-24v96l-48 24Z" fill="${ink}" opacity="0.28" />`;
  }

  /* vial — crimped cap, shoulder, fill line */
  return `
    <path d="M104 40h32v14h-32z" ${s} />
    <path d="M100 54h40v14h-40z" fill="${ink}" opacity="0.28" />
    <path d="M100 54h40v14h-40z" ${s} />
    <path d="M96 68h48l10 22v106a14 14 0 0 1-14 14h-40a14 14 0 0 1-14-14V90Z" ${s} />
    <path d="M86 128h68" stroke="${ink}" stroke-width="1.2" opacity="0.45" />
    <path d="M86 128h68v62a14 14 0 0 1-14 14h-40a14 14 0 0 1-14-14Z" fill="${ink}" opacity="0.34" />`;
}

export type PlateOptions = {
  colors: PlateColors;
  showMarking?: boolean;
  /** Font stack for the marking. The rasteriser needs a real installed family. */
  fontFamily?: string;
  /** Emit a full standalone document (rasterising) rather than inner markup (React). */
  standalone?: boolean;
};

/**
 * The floated ground plus the vessel, in the world's own grammar: filled concentric bands
 * alternating pigment and size, a hairline plate rule, and the vessel drawn over a paper
 * backing plate so it stays legible.
 */
export function buildPlateSvg(product: Product, options: PlateOptions): string {
  const { colors, showMarking = true, fontFamily, standalone = false } = options;
  const rand = seededRandom(slugSeed(product.slug));

  const drops = Array.from({ length: 11 }).map(() => ({
    cx: 8 + rand() * 224,
    cy: 12 + rand() * 236,
    r: 26 + rand() * 62,
    rings: 3 + Math.floor(rand() * 3),
  }));

  const ground = drops
    .map((d) =>
      Array.from({ length: d.rings })
        .map((_, r) => {
          const radius = d.r * (1 - r / (d.rings + 0.35));
          const fill = r % 2 === 0 ? colors.ink : colors.band;
          const opacity = r % 2 === 0 ? 0.34 : 0.8;
          return `<circle cx="${d.cx.toFixed(2)}" cy="${d.cy.toFixed(2)}" r="${radius.toFixed(2)}" fill="${fill}" opacity="${opacity}" />`;
        })
        .join('')
    )
    .join('');

  const marking = showMarking
    ? `<text x="120" y="238" text-anchor="middle" fill="${colors.label}" font-family="${
        fontFamily ?? 'monospace'
      }" font-size="11" letter-spacing="1.5">${escapeXml(markingFor(product))}</text>`
    : '';

  const inner = `
    <rect width="240" height="260" fill="${colors.size}" />
    <g>${ground}</g>
    <rect x="12" y="12" width="216" height="236" fill="none" stroke="${colors.rule}" stroke-width="1" />
    <ellipse cx="120" cy="132" rx="62" ry="98" fill="${colors.band}" opacity="0.8" />
    ${vesselMarkup(vesselFor(product.categorySlug), colors.ink)}
    ${marking}`;

  if (!standalone) return inner;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 260" width="240" height="260">${inner}</svg>`;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
