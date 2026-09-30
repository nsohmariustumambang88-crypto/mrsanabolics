/*
  Update payment methods: remove Zelle, add Bank Transfer, update notices.

  Run: node --env-file=.env --import tsx prisma/update-payment-methods.ts
*/

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Updating payment methods...\n');

  // Delete Zelle if it exists
  const zelleDeleted = await prisma.paymentMethod.deleteMany({
    where: { key: 'zelle' }
  });

  if (zelleDeleted.count > 0) {
    console.log(`✅ Deleted ${zelleDeleted.count} Zelle payment method(s)`);
  }

  // Update CashApp notice
  const cashappUpdated = await prisma.paymentMethod.update({
    where: { key: 'cashapp' },
    data: { notice: 'Send payment to our CashApp account. Payment details will be sent via email.' }
  });
  console.log('✅ Updated CashApp notice');

  // Create or update Bank Transfer
  const bankTransfer = await prisma.paymentMethod.upsert({
    where: { key: 'bank_transfer' },
    update: { notice: 'Transfer funds to our bank account. Payment details will be sent via email.' },
    create: {
      key: 'bank_transfer',
      label: 'Bank Transfer',
      notice: 'Transfer funds to our bank account. Payment details will be sent via email.',
      position: 1,
      connected: false,
    }
  });
  console.log('✅ Bank Transfer payment method configured');

  // List all payment methods
  const methods = await prisma.paymentMethod.findMany({ orderBy: { position: 'asc' } });
  console.log('\n📋 Current payment methods:');
  methods.forEach(m => {
    console.log(`  - ${m.label} (${m.key}): "${m.notice}"`);
  });
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
