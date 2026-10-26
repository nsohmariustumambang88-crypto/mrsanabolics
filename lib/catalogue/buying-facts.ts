import 'server-only';

import { cache } from 'react';
import { prisma } from '@/lib/prisma';
import { formatPrice, formatPriceShort } from '@/lib/format';
import { MINIMUM_ORDER } from '@/lib/orders/minimum';
import type { ZoneSummary } from '@/lib/delivery/summary';
import type { Product } from '@/lib/types';

/*
  The questions a buyer asks on a product page, answered from the data (SEO plan step 5).

  Price, maker, strength, delivery, payment, returns: each answer is computed from the product
  row, the delivery zones the checkout quotes from, and the payment methods it lists — never
  written by hand, so it cannot drift from what the till does. Rendered on the page and as
  FAQPage structured data. Google no longer shows FAQ rich results, but assistants and the
  search snippet both lift plain question-and-answer text, and these are the questions people
  type ("superbull 500 price", "who makes test-e 400").

  Nothing here is about dosing or effect; the editorial policy applies.
*/

export type BuyingFaq = { question: string; answer: string };

/** The payment methods checkout lists, by label. Empty when the database cannot be read. */
export const getListedPaymentMethods = cache(async (): Promise<string[]> => {
  try {
    const rows = await prisma.paymentMethod.findMany({
      where: { enabled: true },
      orderBy: { position: 'asc' },
      select: { label: true },
    });
    return rows.map((r) => r.label);
  } catch {
    return [];
  }
});

function spec(product: Product, label: string): string | undefined {
  return product.specifications.find((s) => s.label === label)?.value?.trim() || undefined;
}

function list(values: string[]): string {
  if (values.length <= 1) return values.join('');
  return `${values.slice(0, -1).join(', ')} or ${values[values.length - 1]}`;
}

function zoneSentence(zone: ZoneSummary): string | null {
  if (zone.rates.length === 0) return null;
  const where = zone.countries.length === 0 ? 'Everywhere else' : zone.name;
  const rates = zone.rates
    .map((r) => {
      const days = r.estimate ? ` (${r.estimate})` : '';
      const free = r.freeOver ? `, free when the goods come to ${formatPriceShort(r.freeOver)} or more` : '';
      return `${r.name.toLowerCase()} ${formatPriceShort(r.price)}${days}${free}`;
    })
    .join('; ');
  return `${where}: ${rates}.`;
}

export function buyingFaqs(
  product: Product,
  opts: { zones: ZoneSummary[]; paymentMethods: string[]; compound: { name: string; listings: number } | null }
): BuyingFaq[] {
  const faqs: BuyingFaq[] = [];
  const name = product.name;
  const strength = spec(product, 'Strength');
  const form = spec(product, 'Form');

  const compare =
    opts.compound && opts.compound.listings > 1
      ? ` It is one of ${opts.compound.listings} ${opts.compound.name} listings on this site, which can be compared by strength and price.`
      : '';
  faqs.push({
    question: `How much does ${name} cost?`,
    answer: `${name} by ${product.brand} costs ${formatPrice(product.price)} and is ${product.inStock ? 'in stock' : 'currently out of stock'}.${compare}`,
  });

  faqs.push({
    question: `Who makes ${name}?`,
    answer: `${name} is made by ${product.brand}.${strength || form ? ` It is labelled ${[strength, form?.toLowerCase()].filter(Boolean).join(', ')}.` : ''} Check the batch number and expiry date on the pack when it arrives.`,
  });

  const zones = opts.zones.map(zoneSentence).filter((s): s is string => Boolean(s));
  if (zones.length) {
    faqs.push({
      question: `How is ${name} shipped, and what does delivery cost?`,
      answer: `Every order ships tracked, in unmarked packaging. ${zones.join(' ')} Times are estimates in working days.`,
    });
  }

  if (opts.paymentMethods.length) {
    faqs.push({
      question: `How can I pay for ${name}?`,
      answer: `Checkout accepts ${list(opts.paymentMethods)}, and charges in US dollars. The minimum order is ${formatPriceShort(MINIMUM_ORDER)}, counted on the total paid including delivery.`,
    });
  }

  faqs.push({
    question: `Can I return ${name}?`,
    answer: 'Yes. Unopened, sealed products can be returned within 30 days of delivery. The returns policy explains how.',
  });

  return faqs;
}
