import bcrypt from 'bcryptjs';

/*
  Password hashing.

  Node-only: bcrypt cannot run in the edge runtime, which is why this is a separate module
  from lib/auth/session.ts. Middleware verifies sessions at the edge and must never reach
  this file.

  Cost 12 is the current sensible default — roughly a quarter-second per hash on typical
  hardware. That is deliberately slow: it is what makes an offline attack on a leaked hash
  expensive, and it is cheap enough that a human logging in does not notice.
*/

const COST = 12;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, COST);
}

/**
 * Verify a password against a stored hash.
 *
 * bcrypt.compare is constant-time with respect to the hash, so it does not leak how much of
 * the password matched via timing.
 */
export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  try {
    return await bcrypt.compare(plain, hash);
  } catch {
    return false;
  }
}

export type PasswordProblem = string | null;

/**
 * Minimum bar for an admin password.
 *
 * Length does far more work than character-class rules, so this leans on it: a long
 * passphrase beats a short string with a symbol bolted on, and arbitrary composition rules
 * mostly push people toward predictable substitutions.
 */
export function checkPasswordStrength(plain: string): PasswordProblem {
  if (plain.length < 12) return 'Use at least 12 characters.';
  if (plain.length > 200) return 'That is longer than 200 characters.';
  if (/^\s|\s$/.test(plain)) return 'Remove the leading or trailing space.';

  const common = [
    'password', '123456', 'qwerty', 'admin', 'letmein', 'welcome',
    'mranabolics', 'changeme', 'iloveyou', 'monkey',
  ];
  const lowered = plain.toLowerCase();
  if (common.some((c) => lowered.includes(c))) {
    return 'That contains a very common word or phrase. Pick something less guessable.';
  }

  return null;
}
