import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { quoteDelivery, zoneForCountry } from '@/lib/delivery';
import { COUNTRY_PAGES, LAW_ARTICLE, LAW_CHECKED, countryPage } from '@/lib/delivery/country-pages';
import { prisma } from '@/lib/prisma';
import { fitDescription } from '@/lib/catalogue/seo';
import { formatPrice } from '@/lib/format';
import { SITE } from '@/lib/site';
import { ApproxPrice, CurrencyNote } from '@/components/currency/approx-price';
import { CollectionBreadcrumb, SectionTitle } from '@/components/shop/collection-sections';

/*
  Delivery to the United Kingdom, Canada and Australia: /delivery/united-kingdom, /canada,
  /australia. Search Console shows impressions from all three, and a visitor there asks the same
  three things before anything else — can it be sent here, what does that cost, and is it legal.

  The first two are read from the database: the zone that serves the country and its rates come
  through quoteDelivery, the same function the checkout quotes with, so this page cannot promise a
  price the checkout will not charge. The payment methods are the ones the checkout lists.

  The third is a summary of the journal's law article, with that article's primary sources
  (lib/delivery/country-pages.ts). It is in English only for now; these pages have no translation.
*/

type Params = { params: { country: string } };

export const revalidate = 3600;
export const dynamicParams = false;

export function generateStaticParams() {
  return COUNTRY_PAGES.map((c) => ({ country: c.slug }));
}

/** The zone's rates as the checkout would quote them for an empty basket, plus each rate's free-delivery threshold. */
async function deliveryFor(code: string) {
  try {
    const [quote, zone] = await Promise.all([quoteDelivery({ country: code, subtotal: 0 }), zoneForCountry(code)]);
    const freeOver = new Map((zone?.rates ?? []).map((r) => [r.id, r.freeOverSubtotal]));
    return {
      zone: quote.zone,
      options: quote.options.map((o) => ({ ...o, freeOver: freeOver.get(o.rateId) ?? null })),
    };
  } catch {
    return null;
  }
}

async function paymentMethods() {
  return prisma.paymentMethod
    .findMany({ where: { enabled: true }, orderBy: { position: 'asc' }, select: { key: true, label: true, notice: true } })
    .catch(() => []);
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const page = countryPage(params.country);
  if (!page) return {};
  const delivery = await deliveryFor(page.code);
  const cheapest = delivery?.options[0];
  const title = `Delivery to ${page.name}: prices, times and the law`;
  const shipping = cheapest
    ? `Tracked delivery to ${page.name} from ${formatPrice(cheapest.basePrice)}${cheapest.estimate ? `, ${cheapest.estimate.toLowerCase()}` : ''}.`
    : `Delivery options for ${page.name}.`;
  const description = fitDescription([
    `${shipping} ${page.importLine}`,
    `${shipping} What the law says about importing anabolic steroids into ${page.name}.`,
    shipping,
  ]);
  const path = `/delivery/${page.slug}`;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { type: 'website', url: `${SITE.url}${path}`, title, description },
  };
}

export default async function CountryDeliveryPage({ params }: Params) {
  const page = countryPage(params.country);
  if (!page) notFound();
  const [delivery, methods] = await Promise.all([deliveryFor(page.code), paymentMethods()]);
  const path = `/delivery/${page.slug}`;
  const url = `${SITE.url}${path}`;

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE.url },
      { '@type': 'ListItem', position: 2, name: 'Delivery', item: `${SITE.url}/delivery` },
      { '@type': 'ListItem', position: 3, name: page.shortName, item: url },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />

      <CollectionBreadcrumb trail={[{ name: 'Delivery', href: '/delivery' }, { name: page.shortName }]} />

      <section className="border-b border-rule">
        <div className="mx-auto max-w-[86rem] px-4 py-12 sm:px-6 lg:px-10 lg:py-16">
          <h1 className="font-display text-[clamp(2rem,4vw,3.25rem)] font-semibold leading-[1.02] tracking-[-0.04em]">
            Delivery to {page.name}
          </h1>
          <p className="measure mt-4 text-sm leading-relaxed text-ink-soft sm:text-base">
            {delivery?.zone
              ? `Orders to ${page.name} are sent from our ${delivery.zone.isCatchAll ? 'rest-of-world' : delivery.zone.name} delivery zone, tracked. Prices are in US dollars and checkout is charged in USD.`
              : `No delivery option is set up for ${page.name} at the moment.`}
          </p>
          <p className="measure mt-5 border border-rule bg-paper-sunk px-4 py-3 text-sm leading-relaxed text-ink">
            {page.importLine}{' '}
            <a href="#law" className="text-pigment-indigo underline decoration-rule-strong underline-offset-[3px] hover:decoration-pigment-indigo">
              What the law says
            </a>
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-[86rem] space-y-16 px-4 py-12 sm:px-6 lg:px-10 lg:py-16">
        {delivery && delivery.options.length > 0 && (
          <section aria-labelledby="options">
            <SectionTitle id="options">Delivery options and prices</SectionTitle>
            <div className="mt-6 max-w-3xl overflow-x-auto border border-rule bg-card">
              <table className="w-full min-w-[32rem] border-collapse text-left text-sm">
                <caption className="sr-only">Delivery options to {page.name}, with price, time and free-delivery threshold</caption>
                <thead className="bg-paper-sunk">
                  <tr>
                    {['Option', 'Price', 'Time', 'Free on orders of'].map((h) => (
                      <th
                        key={h}
                        scope="col"
                        className="border-b border-rule px-4 py-2.5 font-mono text-2xs font-medium uppercase tracking-[0.12em] text-ink-faint"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {delivery.options.map((o) => (
                    <tr key={o.rateId} className="border-b border-rule last:border-0">
                      <th scope="row" className="px-4 py-2.5 font-medium">
                        {o.name}
                      </th>
                      <td className="px-4 py-2.5 font-mono text-xs tabular">
                        {formatPrice(o.basePrice)}
                        <ApproxPrice usd={o.basePrice} currency={page.currency} className="block font-sans text-2xs" />
                      </td>
                      <td className="px-4 py-2.5 text-ink-soft">{o.estimate || '—'}</td>
                      <td className="px-4 py-2.5 font-mono text-xs text-ink-soft tabular">
                        {o.freeOver !== null ? `${formatPrice(o.freeOver)} or more` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <CurrencyNote currency={page.currency} className="measure mt-3" />
            <p className="measure mt-2 text-xs leading-relaxed text-ink-faint">
              Checkout quotes delivery again for your basket and address. Times are working days after dispatch, as
              set for this zone.
            </p>
          </section>
        )}

        {methods.length > 0 && (
          <section aria-labelledby="payment">
            <SectionTitle id="payment">Payment</SectionTitle>
            <p className="measure mt-2 text-sm leading-relaxed text-ink-soft">
              The payment methods listed at checkout, with the note each one shows there.
            </p>
            <dl className="mt-6 max-w-3xl divide-y divide-rule border-y border-rule">
              {methods.map((m) => (
                <div key={m.key} className="grid gap-1 py-4 sm:grid-cols-[12rem_minmax(0,1fr)] sm:gap-6">
                  <dt className="font-display text-base font-semibold tracking-[-0.015em]">{m.label}</dt>
                  <dd className="text-sm leading-relaxed text-ink-soft">{m.notice}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}

        <section aria-labelledby="law-title" id="law" className="scroll-mt-28">
          <SectionTitle id="law-title">What the law in {page.shortName} says</SectionTitle>
          <p className="measure mt-2 text-sm leading-relaxed text-ink-soft">
            A summary of our{' '}
            <Link
              href={LAW_ARTICLE}
              className="text-pigment-indigo underline decoration-rule-strong underline-offset-[3px] hover:decoration-pigment-indigo"
            >
              guide to steroid law in the US, UK, Canada and Australia
            </Link>
            , which quotes the legislation. General information, checked against the primary legislation in{' '}
            {LAW_CHECKED}; it is not legal advice, and how the law applies to you depends on details this page cannot know.
          </p>
          <div className="mt-6 max-w-3xl space-y-8">
            {page.law.map((block) => (
              <div key={block.heading}>
                <h3 className="font-display text-lg font-semibold tracking-[-0.02em]">{block.heading}</h3>
                <ul className="mt-3 space-y-3">
                  {block.points.map((p) => (
                    <li key={p.text} className="measure text-sm leading-relaxed text-ink-soft">
                      {p.text}
                      <sup className="ml-0.5 font-mono text-2xs">
                        <a href={`#source-${p.source + 1}`} className="text-pigment-indigo hover:underline">
                          [{p.source + 1}]
                        </a>
                      </sup>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <h3 className="mt-10 font-mono text-2xs uppercase tracking-[0.16em] text-ink-faint">Sources</h3>
          <ol className="mt-3 max-w-3xl space-y-2 text-xs leading-relaxed text-ink-soft">
            {page.sources.map((s, i) => (
              <li key={s.url} id={`source-${i + 1}`} className="scroll-mt-28">
                <span className="font-mono text-ink-faint">[{i + 1}]</span>{' '}
                <a href={s.url} rel="noopener" className="underline decoration-rule-strong underline-offset-[3px] hover:text-pigment-indigo">
                  {s.title}
                </a>
                , {s.publisher}
              </li>
            ))}
          </ol>
        </section>

        <p className="text-sm text-ink-soft">
          Other countries:{' '}
          {COUNTRY_PAGES.filter((c) => c.slug !== page.slug).map((c, i) => (
            <span key={c.slug}>
              {i > 0 && ', '}
              <Link href={`/delivery/${c.slug}`} className="underline decoration-rule-strong underline-offset-[3px] hover:text-pigment-indigo">
                {c.shortName}
              </Link>
            </span>
          ))}
          {', '}
          <Link href="/delivery" className="underline decoration-rule-strong underline-offset-[3px] hover:text-pigment-indigo">
            every delivery zone
          </Link>
          .
        </p>
      </div>
    </>
  );
}
