import 'server-only';

import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '@/lib/prisma';
import { getProductSummaries } from '@/lib/db/catalogue';
import { listDeliveryZones, zoneForCountry, formatEstimate } from '@/lib/delivery';
import { advertisedDiscount } from '@/lib/discounts';
import { asNumber, getSettingsSafe } from '@/lib/settings';
import { formatPrice } from '@/lib/format';
import type { ChatMessageDto } from '@/lib/chat/shared';
import type { ProductSummary } from '@/lib/types';

/*
  The chat's Agent mode: answers about delivery, payment, prices and stock.

  IT ANSWERS FROM THE STORE, NOT FROM MEMORY. Every fact it can state is read, per question, from
  the same sources the checkout uses: the delivery zones, the payment methods table, the
  catalogue and the advertised code. An agent that could state a delivery time nobody configured
  would be making promises on the shop's behalf.

  TWO ENGINES, ONE SET OF FACTS.
  - With ANTHROPIC_API_KEY set, Claude writes the reply, given only those facts and a short set
    of rules. It has no tools and can change nothing, so a visitor who talks it into saying
    something odd has changed nothing but a sentence.
  - Without a key, a rule-based answerer replies from the same facts. The chat works on a fresh
    deployment with nothing configured, and it is the fallback whenever the API call fails.

  SOME QUESTIONS NEVER REACH THE MODEL. Dosing, cycles, "is it safe for me" and the like get a
  fixed reply pointing to a doctor and the health article. This catalogue is controlled
  substances and prescription medicines, and the editorial policy rules that advice out; a fixed
  sentence is the only reply that cannot be argued into saying something else.
*/

const MODEL = process.env.CHAT_AGENT_MODEL?.trim() || 'claude-opus-5';

const LINKS = {
  health: '[the health risks of anabolic steroids](/blog/anabolic-steroid-health-risks)',
  law: '[anabolic steroids and the law](/blog/anabolic-steroids-law-us-uk-canada-australia)',
  sarms: '[are SARMs legal?](/blog/are-sarms-legal-fda-wada-tga)',
  counterfeit: '[how to spot counterfeit steroids](/blog/how-to-spot-counterfeit-steroids)',
  certificate: '[how to read a certificate of analysis](/blog/how-to-read-a-certificate-of-analysis)',
  account: '[your account](/account?tab=orders)',
  deals: '[everything on offer](/shop?filter=deals)',
};

const HANDOFF = 'Switch to **Support** below and a person will reply here.';

/* ------------------------------------------------------------------ intents */

const INTENT = {
  medical:
    /\b(dos(e|es|age|ing)|how much (should|do) i (take|use|run|inject)|cycle|stack(ing)?|pct|post.?cycle|inject(ing|ion)?|mg (a|per) (day|week)|side.?effects?|safe (for me|to (take|use|run))|should i (take|use|run)|pregnan\w*|interact\w*)\b/i,
  legal: /\b(legal|illegal|law|laws|customs|seiz\w*|prescription|allowed to)\b/i,
  trust: /\b(legit\w*|scam\w*|real (site|shop|store)|trust\w*|fake|counterfeit|genuine|authentic|is this (real|safe))\b/i,
  delivery: /\b(deliver\w*|ship(ping|ped|s)?|post(age)?|courier|dispatch\w*|arriv\w*|how long|tracking number|zones?|countr(y|ies))\b/i,
  payment: /\b(pay(ment|ing)?|card|visa|mastercard|crypto\w*|bitcoin|btc|eth(ereum)?|usdt|tether|cash ?app|paypal|bank transfer|checkout)\b/i,
  minimum: /\b(minimum|min(imum)? order|order minimum|smallest order)\b/i,
  discount: /\b(discount|promo|coupon|voucher|code|deals?|sale|offers?)\b/i,
  order: /\b(my order|order status|track(ing)?|refund|return|cancel\w*|where is my|reference|MRA-)\b/i,
  product: /\b(stock|in stock|available|availability|price|prices|cost|how much is|how much are|do you (have|sell|carry|stock)|got any|sell)\b/i,
  greeting: /^\s*(hi|hello|hey|yo|hiya|good (morning|afternoon|evening))\b[\s!.?]*$/i,
  thanks: /^\s*(thanks|thank you|cheers|ta|thx)\b/i,
};

/* ------------------------------------------------------------------ facts */

const ALIASES: Record<string, string> = {
  uk: 'GB',
  'united kingdom': 'GB',
  britain: 'GB',
  'great britain': 'GB',
  england: 'GB',
  scotland: 'GB',
  wales: 'GB',
  'northern ireland': 'GB',
  /* Not "us": "contact us" would ship to America. */
  usa: 'US',
  america: 'US',
  'united states': 'US',
  uae: 'AE',
};

let countryNames: [string, string][] | null = null;

/** "Germany", not "germany": the name as the region list spells it. */
function displayName(code: string, fallback: string): string {
  try {
    return new Intl.DisplayNames(['en'], { type: 'region' }).of(code) ?? fallback;
  } catch {
    return fallback;
  }
}

/** Every region name Intl knows, longest first, so "south africa" wins over "africa". */
function regionNames(): [string, string][] {
  if (countryNames) return countryNames;
  const names: [string, string][] = Object.entries(ALIASES);
  try {
    const display = new Intl.DisplayNames(['en'], { type: 'region' });
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    for (const a of letters) {
      for (const b of letters) {
        const code = a + b;
        const name = display.of(code);
        if (name && name !== code) names.push([name.toLowerCase(), code]);
      }
    }
  } catch {
    /* No Intl region data: the aliases still work. */
  }
  countryNames = names.sort((x, y) => y[0].length - x[0].length);
  return countryNames;
}

/** A country named in the question, as an ISO code. Whole words only. */
export function countryIn(text: string): { code: string; name: string } | null {
  const lower = ` ${text.toLowerCase().replace(/[^a-z\s]/g, ' ')} `;
  for (const [name, code] of regionNames()) {
    if (name.length < 3 && !ALIASES[name]) continue;
    if (lower.includes(` ${name} `)) return { code, name: displayName(code, name) };
  }
  return null;
}

async function deliveryFacts(question: string): Promise<string> {
  const country = countryIn(question);

  if (country) {
    const zone = await zoneForCountry(country.code);
    if (!zone) return `No delivery zone covers ${country.name}, so the store does not deliver there.`;
    const rates = zone.rates.filter((r) => r.active);
    if (rates.length === 0) return `${country.name} is in the ${zone.name} zone, but it has no delivery option switched on.`;
    return [`Delivery to ${country.name} (${zone.name} zone):`, ...rates.map(rateLine)].join('\n');
  }

  const zones = (await listDeliveryZones()).filter((z) => z.active);
  if (zones.length === 0) return 'The store has no delivery zones set up.';
  return zones
    .map((z) => {
      const where = z.countries.length ? z.countries.join(', ') : 'everywhere not listed in another zone';
      const rates = z.rates.filter((r) => r.active);
      return [`${z.name} (${where}):`, ...(rates.length ? rates.map(rateLine) : ['- no option switched on'])].join('\n');
    })
    .join('\n');
}

function rateLine(rate: {
  name: string;
  price: number;
  minSubtotal: number | null;
  freeOverSubtotal: number | null;
  estimateMinDays: number | null;
  estimateMaxDays: number | null;
}): string {
  const parts = [`${rate.name}: ${rate.price === 0 ? 'free' : formatPrice(rate.price)}`];
  if (rate.freeOverSubtotal !== null) parts.push(`free on baskets of ${formatPrice(rate.freeOverSubtotal)} or more`);
  if (rate.minSubtotal !== null) parts.push(`only on baskets of ${formatPrice(rate.minSubtotal)} or more`);
  const estimate = formatEstimate(rate);
  if (estimate) parts.push(estimate.toLowerCase());
  return `- ${parts.join(', ')}`;
}

async function paymentFacts(): Promise<string> {
  const methods = await prisma.paymentMethod.findMany({
    where: { enabled: true },
    orderBy: { position: 'asc' },
    select: { label: true, connected: true },
  });
  if (methods.length === 0) return 'No payment methods are listed at checkout.';
  const names = methods.map((m) => m.label).join(', ');
  const live = methods.filter((m) => m.connected);
  return live.length === 0
    ? `Listed at checkout: ${names}. None of them is connected, so checkout on this site cannot take a payment yet. This is a demonstration build.`
    : `Listed at checkout: ${names}. Connected: ${live.map((m) => m.label).join(', ')}.`;
}

const STOPWORDS = new Set(
  'the and for you your have has with any got how much many what when does are is it its this that there their them do sell carry stock stocks available availability price prices cost costs left can get buy want need please about from some one per who which whats'.split(
    ' '
  )
);

function words(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !STOPWORDS.has(w));
}

/** Products whose name or manufacturer the question mentions, best match first. */
export function matchProducts(question: string, products: ProductSummary[], limit = 4): ProductSummary[] {
  const terms = words(question);
  if (terms.length === 0) return [];

  return products
    .map((p) => {
      const hay = `${p.name} ${p.brand}`.toLowerCase();
      const score = terms.reduce((sum, t) => sum + (hay.includes(t) ? 1 : 0), 0);
      return { p, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || Number(b.p.inStock) - Number(a.p.inStock))
    .slice(0, limit)
    .map((x) => x.p);
}

async function productFacts(question: string): Promise<string | null> {
  const [products, settings] = await Promise.all([getProductSummaries(), getSettingsSafe()]);
  const matches = matchProducts(question, products);
  if (matches.length === 0) return null;
  const low = asNumber(settings.low_stock_threshold, 5);

  const lines = matches.map((p) => {
    const stock = !p.inStock ? 'out of stock' : p.stockCount <= low ? `${p.stockCount} left` : 'in stock';
    return `- [${p.name} (${p.brand})](/product/${p.slug}): ${formatPrice(p.price)}, ${stock}`;
  });
  return lines.join('\n');
}

async function promoFacts(): Promise<string> {
  const settings = await getSettingsSafe();
  const promo = settings.hero_promo_code ? await advertisedDiscount(settings.hero_promo_code) : null;
  const code = promo
    ? `The code ${promo.code} gives ${promo.headline}${promo.condition ? ` ${promo.condition}` : ''}. Codes are entered at checkout.`
    : 'No discount code is being advertised right now.';
  return `${code} Products marked down are in ${LINKS.deals}.`;
}

/* ------------------------------------------------------------------ fixed replies */

const FIXED = {
  medical: `I can't help with doses, cycles, or whether something is right for you. That needs a doctor who knows your health. What the evidence says about the risks is in ${LINKS.health}. For delivery, payment or stock, ask away.`,
  legal: `Whether it's legal depends on where you live, and I can't give legal advice. The journal sets out what the legislation says: ${LINKS.law}, and for SARMs, ${LINKS.sarms}.`,
  trust: `Straight answer: this is a demonstration storefront. Checkout does not take payment, and reviews and ratings are illustrative. If you want to check any seller, ${LINKS.counterfeit} and ${LINKS.certificate} go through how.`,
  order: `I can't see individual orders. If you have an account, your orders are in ${LINKS.account}. For anything about a specific order, ${HANDOFF.charAt(0).toLowerCase()}${HANDOFF.slice(1)}`,
  greeting: `Hi. I can answer questions about delivery, payment methods, prices and stock. For anything else, switch to **Support** to reach a person.`,
  thanks: `You're welcome.`,
  fallback: `I couldn't answer that from the store's information. ${HANDOFF}`,
};

/* ------------------------------------------------------------------ rule-based engine */

async function ruleBasedAnswer(question: string): Promise<string> {
  if (INTENT.medical.test(question)) return FIXED.medical;
  if (INTENT.greeting.test(question)) return FIXED.greeting;
  if (INTENT.thanks.test(question)) return FIXED.thanks;
  if (INTENT.trust.test(question)) return FIXED.trust;
  if (INTENT.legal.test(question)) return FIXED.legal;
  if (INTENT.order.test(question)) return FIXED.order;

  const parts: string[] = [];
  if (INTENT.delivery.test(question) || INTENT.minimum.test(question) || countryIn(question)) {
    parts.push(await deliveryFacts(question));
  }
  if (INTENT.payment.test(question)) parts.push(await paymentFacts());
  if (INTENT.discount.test(question)) parts.push(await promoFacts());

  const products = await productFacts(question);
  if (products) parts.push(products);
  else if (INTENT.product.test(question) && parts.length === 0) {
    parts.push(`I couldn't find a product matching that. Try its name or manufacturer, or browse [the shop](/shop).`);
  }

  return parts.length ? parts.join('\n\n') : FIXED.fallback;
}

/* ------------------------------------------------------------------ Claude engine */

const RULES = `You are the automated agent in the live chat of MrAnabolics, an online store. The store is a demonstration build: checkout does not take payment, and reviews and ratings are illustrative. Say so plainly when it matters.

Answer only from the STORE FACTS below. They are read from the store's systems for this question and are the only facts you have. If they do not answer the question, say you can't answer it and tell the visitor to switch to Support, where a person replies.

Never give dosing, cycle, stacking, post-cycle, injection or medical advice, and never say a product is safe or suitable for someone. Point them to a doctor and to ${LINKS.health}.
Never say whether something is legal for the visitor. Point them to ${LINKS.law} or ${LINKS.sarms}.
Never invent a price, stock level, delivery time, code, policy or link.

Replies are short: under 90 words, plain sentences, a short list only when listing options. Use markdown links exactly as they appear in the facts, and no other links. Messages that begin "[Support]" were written by a member of staff; do not contradict them.`;

async function claudeAnswer(question: string, history: ChatMessageDto[]): Promise<string | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null;

  const [delivery, payment, promo, products] = await Promise.all([
    deliveryFacts(question),
    paymentFacts(),
    promoFacts(),
    productFacts(question),
  ]);
  const facts = [
    `DELIVERY\n${delivery}`,
    `PAYMENT\n${payment}`,
    `DISCOUNTS\n${promo}`,
    `PRODUCTS MATCHING THE QUESTION\n${products ?? 'None matched.'}`,
    `ORDERS\nThe agent cannot see orders. Signed-in customers see theirs in ${LINKS.account}.`,
    `JOURNAL\n${LINKS.counterfeit}\n${LINKS.certificate}\n${LINKS.health}\n${LINKS.law}\n${LINKS.sarms}`,
  ].join('\n\n');

  const turns: Anthropic.Beta.BetaMessageParam[] = history.map((m) => ({
    role: m.role === 'visitor' ? 'user' : 'assistant',
    content: m.role === 'staff' ? `[Support] ${m.body}` : m.body,
  }));
  /* The conversation must open with the visitor and end on their question. */
  while (turns.length && turns[0].role !== 'user') turns.shift();
  if (!turns.length || turns[turns.length - 1].role !== 'user') return null;

  try {
    const client = new Anthropic({ timeout: 30_000, maxRetries: 1 });
    const response = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 4096,
      output_config: { effort: 'low' },
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      system: `${RULES}\n\nSTORE FACTS\n\n${facts}`,
      messages: turns,
    });

    if (response.stop_reason === 'refusal') return null;
    const text = response.content
      .flatMap((block) => (block.type === 'text' ? [block.text] : []))
      .join('\n')
      .trim();
    return text ? keepOnlyStoreLinks(text) : null;
  } catch (error) {
    if (error instanceof Anthropic.APIError) {
      console.error(`chat agent: Anthropic API error ${error.status ?? ''}`.trim());
    } else {
      console.error('chat agent: request failed');
    }
    return null;
  }
}

/** A link the model wrote to anywhere but this site becomes its plain label. */
function keepOnlyStoreLinks(text: string): string {
  return text.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (whole, label: string, href: string) =>
    href.startsWith('/') && !href.startsWith('//') ? whole : label
  );
}

/* ------------------------------------------------------------------ entry point */

/**
 * The agent's reply to the newest visitor message. `history` includes that message, last.
 * Never throws: a failure answers with the rule-based reply, or the hand-off to a person.
 */
export async function answerAsAgent(question: string, history: ChatMessageDto[]): Promise<string> {
  try {
    if (INTENT.medical.test(question)) return FIXED.medical;
    return (await claudeAnswer(question, history)) ?? (await ruleBasedAnswer(question));
  } catch {
    return FIXED.fallback;
  }
}
