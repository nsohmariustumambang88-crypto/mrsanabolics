/*
  Seed the operational tables: payment methods, delivery zones and rates.

  These are configuration a shop cannot open without - the checkout has to offer *something* -
  so they ship as sensible defaults that staff then edit in the admin. Idempotent: keyed on the
  natural key, and existing rows are left exactly as the admin has them.

  Site settings are NOT seeded. lib/settings.ts declares a default for every key and falls back
  to it when no row exists, so an unwritten setting and a written-then-reset one behave
  identically. Writing defaults into the table would only create rows nobody chose.

  Run: npm run db:seed-operations
*/

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/*
  Payment methods offered at checkout. `connected: false` on every one - the checkout shows
  whether each method is wired before the visitor tries to use it. Crypto methods carry
  wallet addresses; any address here must be verified to be correct before saving.
*/
const PAYMENT_METHODS = [
  {
    key: 'cashapp',
    label: 'Cash App',
    notice:
      'Send payment to our CashApp account. You will receive order confirmation via email.',
    walletAddress: null,
    position: 0,
  },
  {
    key: 'zelle',
    label: 'Zelle',
    notice:
      'Send payment via Zelle. You will receive order confirmation and shipping details via email.',
    walletAddress: null,
    position: 1,
  },
  {
    key: 'crypto',
    label: 'Cryptocurrency',
    notice: 'Pay with Bitcoin or Ethereum.',
    walletAddress: null,
    position: 2,
  },
];

/*
  Three zones, in the order they are matched: a named-country zone wins over the rest-of-world
  zone, which is the one with an empty country list.
*/
const DELIVERY = [
  {
    name: 'United States',
    countries: ['US'],
    position: 0,
    rates: [
      {
        name: 'Standard tracked',
        price: '9.00',
        freeOverSubtotal: '150.00',
        estimateMinDays: 3,
        estimateMaxDays: 6,
        position: 0,
      },
      {
        name: 'Express tracked',
        price: '24.00',
        estimateMinDays: 1,
        estimateMaxDays: 2,
        position: 1,
      },
    ],
  },
  {
    name: 'Europe',
    countries: ['GB', 'IE', 'FR', 'DE', 'ES', 'IT', 'NL', 'BE', 'PT', 'AT', 'SE', 'DK', 'PL'],
    position: 1,
    rates: [
      {
        name: 'Standard tracked',
        price: '14.00',
        freeOverSubtotal: '200.00',
        estimateMinDays: 5,
        estimateMaxDays: 9,
        position: 0,
      },
      {
        name: 'Express tracked',
        price: '32.00',
        estimateMinDays: 2,
        estimateMaxDays: 4,
        position: 1,
      },
    ],
  },
  {
    /* Empty country list = everywhere not claimed by a zone above. */
    name: 'Rest of world',
    countries: [] as string[],
    position: 2,
    rates: [
      {
        name: 'International tracked',
        price: '22.00',
        estimateMinDays: 7,
        estimateMaxDays: 16,
        position: 0,
      },
    ],
  },
];

async function main() {
  let methodsAdded = 0;
  for (const m of PAYMENT_METHODS) {
    const existing = await prisma.paymentMethod.findUnique({ where: { key: m.key } });
    if (existing) continue;
    await prisma.paymentMethod.create({ data: m });
    methodsAdded++;
  }
  console.log(`  payment methods  ${methodsAdded} added, ${PAYMENT_METHODS.length - methodsAdded} already present`);

  let zonesAdded = 0;
  for (const z of DELIVERY) {
    const existing = await prisma.deliveryZone.findFirst({ where: { name: z.name } });
    if (existing) continue;
    await prisma.deliveryZone.create({
      data: {
        name: z.name,
        countries: z.countries,
        position: z.position,
        rates: { create: z.rates },
      },
    });
    zonesAdded++;
  }
  console.log(`  delivery zones   ${zonesAdded} added, ${DELIVERY.length - zonesAdded} already present`);

  console.log('Done.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
