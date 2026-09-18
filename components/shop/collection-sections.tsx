import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowUpRight, ChevronRight } from 'lucide-react';
import { formatPrice } from '@/lib/format';
import { UNDER_HEADER_INSET } from '@/lib/site';
import { GridFillers } from '@/components/layout/grid-fillers';
import type { CollectionFacts, GroupCollection } from '@/lib/db/collections';
import type { Product } from '@/lib/types';

/*
  Sections of the collection pages (/shop/<category>, /shop/<category>/<group>).

  Server components, deliberately. The shop browser at /shop is built in the visitor's browser,
  and the HTML a crawler received from it held no heading and not one product link. Everything
  here is in the first response: every product, manufacturer and compound is a plain <a>.
*/

export type Crumb = { name: string; href?: string };

export function CollectionBreadcrumb({ trail }: { trail: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="border-b border-rule bg-paper-sunk">
      <ol
        className={`mx-auto flex max-w-[86rem] flex-wrap items-center gap-1.5 font-mono text-2xs uppercase tracking-[0.14em] text-ink-faint ${UNDER_HEADER_INSET}`}
      >
        {trail.map((c, i) => (
          <li key={c.name} className="flex items-center gap-1.5">
            {i > 0 && <ChevronRight className="h-3 w-3" strokeWidth={1.75} aria-hidden="true" />}
            {c.href ? (
              <Link href={c.href} className="transition-colors hover:text-ink">
                {c.name}
              </Link>
            ) : (
              <span className="text-ink-soft" aria-current="page">
                {c.name}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

/** "250 mg/mL – 400 mg/mL"-style ranges read badly; a short list of the commonest reads better. */
function listOf(values: string[], max: number): string {
  if (values.length <= max) return values.join(', ');
  return `${values.slice(0, max).join(', ')} and ${values.length - max} more`;
}

export function priceRange(facts: CollectionFacts): string | null {
  if (facts.priceFrom === null || facts.priceTo === null) return null;
  return facts.priceFrom === facts.priceTo
    ? formatPrice(facts.priceFrom)
    : `${formatPrice(facts.priceFrom)} – ${formatPrice(facts.priceTo)}`;
}

export function CollectionHeader({
  heading,
  intro,
  facts,
  compounds,
}: {
  heading: string;
  intro: string[];
  facts: CollectionFacts;
  compounds?: number;
}) {
  const price = priceRange(facts);
  const items = [
    compounds ? `${compounds} compounds` : null,
    `${facts.listings} ${facts.listings === 1 ? 'listing' : 'listings'}`,
    `${facts.manufacturers.length} ${facts.manufacturers.length === 1 ? 'manufacturer' : 'manufacturers'}`,
    price,
    `${facts.inStock} in stock`,
  ].filter(Boolean);

  return (
    <section className="border-b border-rule">
      <div className="mx-auto max-w-[86rem] px-4 py-12 sm:px-6 lg:px-10 lg:py-16">
        <h1 className="font-display text-[clamp(2rem,4vw,3.25rem)] font-semibold leading-[1.02] tracking-[-0.04em]">
          {heading}
        </h1>
        {intro.map((p, i) => (
          <p key={i} className="measure mt-4 text-sm leading-relaxed text-ink-soft sm:text-base">
            {p}
          </p>
        ))}
        <p className="mt-6 flex flex-wrap gap-x-3 gap-y-1 font-mono text-2xs uppercase tracking-[0.14em] text-ink-faint tabular">
          {items.map((item, i) => (
            <span key={i} className="flex gap-3">
              {i > 0 && <span aria-hidden="true">·</span>}
              {item}
            </span>
          ))}
        </p>
      </div>
    </section>
  );
}

function spec(p: Product, label: string): string {
  return p.specifications.find((s) => s.label === label)?.value ?? '—';
}

/**
 * Every listing in the collection, side by side. The table is the page's reason to exist: the
 * question a shopper arrives with is "who makes this, at what strength, for how much", and a
 * grid of cards answers it one card at a time.
 */
export function ComparisonTable({ products, caption }: { products: Product[]; caption: string }) {
  return (
    <div className="overflow-x-auto border border-rule bg-card">
      <table className="w-full min-w-[40rem] border-collapse text-left text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead className="bg-paper-sunk">
          <tr>
            {['Product', 'Manufacturer', 'Strength', 'Form', 'Price', 'Availability'].map((h) => (
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
          {products.map((p) => (
            <tr key={p.id} className="border-b border-rule last:border-0">
              <th scope="row" className="px-4 py-2.5 font-medium">
                <Link
                  href={`/product/${p.slug}`}
                  className="text-ink underline decoration-rule-strong underline-offset-[3px] transition-colors hover:text-pigment-indigo hover:decoration-pigment-indigo"
                >
                  {p.name}
                </Link>
              </th>
              <td className="px-4 py-2.5 text-ink-soft">
                <Link href={`/brands/${p.brandSlug}`} className="transition-colors hover:text-pigment-indigo">
                  {p.brand}
                </Link>
              </td>
              <td className="px-4 py-2.5 font-mono text-xs text-ink-soft tabular">{spec(p, 'Strength')}</td>
              <td className="px-4 py-2.5 text-ink-soft">{spec(p, 'Form')}</td>
              <td className="px-4 py-2.5 font-mono text-xs text-ink tabular">{formatPrice(p.price)}</td>
              <td className={`px-4 py-2.5 text-xs ${p.inStock ? 'text-pigment-verdigris' : 'text-ink-faint'}`}>
                {p.inStock ? 'In stock' : 'Out of stock'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** The compounds in a category, each a door to its own page. */
export function GroupDirectory({ groups }: { groups: GroupCollection[] }) {
  return (
    <div className="grid gap-px border border-rule bg-rule sm:grid-cols-2 lg:grid-cols-3">
      {groups.map((g) => {
        const price = priceRange(g.facts);
        return (
          <Link
            key={g.slug}
            href={g.path}
            className="group flex flex-col bg-card p-5 transition-colors hover:bg-paper-raised lg:p-6"
          >
            <span className="flex items-start justify-between gap-3">
              <span className="font-display text-base font-semibold leading-snug tracking-[-0.02em] transition-colors group-hover:text-pigment-indigo">
                {g.name}
              </span>
              <ArrowUpRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-faint" strokeWidth={1.75} aria-hidden="true" />
            </span>
            <span className="mt-2 text-xs leading-relaxed text-ink-soft">
              {g.facts.listings} {g.facts.listings === 1 ? 'listing' : 'listings'} from{' '}
              {g.facts.manufacturers.length}{' '}
              {g.facts.manufacturers.length === 1 ? 'manufacturer' : 'manufacturers'}
              {price ? ` · ${price}` : ''}
            </span>
          </Link>
        );
      })}
      <GridFillers len={groups.length} narrow={1} mid={2} midPrefix="sm" wide={3} ground="bg-card" />
    </div>
  );
}

export function ManufacturerList({ facts }: { facts: CollectionFacts }) {
  return (
    <ul className="flex flex-wrap gap-2">
      {facts.manufacturers.map((m) => (
        <li key={m.slug}>
          <Link
            href={`/brands/${m.slug}`}
            className="inline-flex items-baseline gap-2 border border-rule px-3 py-1.5 text-sm text-ink-soft transition-colors hover:border-pigment-indigo-lift hover:text-ink"
          >
            {m.name}
            <span className="font-mono text-2xs text-ink-faint tabular">{m.listings}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export type FaqItem = { question: string; answer: string; link?: { href: string; label: string } };

export function CollectionFaq({ items }: { items: FaqItem[] }) {
  return (
    <dl className="divide-y divide-rule border-y border-rule">
      {items.map((f) => (
        <div key={f.question} className="py-5">
          <dt className="font-display text-base font-semibold tracking-[-0.015em] text-ink">{f.question}</dt>
          <dd className="measure mt-2 text-sm leading-relaxed text-ink-soft">
            {f.answer}
            {f.link && (
              <>
                {' '}
                <Link
                  href={f.link.href}
                  className="text-pigment-indigo underline decoration-rule-strong underline-offset-[3px] transition-colors hover:decoration-pigment-indigo"
                >
                  {f.link.label}
                </Link>
              </>
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function RelatedReading({
  articles,
}: {
  articles: { slug: string; title: string; excerpt: string }[];
}) {
  if (articles.length === 0) return null;
  return (
    <div className="grid gap-px border border-rule bg-rule sm:grid-cols-2">
      {articles.map((a) => (
        <Link
          key={a.slug}
          href={`/blog/${a.slug}`}
          className="group flex flex-col bg-card p-5 transition-colors hover:bg-paper-raised lg:p-6"
        >
          <span className="font-display text-base font-semibold leading-snug tracking-[-0.02em] transition-colors group-hover:text-pigment-indigo">
            {a.title}
          </span>
          <span className="mt-2 line-clamp-2 text-sm leading-relaxed text-ink-soft">{a.excerpt}</span>
        </Link>
      ))}
      <GridFillers len={articles.length} narrow={1} mid={2} midPrefix="sm" wide={2} ground="bg-card" />
    </div>
  );
}

/**
 * Every category and every compound in it, as plain links. Rendered on /shop beneath the
 * browser, so the page carries a crawlable path to every collection — and through them, every
 * product — in its first response, whatever the interactive browser above it does.
 */
export function CatalogueDirectory({
  categories,
}: {
  categories: { slug: string; name: string; path: string; facts: CollectionFacts; groups: GroupCollection[] }[];
}) {
  return (
    <div className="grid gap-px border border-rule bg-rule sm:grid-cols-2 lg:grid-cols-3">
      {categories.map((c) => (
        <div key={c.slug} className="bg-card p-5 lg:p-6">
          <h3 className="font-display text-base font-semibold tracking-[-0.02em]">
            <Link href={c.path} className="transition-colors hover:text-pigment-indigo">
              {c.name}
            </Link>
            <span className="ml-2 font-mono text-2xs font-normal text-ink-faint tabular">{c.facts.listings}</span>
          </h3>
          {c.groups.length > 0 && (
            <ul className="mt-3 space-y-1.5">
              {c.groups.map((g) => (
                <li key={g.slug} className="flex items-baseline justify-between gap-3 text-sm">
                  <Link href={g.path} className="text-ink-soft transition-colors hover:text-pigment-indigo">
                    {g.name}
                  </Link>
                  <span className="font-mono text-2xs text-ink-faint tabular">{g.facts.listings}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
      <GridFillers len={categories.length} narrow={1} mid={2} midPrefix="sm" wide={3} ground="bg-card" />
    </div>
  );
}

export function SectionTitle({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <h2 id={id} className="font-display text-2xl font-semibold tracking-[-0.03em]">
      {children}
    </h2>
  );
}

export { listOf };
