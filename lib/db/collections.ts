import 'server-only';

import { getCategories, getProducts } from '@/lib/db/catalogue';
import { categoryPath, groupPath, groupSlug } from '@/lib/catalogue/paths';
import type { Product } from '@/lib/types';

/*
  The catalogue as collections: categories, and the compound groups inside them.

  Built in memory from getProducts(), which is memoised per process — so every collection page,
  the shop directory and the sitemap share one read, the same way the brand and product pages do.

  The facts a collection page states (listings, manufacturers, strengths, forms, prices) are all
  computed here from the products themselves, so they cannot drift from what is on sale.
*/

export type CollectionFacts = {
  listings: number;
  inStock: number;
  manufacturers: { name: string; slug: string; listings: number }[];
  strengths: string[];
  forms: string[];
  priceFrom: number | null;
  priceTo: number | null;
};

export type GroupCollection = {
  kind: 'group';
  categorySlug: string;
  categoryName: string;
  slug: string;
  name: string;
  path: string;
  products: Product[];
  facts: CollectionFacts;
};

export type CategoryCollection = {
  kind: 'category';
  slug: string;
  name: string;
  description: string;
  path: string;
  products: Product[];
  groups: GroupCollection[];
  facts: CollectionFacts;
};

function spec(p: Product, label: string): string | undefined {
  return p.specifications.find((s) => s.label === label)?.value?.trim() || undefined;
}

/** Distinct values in first-seen order after sorting by how often they occur. */
function distinctByFrequency(values: (string | undefined)[]): string[] {
  const counts = new Map<string, number>();
  for (const v of values) if (v) counts.set(v, (counts.get(v) ?? 0) + 1);
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([v]) => v);
}

export function factsFor(products: Product[]): CollectionFacts {
  const makers = new Map<string, { name: string; slug: string; listings: number }>();
  for (const p of products) {
    const m = makers.get(p.brandSlug) ?? { name: p.brand, slug: p.brandSlug, listings: 0 };
    m.listings++;
    makers.set(p.brandSlug, m);
  }
  const prices = products.map((p) => p.price).filter((n) => Number.isFinite(n) && n > 0);
  return {
    listings: products.length,
    inStock: products.filter((p) => p.inStock).length,
    manufacturers: Array.from(makers.values()).sort(
      (a, b) => b.listings - a.listings || a.name.localeCompare(b.name)
    ),
    strengths: distinctByFrequency(products.map((p) => spec(p, 'Strength'))),
    forms: distinctByFrequency(products.map((p) => spec(p, 'Form'))),
    priceFrom: prices.length ? Math.min(...prices) : null,
    priceTo: prices.length ? Math.max(...prices) : null,
  };
}

/** Listing order inside a collection: in stock first, then by manufacturer, then by name. */
function byListingOrder(a: Product, b: Product): number {
  return (
    Number(b.inStock) - Number(a.inStock) ||
    a.brand.localeCompare(b.brand) ||
    a.name.localeCompare(b.name)
  );
}

export async function getCategoryCollections(): Promise<CategoryCollection[]> {
  const [categories, products] = await Promise.all([getCategories(), getProducts()]);

  return categories.map((c) => {
    const inCategory = products.filter((p) => p.categorySlug === c.slug).sort(byListingOrder);

    const byGroup = new Map<string, Product[]>();
    for (const p of inCategory) {
      if (!p.subcategoryName) continue;
      const key = groupSlug(p.subcategoryName);
      byGroup.set(key, [...(byGroup.get(key) ?? []), p]);
    }

    const groups: GroupCollection[] = Array.from(byGroup.entries())
      .map(([slug, list]) => ({
        kind: 'group' as const,
        categorySlug: c.slug,
        categoryName: c.name,
        slug,
        name: list[0].subcategoryName!,
        path: groupPath(c.slug, list[0].subcategoryName!),
        products: list,
        facts: factsFor(list),
      }))
      .sort((a, b) => b.facts.listings - a.facts.listings || a.name.localeCompare(b.name));

    return {
      kind: 'category' as const,
      slug: c.slug,
      name: c.name,
      description: c.description,
      path: categoryPath(c.slug),
      products: inCategory,
      groups,
      facts: factsFor(inCategory),
    };
  });
}

export async function getCategoryCollection(slug: string): Promise<CategoryCollection | null> {
  const all = await getCategoryCollections();
  return all.find((c) => c.slug === slug) ?? null;
}

export async function getGroupCollection(
  categorySlug: string,
  slug: string
): Promise<{ category: CategoryCollection; group: GroupCollection } | null> {
  const category = await getCategoryCollection(categorySlug);
  const group = category?.groups.find((g) => g.slug === slug);
  return category && group ? { category, group } : null;
}
