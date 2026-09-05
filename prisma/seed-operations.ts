/*
  Seed the operational tables: payment methods, delivery zones and rates.

  These are configuration a shop cannot open without — the checkout has to offer *something* —
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
  The three methods the storefront already offers. `connected: false` on every one, and there is
  no field here for a wallet address or an API key — see the note on the model. Turning one on
  controls whether it is listed, never whether it can take money.
*/
const PAYMENT_METHODS = [
  {
    key: 'card',
    label: 'Card',
    notice:
      'Card payment is not connected on this build. Nothing is charged and no card details are transmitted or stored.',
    position: 0,
  },
  {
    key: 'cashapp',
    label: 'Cash App',
    notice:
      'Cash App is not connected on this build. No $Cashtag is shown, because a plausible one here would send real money to the wrong place.',
    position: 1,
  },
  {
    key: 'crypto',
    label: 'Cryptocurrency',
    notice:
      'No wallet address is shown, and that is deliberate. An address here that is nobody’s — or somebody else’s — is the most expensive mistake this page could make.',
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
