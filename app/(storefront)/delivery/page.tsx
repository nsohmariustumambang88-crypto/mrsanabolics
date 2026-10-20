import type { Metadata } from 'next';
import Link from 'next/link';
import { getDeliverySummary } from '@/lib/delivery/summary';
import { COUNTRY_PAGES } from '@/lib/delivery/country-pages';
import { formatPrice } from '@/lib/format';
import { SITE } from '@/lib/site';
import { CollectionBreadcrumb, SectionTitle } from '@/components/shop/collection-sections';

/*
  /delivery: every active delivery zone, the countries it names and its rates, read from the
  delivery tables — the same ones the checkout quotes from. The country selector and the footer
  link here for any country without a page of its own.
*/

export const revalidate = 3600;

const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });
const countryName = (code: string) => {
  try {
    return regionNames.of(code) ?? code;
  } catch {
    return code;
  }
};

export async function generateMetadata(): Promise<Metadata> {
  const zones = await getDeliverySummary();
  const cheapest = zones.flatMap((z) => z.rates).sort((a, b) => a.price - b.price)[0];
  const title = 'Delivery by country: prices and times';
  const description = cheapest
    ? `Tracked delivery from ${formatPrice(cheapest.price)}. Every delivery zone, the countries it covers, and the price and time of each option.`
    : 'Every delivery zone, the countries it covers, and the price and time of each option.';
  return {
    title,
    description,
    alternates: { canonical: '/delivery' },
    openGraph: { type: 'website', url: `${SITE.url}/delivery`, title, description },
  };
}

export default async function DeliveryIndexPage() {
  const zones = await getDeliverySummary();
  const pages = new Map(COUNTRY_PAGES.map((p) => [p.code as string, p]));

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE.url },
      { '@type': 'ListItem', position: 2, name: 'Delivery', item: `${SITE.url}/delivery` },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <CollectionBreadcrumb trail={[{ name: 'Delivery' }]} />

      <section className="border-b border-rule">
        <div className="mx-auto max-w-[86rem] px-4 py-12 sm:px-6 lg:px-10 lg:py-16">
          <h1 className="font-display text-[clamp(2rem,4vw,3.25rem)] font-semibold leading-[1.02] tracking-[-0.04em]">
            Delivery by country
          </h1>
          <p className="measure mt-4 text-sm leading-relaxed text-ink-soft sm:text-base">
            Every order is sent tracked. Prices are in US dollars and checkout is charged in USD; it quotes delivery
            again for your basket and address.
          </p>
          <p className="mt-4 flex flex-wrap gap-2">
            {COUNTRY_PAGES.map((p) => (
              <Link
                key={p.slug}
                href={`/delivery/${p.slug}`}
                className="border border-rule px-3 py-1.5 text-sm text-ink-soft transition-colors hover:border-pigment-indigo-lift hover:text-ink"
              >
                {p.shortName}: prices and the law
              </Link>
            ))}
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-[86rem] space-y-12 px-4 py-12 sm:px-6 lg:px-10 lg:py-16">
        {zones.length === 0 ? (
          <p className="text-sm text-ink-soft">The delivery zones could not be read just now. Try again in a moment.</p>
        ) : (
          zones.map((zone, zi) => (
            <section key={zone.name} aria-labelledby={`zone-${zi}`}>
              <SectionTitle id={`zone-${zi}`}>{zone.countries.length === 0 ? 'Everywhere else' : zone.name}</SectionTitle>
              <p className="measure mt-2 text-sm leading-relaxed text-ink-soft">
                {zone.countries.length === 0
                  ? 'Countries not named in another zone.'
                  : zone.countries.map((c, i) => {
                      const page = pages.get(c);
                      return (
                        <span key={c}>
                          {i > 0 && ', '}
                          {page ? (
                            <Link href={`/delivery/${page.slug}`} className="text-pigment-indigo underline decoration-rule-strong underline-offset-[3px]">
                              {countryName(c)}
                            </Link>
                          ) : (
                            countryName(c)
                          )}
                        </span>
                      );
                    })}
              </p>
              <ul className="mt-4 max-w-3xl divide-y divide-rule border-y border-rule">
                {zone.rates.map((r) => (
                  <li key={r.name} className="grid gap-1 py-3 text-sm sm:grid-cols-[14rem_8rem_minmax(0,1fr)] sm:gap-6">
                    <span className="font-medium">{r.name}</span>
                    <span className="font-mono text-xs tabular">{formatPrice(r.price)}</span>
                    <span className="text-ink-soft">
                      {[r.estimate, r.freeOver !== null ? `free on orders of ${formatPrice(r.freeOver)} or more` : '']
                        .filter(Boolean)
                        .join('; ')}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
      </div>
    </>
  );
}
