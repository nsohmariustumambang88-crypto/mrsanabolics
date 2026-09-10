/*
  Wake the database before a build, and wait until it answers.

  Neon suspends a branch when it is idle and refuses the connection that wakes it. A build is
  the worst place for that to happen: `next build` prerenders hundreds of pages, each one
  reading Postgres, and there is nobody to press the button again. `withWakeRetry` in
  lib/db/catalogue.ts covers a cold start of a second or two, but it gives up after four
  attempts — and a branch that has been asleep for days, or a network that is briefly down,
  takes longer than that. The observed failure is 737 "Can't reach database server" errors and
  a build that runs for eighteen minutes before failing.

  One query here, retried patiently, turns that into a few seconds of waiting.

  DELIBERATELY NON-FATAL. If the database cannot be reached even after all of this, the build
  still starts: the per-read retry may yet succeed, and a page with a `.catch` fallback renders
  regardless. This script exists to remove a common failure, never to add a new one.

  Wired as `prebuild`, so it runs for `npm run build` locally and on the host.
*/

import { readFileSync } from 'node:fs';
import { PrismaClient } from '@prisma/client';

/*
  Load .env if the variable is not already in the environment.

  This runs as `prebuild`, which is BEFORE `next build` — so Next has not loaded .env yet, and
  npm does not do it. On a host the variable is already injected and this is a no-op; locally
  it is the difference between waking the database and silently skipping. The project's own
  note applies: a script that only works because something else happened to load .env is a
  script that breaks the moment it runs first.
*/
function loadEnvFile() {
  if (process.env.DATABASE_URL) return;

  try {
    for (const line of readFileSync('.env', 'utf8').split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/i);
      if (!match) continue;
      const [, key, rawValue] = match;
      if (process.env[key]) continue;
      /* Strip one layer of matching quotes, the way dotenv does. */
      process.env[key] = rawValue.trim().replace(/^(['"])([\s\S]*)\1$/, '$2');
    }
  } catch {
    /* No .env, or unreadable. The env may still carry the variable; main() re-checks. */
  }
}

loadEnvFile();

const ATTEMPTS = 8;
/* Backoff in ms, roughly 60s in total: long enough for a suspended branch to resume. */
const BACKOFF = [500, 1000, 2000, 4000, 6000, 10_000, 15_000, 20_000];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  if (!process.env.DATABASE_URL) {
    console.log('[wake-db] No DATABASE_URL set — skipping.');
    return;
  }

  const prisma = new PrismaClient({ log: [] });
  const started = Date.now();

  try {
    for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
      try {
        /* The cheapest possible round trip: no table needs to exist for this to answer. */
        await prisma.$queryRawUnsafe('select 1');
        console.log(`[wake-db] Database answered in ${Date.now() - started}ms.`);
        return;
      } catch (error) {
        const message = String(error?.message ?? error).split('\n')[0];
        if (attempt === ATTEMPTS) {
          console.warn(
            `[wake-db] Gave up after ${attempt} attempts (${Date.now() - started}ms): ${message}`
          );
          console.warn('[wake-db] Continuing anyway — the build has its own per-read retry.');
          return;
        }
        console.log(`[wake-db] Attempt ${attempt} failed, retrying — ${message}`);
        await sleep(BACKOFF[attempt - 1]);
      }
    }
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
}

/* Never reject: a prebuild step that throws stops a build that would otherwise have worked. */
main().catch((error) => {
  console.warn('[wake-db] Skipped after an unexpected error:', error?.message ?? error);
});
