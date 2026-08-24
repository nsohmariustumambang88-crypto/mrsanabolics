/*
  Create or update an admin account.

  Run: npm run admin:create -- you@example.com "Your Name"

  With no password argument it generates a strong one and prints it ONCE. That is deliberate:
  a password you choose under time pressure is usually weaker than one you are handed, and
  printing it once forces it into a password manager rather than leaving it in a file.

  The plaintext is never stored — only a bcrypt hash goes to the database. If the account
  already exists, its password is reset and sessionVersion is bumped, which immediately
  invalidates every outstanding session for that user.
*/

import { randomBytes } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { hashPassword, checkPasswordStrength } from '../lib/auth/password';

const prisma = new PrismaClient();

/**
 * A readable passphrase beats a short scramble: it survives being typed by hand and is far
 * harder to brute force. Character classes are avoided on purpose — they encourage
 * predictable substitutions without adding real entropy.
 */
function generatePassword(): string {
  const words = [
    'floated', 'pigment', 'indigo', 'madder', 'saffron', 'lattice', 'harbour', 'cobalt',
    'thicket', 'ferment', 'kestrel', 'basalt', 'marrow', 'juniper', 'cinder', 'plumb',
    'verdigris', 'lantern', 'quarry', 'tessera', 'meridian', 'alkali', 'foxglove', 'sable',
  ];

  const pick = () => words[randomBytes(2).readUInt16BE(0) % words.length];
  const digits = String(randomBytes(2).readUInt16BE(0) % 10000).padStart(4, '0');

  return `${pick()}-${pick()}-${pick()}-${digits}`;
}

async function main() {
  const [emailArg, nameArg, passwordArg] = process.argv.slice(2);

  if (!emailArg) {
    console.error('Usage: npm run admin:create -- <email> [name] [password]');
    process.exit(1);
  }

  const email = emailArg.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    console.error(`"${email}" does not look like an email address.`);
    process.exit(1);
  }

  const password = passwordArg ?? generatePassword();
  const generated = !passwordArg;

  const problem = checkPasswordStrength(password);
  if (problem) {
    console.error(`Password rejected: ${problem}`);
    process.exit(1);
  }

  const passwordHash = await hashPassword(password);
  const existing = await prisma.adminUser.findUnique({ where: { email } });

  const user = await prisma.adminUser.upsert({
    where: { email },
    create: { email, name: nameArg ?? null, passwordHash },
    update: {
      passwordHash,
      name: nameArg ?? undefined,
      /* Reset invalidates every session issued under the old password. */
      sessionVersion: { increment: 1 },
    },
  });

  const rule = '─'.repeat(58);
  console.log('');
  console.log(rule);
  console.log(existing ? '  ADMIN PASSWORD RESET' : '  ADMIN ACCOUNT CREATED');
  console.log(rule);
  console.log(`  Sign in at   /admin/login`);
  console.log(`  Email        ${user.email}`);
  if (generated) {
    console.log(`  Password     ${password}`);
    console.log('');
    console.log('  This is shown once and is not stored anywhere in plaintext.');
    console.log('  Put it in a password manager now.');
  } else {
    console.log('  Password     (the one you supplied)');
  }
  if (existing) {
    console.log('');
    console.log('  Every existing session for this account has been signed out.');
  }
  console.log(rule);
  console.log('');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
