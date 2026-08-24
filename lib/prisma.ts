import { PrismaClient } from '@prisma/client';

/*
  One client per process.

  Next's dev server hot-reloads modules on every edit. A `new PrismaClient()` at module scope
  would therefore open a fresh connection pool on each reload until Postgres refuses new
  connections — the classic dev-only exhaustion. Caching it on globalThis survives the reload;
  in production the module is evaluated once and the global is never touched.
*/

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['warn', 'error']
        : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
