/*
  Update the crypto payment method notice to remove USDT.

  Run: npx ts-node --env-file=.env prisma/update-crypto-notice.ts
*/

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const updated = await prisma.paymentMethod.update({
    where: { key: 'crypto' },
    data: { notice: 'Pay with Bitcoin or Ethereum. You will be redirected to complete payment securely.' }
  });

  console.log('✅ Updated crypto payment method notice');
  console.log(`   Old notice had USDT, new notice is: "${updated.notice}"`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
