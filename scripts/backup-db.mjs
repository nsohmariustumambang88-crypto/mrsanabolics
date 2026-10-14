import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();
const outRoot = process.env.BACKUP_DIR ?? join(process.cwd(), 'backups');
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const outDir = join(outRoot, stamp);
mkdirSync(outDir, { recursive: true });

const PAGE = 1000;
const summary = {};

for (const model of Prisma.dmmf.datamodel.models) {
  const key = model.name.charAt(0).toLowerCase() + model.name.slice(1);
  const delegate = prisma[key];
  if (!delegate) continue;

  const hasId = model.fields.some((f) => f.name === 'id');
  const rows = [];

  if (hasId) {
    let cursor;
    for (;;) {
      const page = await delegate.findMany({
        take: PAGE,
        orderBy: { id: 'asc' },
        ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      });
      rows.push(...page);
      if (page.length < PAGE) break;
      cursor = page[page.length - 1].id;
    }
  } else {
    rows.push(...(await delegate.findMany()));
  }

  writeFileSync(join(outDir, `${model.name}.json`), JSON.stringify(rows, null, 2));
  summary[model.name] = rows.length;
}

writeFileSync(join(outDir, '_summary.json'), JSON.stringify({ takenAt: new Date().toISOString(), counts: summary }, null, 2));
console.log(`Backup written to ${outDir}`);
console.log(JSON.stringify(summary, null, 2));
await prisma.$disconnect();
