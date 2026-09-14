'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { invalidateCatalogue } from '@/lib/db/catalogue';

/*
  Admin mutations.

  EVERY action calls requireAdmin() first. A server action is a public HTTP endpoint with a
  generated URL — being unreachable from the UI is not access control, and middleware does not
  cover it. The check has to be inside the action itself.

  After a write, two caches must be dropped or the site keeps serving the old value for up to
  a minute: the in-process memo in lib/db/catalogue.ts, and Next's rendered route cache.
  `refresh()` does both.
*/

async function refresh(...paths: string[]) {
  invalidateCatalogue();
  for (const path of ['/', '/shop', ...paths]) revalidatePath(path);
}

export type ActionResult = { ok: true } | { ok: false; error: string };

function fail(error: string): ActionResult {
  return { ok: false, error };
}

/** Text inputs arrive as strings; empty means "not provided", not "set to empty". */
function optionalText(form: FormData, key: string): string | undefined {
  const raw = form.get(key);
  if (typeof raw !== 'string') return undefined;
  const trimmed = raw.trim();
  return trimmed.length ? trimmed : undefined;
}

/**
 * Like `optionalText`, but an emptied field CLEARS the column instead of leaving it alone.
 *
 * `optionalText` returns undefined for an empty box, and undefined tells Prisma "do not touch
 * this column" — so an optional value could be set and never removed. A field absent from the
 * form altogether still returns undefined, which is what keeps the two cases apart.
 */
function clearableText(form: FormData, key: string): string | null | undefined {
  return form.has(key) ? (optionalText(form, key) ?? null) : undefined;
}

function requiredText(form: FormData, key: string): string | null {
  return optionalText(form, key) ?? null;
}

function decimalOrNull(form: FormData, key: string): string | null | undefined {
  const raw = form.get(key);
  if (typeof raw !== 'string') return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return undefined;
  return trimmed;
}

/** A checkbox is absent from FormData when unchecked, so absence means false. */
function checkbox(form: FormData, key: string): boolean {
  return form.get(key) !== null;
}

function intOr(form: FormData, key: string, fallback: number): number {
  const raw = form.get(key);
  const n = Number(typeof raw === 'string' ? raw : NaN);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : fallback;
}

export async function updateProduct(
  productId: string,
  form: FormData
): Promise<ActionResult> {
  try {
    await requireAdmin();
  } catch {
    return fail('Your session has expired. Sign in again.');
  }

  const name = requiredText(form, 'name');
  if (!name) return fail('Name cannot be empty.');

  const price = decimalOrNull(form, 'price');
  if (price === undefined || price === null) {
    return fail('Price must be a number with up to two decimal places.');
  }

  const compareAtPrice = decimalOrNull(form, 'compareAtPrice');
  if (compareAtPrice === undefined) {
    return fail('Compare-at price must be a number with up to two decimal places, or blank.');
  }

  if (compareAtPrice !== null && Number(compareAtPrice) <= Number(price)) {
    return fail('Compare-at price should be higher than the price, or blank.');
  }

  const description = requiredText(form, 'description');
  if (!description) return fail('Short description cannot be empty.');

  const stockCount = intOr(form, 'stockCount', 0);
  const inStock = checkbox(form, 'inStock');

  try {
    await prisma.product.update({
      where: { id: productId },
      data: {
        name,
        price,
        compareAtPrice,
        description,
        longDescription: optionalText(form, 'longDescription') ?? undefined,
        directions: optionalText(form, 'directions') ?? undefined,
        shipping: optionalText(form, 'shipping') ?? undefined,
        returns: optionalText(form, 'returns') ?? undefined,
        stockCount,
        /* Stock cannot be "in stock" with nothing on the shelf; the badge would lie. */
        inStock: inStock && stockCount > 0,
        isNew: checkbox(form, 'isNew'),
        isBestSeller: checkbox(form, 'isBestSeller'),
        isTrending: checkbox(form, 'isTrending'),
        isDeal: checkbox(form, 'isDeal'),
      },
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'Could not save.');
  }

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { slug: true },
  });

  await refresh(`/product/${product?.slug ?? ''}`, '/admin/products');
  return { ok: true };
}

export async function setProductImage(
  productId: string,
  publicId: string
): Promise<ActionResult> {
  try {
    await requireAdmin();
  } catch {
    return fail('Your session has expired. Sign in again.');
  }

  const trimmed = publicId.trim();
  if (!trimmed) return fail('No image reference given.');

  const product = await prisma.product.update({
    where: { id: productId },
    data: { images: [trimmed] },
    select: { slug: true },
  });

  await refresh(`/product/${product.slug}`, '/admin/products');
  return { ok: true };
}

export async function updateCategory(id: string, form: FormData): Promise<ActionResult> {
  try {
    await requireAdmin();
  } catch {
    return fail('Your session has expired. Sign in again.');
  }

  const name = requiredText(form, 'name');
  const description = requiredText(form, 'description');
  if (!name || !description) return fail('Name and description are required.');

  await prisma.category.update({
    where: { id },
    data: { name, description, productCount: intOr(form, 'productCount', 0) },
  });

  await refresh('/categories', '/admin/categories');
  return { ok: true };
}

export async function updateBrand(id: string, form: FormData): Promise<ActionResult> {
  try {
    await requireAdmin();
  } catch {
    return fail('Your session has expired. Sign in again.');
  }

  const name = requiredText(form, 'name');
  const description = requiredText(form, 'description');
  if (!name || !description) return fail('Name and description are required.');

  const brand = await prisma.brand.update({
    where: { id },
    data: { name, description, productCount: intOr(form, 'productCount', 0) },
    select: { slug: true },
  });

  await refresh('/brands', `/brands/${brand.slug}`, '/admin/brands');
  return { ok: true };
}

export async function updateBlogPost(id: string, form: FormData): Promise<ActionResult> {
  try {
    await requireAdmin();
  } catch {
    return fail('Your session has expired. Sign in again.');
  }

  const title = requiredText(form, 'title');
  const excerpt = requiredText(form, 'excerpt');
  const content = requiredText(form, 'content');
  if (!title || !excerpt || !content) {
    return fail('Title, excerpt and body are all required.');
  }

  const post = await prisma.blogPost.update({
    where: { id },
    data: {
      title,
      excerpt,
      content,
      category: optionalText(form, 'category') ?? undefined,
      author: optionalText(form, 'author') ?? undefined,
      image: optionalText(form, 'image') ?? undefined,
      imageAlt: optionalText(form, 'imageAlt') ?? undefined,
      /* Emptying one of these clears it — each has a sensible fallback when it is null. */
      metaTitle: clearableText(form, 'metaTitle'),
      metaDescription: clearableText(form, 'metaDescription'),
      imageCredit: clearableText(form, 'imageCredit'),
      /*
        Editing an article is what "updated" means, and search engines read dateModified. The
        date is stamped here rather than typed, because a revision date somebody enters by hand
        is a claim about work, not a record of it.
      */
      updated: new Date(),
    },
    select: { slug: true },
  });

  await refresh('/blog', `/blog/${post.slug}`, '/admin/blog');
  return { ok: true };
}

/* ------------------------------------------------------- create and destroy */

/**
 * Turn a product name into a URL slug, then make it unique.
 *
 * The slug is the product's public address and its Cloudinary public ID, so a collision would
 * silently overwrite another product's image. Uniqueness is checked against the database
 * rather than assumed.
 */
async function uniqueSlug(name: string): Promise<string> {
  const base =
    name
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'product';

  let candidate = base;
  let n = 2;

  /* Bounded: a runaway loop here would hold a connection open indefinitely. */
  while (n < 100) {
    const clash = await prisma.product.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!clash) return candidate;
    candidate = `${base}-${n}`;
    n += 1;
  }

  return `${base}-${Date.now()}`;
}

export async function createProduct(
  form: FormData
): Promise<ActionResult & { slug?: string; id?: string }> {
  try {
    await requireAdmin();
  } catch {
    return fail('Your session has expired. Sign in again.');
  }

  const name = requiredText(form, 'name');
  if (!name) return fail('Name is required.');

  const price = decimalOrNull(form, 'price');
  if (price === undefined || price === null) {
    return fail('Price must be a number with up to two decimal places.');
  }

  const description = requiredText(form, 'description');
  if (!description) return fail('A short description is required.');

  const categoryId = requiredText(form, 'categoryId');
  const brandId = requiredText(form, 'brandId');
  if (!categoryId || !brandId) return fail('Pick a category and a manufacturer.');

  const stockCount = intOr(form, 'stockCount', 0);
  const slug = await uniqueSlug(name);

  try {
    const created = await prisma.product.create({
      data: {
        slug,
        name,
        price,
        compareAtPrice: decimalOrNull(form, 'compareAtPrice') ?? null,
        description,
        /* The long copy defaults to the short one rather than shipping an empty section. */
        longDescription: optionalText(form, 'longDescription') ?? description,
        directions: optionalText(form, 'directions') ?? 'For research purposes only.',
        shipping:
          optionalText(form, 'shipping') ?? 'Ships within 24 hours in discreet packaging.',
        returns:
          optionalText(form, 'returns') ?? 'Unopened, sealed products may be returned within 14 days.',
        benefits: [],
        ingredients: [],
        images: [],
        categoryId,
        brandId,
        stockCount,
        inStock: stockCount > 0,
        isNew: true,
        /* New rows sort last until someone reorders them. */
        position: (await prisma.product.count()) + 1,
      },
      select: { id: true, slug: true },
    });

    await refresh('/categories', '/brands', '/admin/products');
    return { ok: true, id: created.id, slug: created.slug };
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'Could not create the product.');
  }
}

/**
 * Delete a product and everything it owns.
 *
 * Specifications, FAQs and reviews cascade at the database level, so this cannot leave
 * orphans. The Cloudinary asset is deliberately NOT destroyed: an image is cheap to keep and
 * expensive to recover, and a mis-click should not be irreversible in two systems at once.
 */
export async function deleteProduct(productId: string): Promise<ActionResult> {
  try {
    await requireAdmin();
  } catch {
    return fail('Your session has expired. Sign in again.');
  }

  try {
    const product = await prisma.product.delete({
      where: { id: productId },
      select: { slug: true },
    });
    await refresh(`/product/${product.slug}`, '/admin/products');
    return { ok: true };
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'Could not delete.');
  }
}

export type BulkAction =
  | 'in-stock'
  | 'out-of-stock'
  | 'mark-best-seller'
  | 'clear-best-seller'
  | 'mark-deal'
  | 'clear-deal'
  | 'delete';

/** Apply one change to a selection. Nothing here is destructive except an explicit delete. */
export async function bulkUpdateProducts(
  ids: string[],
  action: BulkAction
): Promise<ActionResult> {
  try {
    await requireAdmin();
  } catch {
    return fail('Your session has expired. Sign in again.');
  }

  if (ids.length === 0) return fail('Nothing selected.');

  try {
    switch (action) {
      case 'in-stock':
        /* Only rows with something on the shelf; the badge must not lie. */
        await prisma.product.updateMany({
          where: { id: { in: ids }, stockCount: { gt: 0 } },
          data: { inStock: true },
        });
        break;
      case 'out-of-stock':
        await prisma.product.updateMany({ where: { id: { in: ids } }, data: { inStock: false } });
        break;
      case 'mark-best-seller':
        await prisma.product.updateMany({ where: { id: { in: ids } }, data: { isBestSeller: true } });
        break;
      case 'clear-best-seller':
        await prisma.product.updateMany({ where: { id: { in: ids } }, data: { isBestSeller: false } });
        break;
      case 'mark-deal':
        await prisma.product.updateMany({ where: { id: { in: ids } }, data: { isDeal: true } });
        break;
      case 'clear-deal':
        await prisma.product.updateMany({ where: { id: { in: ids } }, data: { isDeal: false } });
        break;
      case 'delete':
        await prisma.product.deleteMany({ where: { id: { in: ids } } });
        break;
    }
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'Bulk update failed.');
  }

  await refresh('/admin/products');
  return { ok: true };
}

/** Inline stock edit from the table, without opening the product. */
export async function setStock(productId: string, stockCount: number): Promise<ActionResult> {
  try {
    await requireAdmin();
  } catch {
    return fail('Your session has expired. Sign in again.');
  }

  const units = Number.isFinite(stockCount) && stockCount >= 0 ? Math.floor(stockCount) : 0;

  const product = await prisma.product.update({
    where: { id: productId },
    data: { stockCount: units, inStock: units > 0 },
    select: { slug: true },
  });

  await refresh(`/product/${product.slug}`, '/admin/products');
  return { ok: true };
}

/*
  Remove someone from the mailing list, from the admin side.

  One direction only. There is no counterpart that re-adds an address, because a row created
  by an administrator has no consent behind it — the sentence, the moment and the page would
  all be fabricated. Coming back has to be an act by the person, through a form that records
  what they actually agreed to.
*/
export async function unsubscribeSubscriber(id: string): Promise<ActionResult> {
  try {
    await requireAdmin();
  } catch {
    return fail('Your session has expired. Sign in again.');
  }

  try {
    await prisma.subscriber.update({
      where: { id },
      data: { status: 'UNSUBSCRIBED', unsubscribedAt: new Date() },
    });
  } catch {
    return fail('Could not find that subscriber.');
  }

  revalidatePath('/admin/subscribers');
  return { ok: true };
}
