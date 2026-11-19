/*
  Adds the OCR engine's WebAssembly files to the Cash App screenshot route's function.

  Runs as `postbuild`, after `next build` and before Vercel packages the functions. Vercel puts
  into each function only the files listed in its trace (`<route>.js.nft.json`). The tracer
  follows require() calls, and tesseract.js-core loads its .wasm with a computed fs path, so the
  .wasm never made the list: on 19 November 2026 the live check failed with
  "ENOENT … tesseract-core-simd.wasm" and every screenshot fell back to a person checking it.

  next.config.js has `outputFileTracingIncludes` for exactly this, but in Next 13.5 it is applied
  to pages-router routes only (collect-build-traces.js loops over `pageKeys.pages`), and this
  route is an app route. So the list is extended here instead.

  Non-fatal on purpose: without it the site works and screenshots wait for staff, so a missing
  trace file is a loud warning, never a failed deploy.
*/
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';

const ROOT = process.cwd();
const TRACE = join(ROOT, '.next/server/app/api/orders/[reference]/payment-proof/route.js.nft.json');
const ENGINE = join(ROOT, 'node_modules/tesseract.js-core');

if (!existsSync(TRACE)) {
  console.warn(`[trace-ocr-engine] WARNING: ${relative(ROOT, TRACE)} not found; the screenshot check will not run on this deploy.`);
  process.exit(0);
}
if (!existsSync(ENGINE)) {
  console.warn('[trace-ocr-engine] WARNING: node_modules/tesseract.js-core is missing.');
  process.exit(0);
}

const trace = JSON.parse(readFileSync(TRACE, 'utf8'));
const files = new Set(trace.files ?? []);
const before = files.size;
for (const name of readdirSync(ENGINE)) {
  /* Paths in a trace file are relative to the trace file's own folder, with forward slashes. */
  files.add(relative(dirname(TRACE), join(ENGINE, name)).split('\\').join('/'));
}
trace.files = [...files];
writeFileSync(TRACE, JSON.stringify(trace));
console.log(`[trace-ocr-engine] added ${files.size - before} engine file(s) to the screenshot route's trace.`);
