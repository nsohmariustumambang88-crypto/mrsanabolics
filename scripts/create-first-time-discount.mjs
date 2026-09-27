import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createDiscount() {
  try {
    const now = new Date();
    const twoYearsFromNow = new Date(now.getTime() + 2 * 365 * 24 * 60 * 60 * 1000);

    const discount = await prisma.discount.upsert({
      where: { code: 'WELCOME15' },
      update: {
        description: 'First time subscriber discount - 15% off',
        status: 'ACTIVE',
        startsAt: now,
        endsAt: twoYearsFromNow,
      },
      create: {
        code: 'WELCOME15',
        description: 'First time subscriber discount - 15% off',
        type: 'PERCENTAGE',
        value: 15,
        status: 'ACTIVE',
        startsAt: now,
        endsAt: twoYearsFromNow,
        minSubtotal: 0,
        perContactLimit: 1, // Only once per customer
      },
    });

    console.log('✅ Discount created/updated:');
    console.log(`  Code: ${discount.code}`);
    console.log(`  Value: ${discount.value}% off`);
    console.log(`  Status: ${discount.status}`);
    console.log(`  Max uses per contact: ${discount.perContactLimit}`);
  } catch (error) {
    console.error('❌ Error creating discount:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createDiscount();
