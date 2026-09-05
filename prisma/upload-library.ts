/*
  Upload a folder of product photography into Cloudinary, preserving its structure.

  The source is a directory tree shaped like `<category>/<subcategory?>/<Name - Brand>.<ext>`.
  Every file lands at `mranabolics/library/<category>/<subcategory>/<name-slug>`, so the
  Media Library mirrors the folder on disk and an asset can be found by the same path a
  person would use to find the file.

  This deliberately does NOT write to `mranabolics/products/`. That folder's public IDs are
  product slugs and its uploads are `overwrite: true`; putting library files there under
  guessed names is how one product's image silently replaces another's. Attaching a library
  image to a product is a separate, explicit step.

  Idempotent and resumable. Each upload is `overwrite + invalidate` under a deterministic
  public ID, and a manifest (prisma/image-library.json) records what was uploaded along with
  the source file's size and mtime. A re-run skips files whose entry matches and re-uploads
  only what changed; `--force` re-uploads everything.

  Original formats are kept. `uploadBuffer` in lib/cloudinary-upload.ts defaults to PNG,
  which is right for the flat-colour plates and wrong for photographs — re-encoding a JPEG
  to PNG can triple it, and the plan has a storage cap. Delivery still negotiates AVIF/WebP
  per request through `f_auto`.

  Run: npm run images:upload-library -- "<path to folder>" [--force] [--dry-run]
*/

import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync, writeFileSync, existsSync } from 'node:fs';
import { join, relative, sep, extname, basename } from 'node:path';
import { cloudinary, uploadsConfigured, ASSET_FOLDER } from '../lib/cloudinary-upload';

export const LIBRARY_FOLDER = `${ASSET_FOLDER}/library`;
const MANIFEST_PATH = join(__dirname, 'image-library.json');
const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif']);
const CONCURRENCY = 5;
const RETRIES = 3;

export type LibraryEntry = {
  /** Path relative to the source folder, with forward slashes. */
  source: string;
  /** Cloudinary public ID, e.g. `mranabolics/library/injectables/boldenone/bold-250-ultima-pharma`. */
  publicId: string;
  url: string;
  category: string;
  subcategory: string | null;
  /** File name without extension, as written on disk. */
  title: string;
  /** Best-effort parse of the `Name - Brand` convention; null when the name has no ` - `. */
  brand: string | null;
  format: string;
  width: number;
  height: number;
  bytes: number;
  /** MD5 of the source file, so byte-identical duplicates can be found later. */
  md5: string;
  sourceBytes: number;
  sourceMtimeMs: number;
  uploadedAt: string;
};

type Manifest = {
  folder: string;
  updatedAt: string;
  entries: LibraryEntry[];
};

/** `Clenbuterol 40 - British Dragon` -> `clenbuterol-40-british-dragon`. */
function slugify(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (IMAGE_EXTENSIONS.has(extname(entry.name).toLowerCase())) out.push(full);
  }
  return out;
}

function parseBrand(title: string): string | null {
  // Split on the LAST ` - ` (tolerating a missing space after the dash, as in "TestErow 300 -Crowx Labs").
  const m = title.match(/^(.*\S)\s+-\s*(\S.*)$/);
  return m ? m[2].trim() : null;
}

function readManifest(): Manifest | null {
  if (!existsSync(MANIFEST_PATH)) return null;
  return JSON.parse(readFileSync(MANIFEST_PATH, 'utf8')) as Manifest;
}

function writeManifest(manifest: Manifest): void {
  manifest.entries.sort((a, b) => a.publicId.localeCompare(b.publicId));
  writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n');
}

type Planned = {
  file: string;
  source: string;
  folder: string;
  publicId: string;
  shortId: string;
  category: string;
  subcategory: string | null;
  title: string;
  brand: string | null;
  sourceBytes: number;
  sourceMtimeMs: number;
};

function plan(root: string): Planned[] {
  return walk(root).map((file) => {
    const rel = relative(root, file).split(sep);
    const dirs = rel.slice(0, -1);
    const title = basename(file, extname(file));
    const shortId = slugify(title);
    const folder = [LIBRARY_FOLDER, ...dirs.map(slugify)].join('/');
    const stat = statSync(file);
    return {
      file,
      source: rel.join('/'),
      folder,
      shortId,
      publicId: `${folder}/${shortId}`,
      category: dirs[0] ? slugify(dirs[0]) : 'uncategorised',
      subcategory: dirs[1] ? slugify(dirs[1]) : null,
      title,
      brand: parseBrand(title),
      sourceBytes: stat.size,
      sourceMtimeMs: stat.mtimeMs,
    };
  });
}

async function uploadOne(p: Planned): Promise<LibraryEntry> {
  const buffer = readFileSync(p.file);
  const md5 = createHash('md5').update(buffer).digest('hex');

  let lastError: unknown;
  for (let attempt = 1; attempt <= RETRIES; attempt++) {
    try {
      const result = await cloudinary.uploader.upload(p.file, {
        public_id: p.shortId,
        folder: p.folder,
        overwrite: true,
        invalidate: true,
        resource_type: 'image',
        unique_filename: false,
        use_filename: false,
        tags: ['library', p.category, ...(p.subcategory ? [p.subcategory] : [])],
        context: {
          alt: p.title,
          caption: p.title,
          ...(p.brand ? { brand: p.brand } : {}),
          source: p.source,
        },
      });
      return {
        source: p.source,
        publicId: result.public_id,
        url: result.secure_url,
        category: p.category,
        subcategory: p.subcategory,
        title: p.title,
        brand: p.brand,
        format: result.format,
        width: result.width,
        height: result.height,
        bytes: result.bytes,
        md5,
        sourceBytes: p.sourceBytes,
        sourceMtimeMs: p.sourceMtimeMs,
        uploadedAt: new Date().toISOString(),
      };
    } catch (error) {
      lastError = error;
      if (attempt < RETRIES) await new Promise((r) => setTimeout(r, 1000 * attempt));
    }
  }
  throw lastError;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const force = args.includes('--force');
  const dryRun = args.includes('--dry-run');
  const root = args.find((a) => !a.startsWith('--'));

  if (!root) {
    console.error('Usage: npm run images:upload-library -- "<folder>" [--force] [--dry-run]');
    process.exit(1);
  }
  if (!existsSync(root) || !statSync(root).isDirectory()) {
    console.error(`Not a directory: ${root}`);
    process.exit(1);
  }
  if (!dryRun && !uploadsConfigured) {
    console.error('Cloudinary is not configured. Set NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET in .env.');
    process.exit(1);
  }

  const planned = plan(root);
  console.log(`Found ${planned.length} image files under ${root}`);

  // Two files that slugify to the same public ID would silently overwrite each other. Refuse.
  const byId = new Map<string, Planned[]>();
  for (const p of planned) byId.set(p.publicId, [...(byId.get(p.publicId) ?? []), p]);
  const collisions = [...byId.values()].filter((group) => group.length > 1);
  if (collisions.length) {
    console.error('Refusing to upload: these files would share a public ID:');
    for (const group of collisions) {
      console.error(`  ${group[0].publicId}`);
      for (const p of group) console.error(`    - ${p.source}`);
    }
    process.exit(1);
  }

  const previous = readManifest();
  const previousById = new Map((previous?.entries ?? []).map((e) => [e.publicId, e]));

  const todo = force
    ? planned
    : planned.filter((p) => {
        const prev = previousById.get(p.publicId);
        return !prev || prev.sourceBytes !== p.sourceBytes || prev.sourceMtimeMs !== p.sourceMtimeMs;
      });

  console.log(`${todo.length} to upload, ${planned.length - todo.length} unchanged since last run`);

  if (dryRun) {
    for (const p of todo) console.log(`  ${p.source} -> ${p.publicId}`);
    return;
  }

  const entries = new Map(previousById);
  const failures: { source: string; error: string }[] = [];
  let done = 0;
  let queue = 0;

  const manifest: Manifest = { folder: LIBRARY_FOLDER, updatedAt: new Date().toISOString(), entries: [] };
  const flush = () => {
    manifest.updatedAt = new Date().toISOString();
    manifest.entries = [...entries.values()];
    writeManifest(manifest);
  };

  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (queue < todo.length) {
        const p = todo[queue++];
        try {
          const entry = await uploadOne(p);
          entries.set(entry.publicId, entry);
        } catch (error) {
          const message = error instanceof Error ? error.message : JSON.stringify(error);
          failures.push({ source: p.source, error: message });
          console.error(`  FAILED ${p.source}: ${message}`);
        }
        done++;
        if (done % 25 === 0 || done === todo.length) {
          console.log(`  ${done}/${todo.length}`);
          flush(); // checkpoint, so a crash mid-run leaves a resumable manifest
        }
      }
    })
  );

  flush();

  // Byte-identical duplicates ("foo (1).jpg" next to "foo.jpg") are worth knowing about.
  const byMd5 = new Map<string, LibraryEntry[]>();
  for (const e of entries.values()) byMd5.set(e.md5, [...(byMd5.get(e.md5) ?? []), e]);
  const duplicates = [...byMd5.values()].filter((g) => g.length > 1);

  const totalBytes = [...entries.values()].reduce((n, e) => n + e.bytes, 0);
  console.log('');
  console.log(`Uploaded ${todo.length - failures.length}, failed ${failures.length}.`);
  console.log(`Manifest: ${entries.size} assets, ${(totalBytes / 1e6).toFixed(1)} MB in ${LIBRARY_FOLDER}/ -> ${relative(process.cwd(), MANIFEST_PATH)}`);
  if (duplicates.length) {
    console.log(`${duplicates.length} groups of byte-identical files:`);
    for (const g of duplicates) console.log(`  ${g.map((e) => e.source).join('  ==  ')}`);
  }
  if (failures.length) {
    console.error('Failures (re-run to retry just these):');
    for (const f of failures) console.error(`  ${f.source}: ${f.error}`);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
