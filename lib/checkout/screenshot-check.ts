import 'server-only';

import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';

/*
  Reads a customer's Cash App screenshot and decides whether it shows a payment to us, for this
  order (the owner's rule, 18 November 2026: confirm a Cash App order only once the screenshot
  shows our Cash App name). Used by the payment-proof route; passing confirms the order and sends
  the customer their "Order Confirmed" email.

  PASSES only when the text read from the picture contains ALL of:
  - our account name (every word of it, allowing one misread letter in longer words) or our
    $Cashtag;
  - the order's exact amount with a dollar sign (a payment to us of some other amount is not
    payment for this order);
  and NONE of the words Cash App uses for a payment that did not go through (failed, declined,
  cancelled, refunded, pending) or a request rather than a payment.

  What this cannot know: whether the money actually arrived. A screenshot is easy to edit, and
  Cash App gives a personal account no way for a website to check its payments. The admin email
  says so on every automatic confirmation, and staff should look at the Cash App balance before
  they ship. Failing is the safe direction: the order simply waits for a person, as before.

  The text is read on our own server (tesseract.js), so the picture goes to no third party
  beyond Cloudinary, where it is already stored privately.
*/

export type ScreenshotVerdict = {
  passed: boolean;
  /** One short sentence per finding, for the order history and the admin email. */
  findings: string[];
  /** SHA-256 of the image bytes, to catch one screenshot sent for two orders. */
  sha256: string;
};

const BLOCKING = ['failed', 'declined', 'canceled', 'cancelled', 'refunded', 'pending', 'request', 'requested'];

/** Edit distance, for OCR's one-letter slips ("Mcwaln" for "Mcwain"). */
function distance(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i += 1) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const temp = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = temp;
    }
  }
  return row[b.length];
}

function words(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9$]+/g, ' ')
    .split(' ')
    .filter(Boolean);
}

function hasWord(found: string[], wanted: string): boolean {
  const slack = wanted.length >= 5 ? 1 : 0;
  return found.some((w) => distance(w.replace(/^\$/, ''), wanted) <= slack);
}

/** "$255", "$255.00", "$1,050.50" — OCR often reads "$" as "S" or "s". */
function amountPattern(total: number): RegExp {
  const [dollars, cents] = total.toFixed(2).split('.');
  const grouped = dollars.replace(/\B(?=(\d{3})+(?!\d))/g, ',?');
  const tail = cents === '00' ? '(?:[.,]00)?' : `[.,]${cents}`;
  return new RegExp(`(?:^|[^0-9])[$sS]\\s?${grouped}${tail}(?![0-9])`);
}

/** The rule itself, on text already read from the picture. Pure, so it can be tested. */
export function judgeScreenshotText(
  text: string,
  expected: { name: string | null; tag: string; total: number }
): { passed: boolean; findings: string[] } {
  const found = words(text);
  const findings: string[] = [];

  const nameWords = words(expected.name ?? '');
  const nameOk = nameWords.length > 0 && nameWords.every((w) => hasWord(found, w));
  const tagOk = hasWord(found, expected.tag.replace(/^\$/, '').toLowerCase());
  if (nameOk || tagOk) {
    findings.push(`Shows our Cash App ${nameOk ? `name (${expected.name})` : `tag (${expected.tag})`}.`);
  } else {
    findings.push(`Our Cash App name or tag was not found.`);
  }

  const amountOk = amountPattern(expected.total).test(text);
  findings.push(
    amountOk
      ? `Shows the order amount, $${expected.total.toFixed(2)}.`
      : `The order amount, $${expected.total.toFixed(2)}, was not found.`
  );

  const blocking = BLOCKING.filter((w) => found.includes(w));
  if (blocking.length) findings.push(`Contains "${blocking.join('", "')}".`);

  return { passed: (nameOk || tagOk) && amountOk && blocking.length === 0, findings };
}

/*
  Reads the picture twice at most: as it is, then inverted, because Cash App's dark mode puts
  pale text on black and the reader does better with dark text on light.
*/
async function readText(image: Buffer): Promise<string[]> {
  const sharp = (await import('sharp')).default;
  const { createWorker } = await import('tesseract.js');
  const base = sharp(image).rotate().resize({ width: 1400, withoutEnlargement: false }).grayscale().normalize();
  const plain = await base.clone().png().toBuffer();
  const inverted = await base.clone().negate().png().toBuffer();

  const worker = await createWorker('eng', 1, { cachePath: tmpdir() });
  try {
    const texts: string[] = [];
    for (const variant of [plain, inverted]) {
      const { data } = await worker.recognize(variant);
      texts.push(data.text ?? '');
    }
    return texts;
  } finally {
    await worker.terminate().catch(() => {});
  }
}

const TIMEOUT_MS = 40_000;

export async function checkCashAppScreenshot(
  image: Buffer,
  expected: { name: string | null; tag: string; total: number }
): Promise<ScreenshotVerdict> {
  const sha256 = createHash('sha256').update(image).digest('hex');
  try {
    const texts = await Promise.race([
      readText(image),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timed out')), TIMEOUT_MS)),
    ]);
    /* Either reading may pass; the findings shown are from the better one. */
    const verdicts = texts.map((t) => judgeScreenshotText(t, expected));
    const best = verdicts.find((v) => v.passed) ?? verdicts[verdicts.length - 1];
    return { ...best, sha256 };
  } catch (error) {
    console.error('[screenshot check] could not read the picture:', error);
    return { passed: false, findings: ['The picture could not be read automatically.'], sha256 };
  }
}
