/*
  Ebru — mathematical marbling.

  Pigment floated on thickened water does not get drawn; it gets displaced. Every mark is made
  by moving the medium, so this is a real displacement model, not a picture of one.

  Two operators, both area-preserving, both applied to every point already in the bath:

  DROP   A new drop of radius r at C occupies its own circle and pushes everything outward:
           P' = C + (P - C) * sqrt(1 + r^2 / |P - C|^2)

  TINE   A stylus drawn through the size drags pigment along its path, with the pull decaying
         exponentially by distance from the line:
           P' = P + d * (z * lambda^(dist / spacing))

  Colour never blends — each blot keeps its own boundary, which is why ebru reads as nested
  rings rather than as a gradient.

  WHAT MAKES IT READ AS MARBLING: many small contacts, not a few large ones. Each new drop
  compresses every earlier blot into a thinner ring around itself, so ring structure is a
  function of contact count. A few hundred fat drops just cover one another and render as flat
  lobes. Thousands of small ones produce the nested filament the craft is known for.

  That requires the geometry to be cheap:
    - points live in one Float32Array per blot, not in objects;
    - every blot carries a bounding box, so a drop or tine can skip whole blots untouched;
    - displacement falls off as r^2/2d, so beyond a cutoff radius the effect is sub-pixel and
      is skipped outright.
  Without those three, this density is not affordable in a browser.
*/

export type Blot = {
  color: string;
  /** Flat [x0, y0, x1, y1, ...] — one allocation per blot. */
  pts: Float32Array;
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};

/* Deterministic PRNG — the composition is art-directed, never accidental. */
export function seededRandom(seed: number) {
  let s = (seed >>> 0) || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** Sub-pixel displacement is not worth touching a blot for. */
const EPSILON = 0.5;

/** Ring resolution scales with circumference, within sane bounds. */
function resolutionFor(r: number): number {
  return Math.max(40, Math.min(128, Math.round((Math.PI * 2 * r) / 1.7)));
}

export class Bath {
  blots: Blot[] = [];
  /** The coat laid over the size before any drop is thrown. */
  ground: string | null = null;

  constructor(public width: number, public height: number) {}

  clear() {
    this.blots = [];
    this.ground = null;
  }

  /**
   * Drop a circle of pigment, displacing everything already floating.
   *
   * Beyond `cutoff` the displacement r^2/2d falls under a quarter pixel, so those blots are
   * skipped by bounding box before any point is touched.
   */
  drop(cx: number, cy: number, r: number, color: string) {
    const r2 = r * r;
    const cutoff = Math.max(r * 4, r2 / (2 * EPSILON));
    const cutoff2 = cutoff * cutoff;

    for (let b = 0; b < this.blots.length; b++) {
      const blot = this.blots[b];

      /* Nearest point of the blot's box to the drop centre. */
      const nx = cx < blot.minX ? blot.minX : cx > blot.maxX ? blot.maxX : cx;
      const ny = cy < blot.minY ? blot.minY : cy > blot.maxY ? blot.maxY : cy;
      const bdx = cx - nx;
      const bdy = cy - ny;
      if (bdx * bdx + bdy * bdy > cutoff2) continue;

      const pts = blot.pts;
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;

      for (let i = 0; i < pts.length; i += 2) {
        const dx = pts[i] - cx;
        const dy = pts[i + 1] - cy;
        const d2 = dx * dx + dy * dy;

        let x: number;
        let y: number;
        if (d2 === 0) {
          x = cx + r;
          y = cy;
        } else {
          const factor = Math.sqrt(1 + r2 / d2);
          x = cx + dx * factor;
          y = cy + dy * factor;
        }

        pts[i] = x;
        pts[i + 1] = y;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }

      blot.minX = minX;
      blot.minY = minY;
      blot.maxX = maxX;
      blot.maxY = maxY;
    }

    const n = resolutionFor(r);
    const pts = new Float32Array(n * 2);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      pts[i * 2] = cx + Math.cos(a) * r;
      pts[i * 2 + 1] = cy + Math.sin(a) * r;
    }

    this.blots.push({
      color,
      pts,
      minX: cx - r,
      minY: cy - r,
      maxX: cx + r,
      maxY: cy + r,
    });
  }

  /**
   * Draw a stylus through the bath from a to b. Pigment near the line follows the stroke; the
   * pull falls away exponentially, which is what produces the combed filaments.
   */
  tine(
    ax: number,
    ay: number,
    bx: number,
    by: number,
    strength: number,
    spacing: number,
    decay = 0.38
  ) {
    const vx = bx - ax;
    const vy = by - ay;
    const len = Math.hypot(vx, vy);
    if (len < 1e-4 || strength <= 0 || spacing <= 0) return;

    const dx = vx / len;
    const dy = vy / len;
    /* Unit normal — distance from the stroke line is measured along it. */
    const nx = -dy;
    const ny = dx;

    /* Past this distance the pull is sub-pixel. */
    const reach = spacing * (Math.log(EPSILON / strength) / Math.log(decay));
    if (!(reach > 0)) return;

    for (let b = 0; b < this.blots.length; b++) {
      const blot = this.blots[b];

      /* Signed distance of the box corners; skip when the whole box sits beyond reach. */
      const c1 = (blot.minX - ax) * nx + (blot.minY - ay) * ny;
      const c2 = (blot.maxX - ax) * nx + (blot.minY - ay) * ny;
      const c3 = (blot.minX - ax) * nx + (blot.maxY - ay) * ny;
      const c4 = (blot.maxX - ax) * nx + (blot.maxY - ay) * ny;
      const lo = Math.min(c1, c2, c3, c4);
      const hi = Math.max(c1, c2, c3, c4);
      if (lo > reach || hi < -reach) continue;

      const pts = blot.pts;
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;

      for (let i = 0; i < pts.length; i += 2) {
        const dist = Math.abs((pts[i] - ax) * nx + (pts[i + 1] - ay) * ny);
        const pull = strength * Math.pow(decay, dist / spacing);
        let x = pts[i];
        let y = pts[i + 1];
        if (pull >= EPSILON) {
          x += dx * pull;
          y += dy * pull;
          pts[i] = x;
          pts[i + 1] = y;
        }
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }

      blot.minX = minX;
      blot.minY = minY;
      blot.maxX = maxX;
      blot.maxY = maxY;
    }
  }

  /** A wavy comb — the classic gel-git, a tine swept with a sine offset. */
  wave(amplitude: number, wavelength: number, phase = 0, axis: 'x' | 'y' = 'y') {
    if (amplitude <= 0) return;
    for (const blot of this.blots) {
      const pts = blot.pts;
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      for (let i = 0; i < pts.length; i += 2) {
        if (axis === 'y') {
          pts[i] += Math.sin(pts[i + 1] / wavelength + phase) * amplitude;
        } else {
          pts[i + 1] += Math.sin(pts[i] / wavelength + phase) * amplitude;
        }
        const x = pts[i];
        const y = pts[i + 1];
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
      blot.minX = minX;
      blot.minY = minY;
      blot.maxX = maxX;
      blot.maxY = maxY;
    }
  }

  /** Vortex around a centre — the bülbül yuvası, the nightingale's nest. */
  swirl(cx: number, cy: number, radius: number, turns = 1) {
    const r2 = radius * radius;
    for (const blot of this.blots) {
      if (
        blot.maxX < cx - radius ||
        blot.minX > cx + radius ||
        blot.maxY < cy - radius ||
        blot.minY > cy + radius
      ) {
        continue;
      }

      const pts = blot.pts;
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;

      for (let i = 0; i < pts.length; i += 2) {
        const dx = pts[i] - cx;
        const dy = pts[i + 1] - cy;
        const d2 = dx * dx + dy * dy;
        let x = pts[i];
        let y = pts[i + 1];
        if (d2 < r2) {
          /* Rotation falls to zero at the rim, so the nest blends into the field. */
          const t = 1 - Math.sqrt(d2) / radius;
          const a = t * t * turns * Math.PI * 2;
          const cos = Math.cos(a);
          const sin = Math.sin(a);
          x = cx + dx * cos - dy * sin;
          y = cy + dx * sin + dy * cos;
          pts[i] = x;
          pts[i + 1] = y;
        }
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }

      blot.minX = minX;
      blot.minY = minY;
      blot.maxX = maxX;
      blot.maxY = maxY;
    }
  }

  /**
   * Back-to-front, each blot filled and then edged.
   *
   * The hairline edge is the ink tooth: where floated pigment meets its neighbour it crowds
   * and darkens slightly. Without it a dense bath renders as flat vector shapes even when the
   * ring geometry underneath is correct.
   */
  render(ctx: CanvasRenderingContext2D, upTo = this.blots.length, edge = true) {
    const limit = Math.min(upTo, this.blots.length);

    /* The coat goes down first; nothing in the picture is ever bare substrate. */
    if (this.ground) {
      ctx.fillStyle = this.ground;
      ctx.fillRect(0, 0, this.width, this.height);
    }

    ctx.lineJoin = 'round';
    ctx.lineWidth = 0.55;

    for (let b = 0; b < limit; b++) {
      const blot = this.blots[b];
      const pts = blot.pts;
      if (pts.length < 6) continue;

      ctx.beginPath();
      ctx.moveTo(pts[0], pts[1]);
      for (let i = 2; i < pts.length; i += 2) {
        ctx.lineTo(pts[i], pts[i + 1]);
      }
      ctx.closePath();

      ctx.fillStyle = blot.color;
      ctx.fill();

      if (edge) {
        ctx.globalAlpha = 0.07;
        ctx.strokeStyle = '#000';
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }
  }
}

/**
 * The house pattern — battal ebru, combed, with one nightingale's nest.
 *
 * `density` is a dial from 0 to 1 that trades fidelity for time: the hero runs high, small
 * decorative fields run low. Contact count scales with canvas area so a wide band and a small
 * tile get the same visual grain rather than the same drop count.
 */
export function composeSheet(
  bath: Bath,
  palette: string[],
  seed = 7,
  opts: { density?: number; comb?: boolean; nest?: boolean } = {}
) {
  const rand = seededRandom(seed);
  const { width: w, height: h } = bath;
  const unit = Math.min(w, h);
  const density = Math.max(0.15, Math.min(1, opts.density ?? 1));

  bath.clear();
  if (w <= 0 || h <= 0) return bath;
  bath.ground = palette[0];

  /*
    Coverage is what turns drops into rings. Displacement is area-preserving, so the pigment
    on the sheet is the sum of the drop areas: below 1x the canvas the size shows through, and
    the nested filament only appears once the total runs well past it. This targets ~3x.
  */
  const contacts = Math.round(Math.min(6500, (w * h) / 97) * density);

  const ground = palette[0];
  const inks = palette.length > 1 ? palette.slice(1) : palette;

  /*
    Drop size is solved from the coverage target, not picked from the canvas dimensions.

    Keying the radius off `unit` meant a small tile got tiny drops AND few contacts, so its
    coverage collapsed and the sheet rendered nearly bare — correct on the hero, empty on a
    240px thumbnail. Solving r from N and the area keeps coverage constant at every size:

      N * pi * r^2 = COVERAGE * area   ->   r = sqrt(COVERAGE * area / (N * pi))
  */
  const COVERAGE = 3;
  const solved = Math.sqrt((COVERAGE * w * h) / (Math.max(contacts, 1) * Math.PI));
  /* Kept inside a believable range so it still reads as marbling rather than as confetti. */
  const rMean = Math.max(unit * 0.006, Math.min(unit * 0.05, solved));
  const rMin = rMean * 0.7;
  const rSpan = rMean * 0.6;

  for (let i = 0; i < contacts; i++) {
    const useGround = i % 2 === 0;
    const color = useGround ? ground : inks[i % inks.length];
    bath.drop(rand() * w, rand() * h, rMin + rand() * rSpan, color);
  }

  if (opts.comb !== false) {
    const passes = Math.max(14, Math.round(40 * density));

    /* Across the grain and back — the gel-git. */
    for (let i = 0; i < passes; i++) {
      const y = (h / passes) * (i + 0.5);
      const dir = i % 2 === 0 ? 1 : -1;
      bath.tine(0, y, dir * w, y, unit * 0.036, unit * 0.026, 0.5);
    }

    /* Then down the sheet, which pulls the bands into filaments. */
    const cols = Math.max(11, Math.round(30 * density));
    for (let i = 0; i < cols; i++) {
      const x = (w / cols) * (i + 0.5);
      const dir = i % 2 === 0 ? 1 : -1;
      bath.tine(x, 0, x, dir * h, unit * 0.03, unit * 0.028, 0.52);
    }

    bath.wave(unit * 0.006, unit * 0.16, seed, 'y');
  }

  /* The nightingale's nest: one vortex, off-centre, where the eye lands second. */
  if (opts.nest !== false) {
    /* Placed, not rolled: the nest is the composition's focal point and belongs above and
       left of centre, clear of the float card that sits bottom-right on the hero. */
    bath.swirl(w * 0.4, h * 0.37, unit * 0.34, 1.15);
  }

  /* A few whole drops land last, so they stay round and read as focal rings. */
  const accents = 5;
  for (let i = 0; i < accents; i++) {
    const ink = inks[Math.floor(rand() * inks.length)];
    const cx = w * (0.12 + rand() * 0.76);
    const cy = h * (0.12 + rand() * 0.76);
    const r = unit * (0.012 + rand() * 0.016);
    bath.drop(cx, cy, r * 1.9, ground);
    bath.drop(cx, cy, r, ink);
  }

  return bath;
}
