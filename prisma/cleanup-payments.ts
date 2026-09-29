import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Delete old payment methods
  const deleted = await prisma.paymentMethod.deleteMany({
    where: { key: { in: ['card', 'bitcoin', 'ethereum', 'tron'] } }
  });
  console.log(`✅ Deleted ${deleted.count} old payment methods`);

  // Update crypto notice
  await prisma.paymentMethod.update({
    where: { key: 'crypto' },
    data: { notice: 'Bitcoin, Ethereum and USDT payments accepted via NOWPayments.' }
  });
  console.log('✅ Updated crypto notice');

  // List remaining methods
  const methods = await prisma.paymentMethod.findMany({ orderBy: { position: 'asc' } });
  console.log('\n✅ Current payment methods:');
  methods.forEach(m => console.log(`  - ${m.label} (${m.key})`));
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
