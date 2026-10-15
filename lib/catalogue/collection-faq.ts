import { formatPrice } from '@/lib/format';
import type { CategoryCollection, GroupCollection, StrengthPrice } from '@/lib/db/collections';
import type { CategoryCopy } from '@/lib/catalogue/collection-copy';
import type { FaqItem } from '@/components/shop/collection-sections';

/*
  The questions on a collection page, answered from the collection itself.

  Every answer is either computed from the listings (who makes it, what strengths, what it costs)
  or points at the journal article that answers it properly (is it genuine, is it legal). None
  of them says anything about taking a product: no dosing, no cycles, no effects. That is the
  journal's editorial policy, and it binds shop pages at least as tightly as articles.
*/

const COUNTERFEIT = '/blog/how-to-spot-counterfeit-steroids';
const CERTIFICATE = '/blog/how-to-read-a-certificate-of-analysis';
const LAW = '/blog/anabolic-steroids-law-us-uk-canada-australia';
const SARMS = '/blog/are-sarms-legal-fda-wada-tga';

/** "A, B and C", or "A, B, C and 9 more". */
function names(values: string[], max = 8): string {
  const shown = values.slice(0, max);
  const rest = values.length - shown.length;
  if (rest > 0) return `${shown.join(', ')} and ${rest} more`;
  if (shown.length <= 1) return shown.join('');
  return `${shown.slice(0, -1).join(', ')} and ${shown[shown.length - 1]}`;
}

function article(word: string): string {
  return /^[aeiou]/i.test(word) ? 'an' : 'a';
}

function makers(n: number): string {
  return `${n} ${n === 1 ? 'manufacturer' : 'manufacturers'}`;
}

/** Steroids and hormone medicines get the counterfeit guide; everything else, the certificate one. */
function genuineAnswer(label: string, categorySlug: string, groupSlug?: string): FaqItem {
  const steroid = categorySlug === 'injectables' || categorySlug === 'orals';
  const research = groupSlug === 'peptides' || groupSlug === 'sarms';
  return {
    question: `How can I check that ${article(label)} ${label} product is genuine?`,
    answer: research
      ? 'Ask for the certificate of analysis for the exact batch, check that the laboratory that issued it is accredited for that test, and match the batch number on the certificate to the one on the vial.'
      : 'Match the batch number on the pack to the manufacturer’s certificate, use the manufacturer’s own verification code or website where it offers one, and compare the packaging with the photograph on the listing.',
    link: steroid
      ? { href: COUNTERFEIT, label: 'Our guide to spotting counterfeit steroids goes through each check.' }
      : { href: CERTIFICATE, label: 'Our guide to reading a certificate of analysis explains what to look for.' },
  };
}

function legalAnswer(
  label: string,
  copy: CategoryCopy,
  categorySlug: string,
  groupSlug?: string,
  /** A whole category speaks of "these products"; a group names its compound. */
  wholeCategory = false
): FaqItem | null {
  if (groupSlug === 'sarms' || groupSlug === 'peptides') {
    return {
      question: `Are ${label} legal?`,
      answer:
        groupSlug === 'sarms'
          ? 'No SARM is an approved medicine in any country, and regulators treat them differently: the FDA regards them as unapproved drugs, WADA prohibits them in sport, and in Australia they are prescription-only.'
          : 'Most research peptides are not approved medicines, and their legal position differs by country and by peptide.',
      link: { href: SARMS, label: 'Our guide sets out where each regulator stands.' },
    };
  }
  const prescription = copy.prescription || groupSlug === 'growth-hormone';
  if (!prescription) return null;
  const steroid = categorySlug === 'injectables' || categorySlug === 'orals';
  /*
    Steroid answers state each country's control status, as the law article does, rather than
    "prescription-only medicine": trenbolone, boldenone and MENT are not licensed human medicines
    anywhere, so that phrase would be false for half the injectables.
  */
  return steroid
    ? {
        question: `What is the legal position on ${label}?`,
        answer:
          'Anabolic steroids are controlled in the United States (Schedule III), the United Kingdom (Class C), Canada (Schedule IV) and Australia (prescription-only, where possession without authority is an offence). The rules on possession, supply and import differ from one country to the next.',
        link: { href: LAW, label: 'Our guide to steroid law quotes each country’s legislation.' },
      }
    : {
        question: wholeCategory ? 'Do these medicines need a prescription?' : `Do you need a prescription for ${label}?`,
        answer: wholeCategory
          ? 'Yes. Where they are licensed as medicines, they are prescription-only.'
          : `Yes. Where ${label} is licensed as a medicine, it is prescription-only.`,
      };
}

/** A delivery option to the United States, as the delivery zones define it. */
export type UsDeliveryOption = { name: string; price: number; freeOver: number | null; estimate: string };

/** What a group page knows beyond the group itself. Everything in it is read from the database. */
export type GroupFaqContext = {
  /** The compound with its route: "Oral Winstrol (Stanozolol)". */
  title: string;
  byStrength: StrengthPrice[];
  /** The same compound's page in the other category (oral ↔ injectable), when there is one. */
  alternate?: { title: string; path: string; listings: number } | null;
  /** Active delivery options for the US, or null when no zone covers it (or it could not be read). */
  usDelivery?: UsDeliveryOption[] | null;
};

function range(from: number, to: number): string {
  return from === to ? formatPrice(from) : `${formatPrice(from)} to ${formatPrice(to)}`;
}

function deliveryOption(o: UsDeliveryOption): string {
  const details = [
    formatPrice(o.price),
    o.estimate ? o.estimate.charAt(0).toLowerCase() + o.estimate.slice(1) : '',
    o.freeOver !== null ? `free on orders of ${formatPrice(o.freeOver)} or more` : '',
  ].filter(Boolean);
  return `${o.name.toLowerCase()} (${details.join(', ')})`;
}

/** The US delivery answer, from the zones. Steroid pages add the federal position from the law article. */
function usShippingAnswer(label: string, options: UsDeliveryOption[], steroid: boolean): FaqItem {
  const parts = options.map(deliveryOption);
  return {
    question: `Do you ship ${label} to the USA?`,
    answer:
      `Yes. Orders to the United States go by ${
        parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(', ')} or ${parts[parts.length - 1]}`
      }.` +
      (steroid
        ? ' Anabolic steroids are Schedule III controlled substances under US federal law, which prohibits importing them without authorisation and buying them online without a valid prescription.'
        : ''),
    link: steroid ? { href: LAW, label: 'Our guide to steroid law quotes the legislation.' } : undefined,
  };
}

function whereToBuy(label: string, inStock: number, listings: number): FaqItem {
  return {
    question: `Where can I buy ${label}?`,
    answer: `Every listing on this page can be ordered here: open the product, add it to your basket and check out. ${inStock} of ${listings} ${listings === 1 ? 'listing is' : 'listings are'} in stock now. If you have a question before ordering, message us on Telegram or WhatsApp using the buttons at the bottom of the page.`,
  };
}

export function groupFaq(group: GroupCollection, copy: CategoryCopy, ctx: GroupFaqContext): FaqItem[] {
  const f = group.facts;
  const label = group.name;
  const steroid = group.categorySlug === 'injectables' || group.categorySlug === 'orals';
  const items: FaqItem[] = [];

  if (f.priceFrom !== null && f.priceTo !== null) {
    /* The commonest strengths by listing count, each with its own range. */
    const common = [...ctx.byStrength].sort((a, b) => b.listings - a.listings).slice(0, 3);
    const perStrength =
      ctx.byStrength.length > 1
        ? ` By strength: ${common
            .map((s) => `${s.strength}: ${range(s.priceFrom, s.priceTo)} (${s.listings} ${s.listings === 1 ? 'listing' : 'listings'})`)
            .join('; ')}.`
        : '';
    items.push({
      question: `What is the price of ${label}?`,
      answer:
        f.priceFrom === f.priceTo
          ? `${f.listings === 1 ? 'It is listed at' : 'Every listing is priced at'} ${formatPrice(f.priceFrom)}. ${f.inStock} of ${f.listings} ${f.listings === 1 ? 'is' : 'are'} in stock.`
          : `Listed prices run from ${formatPrice(f.priceFrom)} to ${formatPrice(f.priceTo)}, depending on the manufacturer, strength and pack.${perStrength} ${f.inStock} of ${f.listings} listings are in stock.`,
    });
  }

  items.push(whereToBuy(ctx.title, f.inStock, f.listings));
  if (ctx.usDelivery && ctx.usDelivery.length > 0) items.push(usShippingAnswer(label, ctx.usDelivery, steroid));

  if (ctx.alternate) {
    items.push({
      question: `Is ${label} sold as tablets or as an injection?`,
      answer: `This page lists ${ctx.title}: ${f.listings} ${f.listings === 1 ? 'listing' : 'listings'}. ${ctx.alternate.title} is listed separately, with ${ctx.alternate.listings} ${ctx.alternate.listings === 1 ? 'listing' : 'listings'}.`,
      link: { href: ctx.alternate.path, label: `See ${ctx.alternate.title}.` },
    });
  }

  items.push({
    question: `Which manufacturers make ${label}?`,
    answer:
      f.manufacturers.length === 1
        ? `One manufacturer is listed here: ${f.manufacturers[0].name}.`
        : `${makers(f.manufacturers.length)} are listed here: ${names(f.manufacturers.map((m) => m.name))}.`,
  });
  if (f.strengths.length > 0) {
    items.push({
      question: `What strengths of ${label} are listed?`,
      answer: `Listings come in ${names(f.strengths)}. Each product page shows the strength and container exactly as printed on the label.`,
    });
  }
  items.push(genuineAnswer(label, group.categorySlug, group.slug));
  const legal = legalAnswer(label, copy, group.categorySlug, group.slug);
  if (legal) items.push(legal);
  return items;
}

export function categoryFaq(
  category: CategoryCollection,
  copy: CategoryCopy,
  ctx: { usDelivery?: UsDeliveryOption[] | null } = {}
): FaqItem[] {
  const f = category.facts;
  const label = copy.heading.toLowerCase();
  const steroid = category.slug === 'injectables' || category.slug === 'orals';
  const items: FaqItem[] = [
    {
      question: `What is in the ${label} range?`,
      answer:
        category.groups.length > 0
          ? `${f.listings} listings across ${category.groups.length} compounds: ${names(category.groups.map((g) => g.name))}. Each compound has its own page comparing every manufacturer’s version.`
          : `${f.listings} listings from ${makers(f.manufacturers.length)}.`,
    },
    {
      question: `Which manufacturers are listed under ${label}?`,
      answer: `${makers(f.manufacturers.length)}: ${names(f.manufacturers.map((m) => m.name), 12)}.`,
    },
  ];
  if (f.priceFrom !== null && f.priceTo !== null) {
    /* What the largest compounds start at, each computed from its own listings. */
    const from = category.groups
      .filter((g) => g.facts.priceFrom !== null)
      .slice(0, 4)
      .map((g) => `${g.name} from ${formatPrice(g.facts.priceFrom as number)}`);
    items.splice(1, 0, {
      question: `What are the prices of ${label}?`,
      answer:
        `Listed prices run from ${formatPrice(f.priceFrom)} to ${formatPrice(f.priceTo)}, depending on the compound, manufacturer, strength and pack.` +
        (from.length > 0 ? ` For example: ${from.join('; ')}. Each compound page breaks its prices down by strength.` : ''),
    });
  }
  items.push(whereToBuy(label, f.inStock, f.listings));
  if (ctx.usDelivery && ctx.usDelivery.length > 0) items.push(usShippingAnswer(label, ctx.usDelivery, steroid));
  if (category.slug !== 'syringes-needles') items.push(genuineAnswer(label, category.slug));
  const legal = legalAnswer(label, copy, category.slug, undefined, true);
  if (legal) items.push(legal);
  return items;
}
