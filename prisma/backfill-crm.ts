import { PrismaClient } from '@prisma/client';

/*
  Give every existing subscriber a CRM contact.

  Run once after `db:push` adds the CRM tables. Idempotent: it only looks at subscribers with no
  contact yet, so running it twice changes nothing.

  This writes through Prisma directly rather than calling lib/crm/contacts.ts, which carries a
  `server-only` guard that throws in plain Node. That is the same reason lib/cloudinary-upload.ts
  is split from lib/cloudinary-server.ts. A backfill is a migration, and migrations legitimately
  talk to the database rather than through the application's request-time layer.

  The consent record is NOT recreated or altered here — it already exists and is the evidence.
  All this does is attach the person it belongs to.

    node --env-file=.env --import tsx prisma/backfill-crm.ts
*/

const prisma = new PrismaClient();

async function main() {
  const orphans = await prisma.subscriber.findMany({
    where: { contactId: null },
    select: {
      id: true,
      email: true,
      source: true,
      status: true,
      consentAt: true,
      consentText: true,
      consentPath: true,
    },
  });

  if (orphans.length === 0) {
    console.log('Nothing to backfill — every subscriber already has a contact.');
    return;
  }

  console.log(`Backfilling ${orphans.length} subscriber(s)…`);

  for (const subscriber of orphans) {
    await prisma.$transaction(async (tx) => {
      /*
        A contact may already exist for this address if the person also wrote in through the
        contact form. Reuse it — two rows for one address would split their history in half.
      */
      const existing = await tx.contact.findUnique({
        where: { email: subscriber.email },
        select: { id: true },
      });

      const contactId =
        existing?.id ??
        (
          await tx.contact.create({
            data: {
              email: subscriber.email,
              firstSource: `${subscriber.source} sign-up`,
              /* Their real history starts at consent, not at the moment of this backfill. */
              createdAt: subscriber.consentAt,
              lastActivityAt: subscriber.consentAt,
            },
            select: { id: true },
          })
        ).id;

      await tx.subscriber.update({
        where: { id: subscriber.id },
        data: { contactId },
      });

      await tx.contactActivity.create({
        data: {
          contactId,
          type: 'SUBSCRIBED',
          summary: `Subscribed to marketing email via ${subscriber.source}.`,
          detail: subscriber.consentPath
            ? `${subscriber.consentText}\n\nAgreed on ${subscriber.consentPath}`
            : subscriber.consentText,
          occurredAt: subscriber.consentAt,
        },
      });

      if (subscriber.status === 'UNSUBSCRIBED') {
        await tx.contactActivity.create({
          data: {
            contactId,
            type: 'UNSUBSCRIBED',
            summary: 'Unsubscribed from marketing email.',
            detail: 'Recorded during the CRM backfill from the existing subscriber row.',
          },
        });
      }

      console.log(`  ${subscriber.email} -> contact ${contactId}`);
    });
  }

  console.log('Done.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
