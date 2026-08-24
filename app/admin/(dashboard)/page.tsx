import Link from 'next/link';
import { Package, FolderTree, Factory, FileText, Images, Star } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { formatPrice } from '@/lib/format';
import { WpPostbox } from '@/components/admin/wp-ui';
import { WpNotice, WpScreenMeta } from '@/components/admin/wp-notice';
import { WpQuickProduct } from '@/components/admin/wp-quick-product';

/*
  The dashboard, laid out as wp-admin lays one out: a field of postbox widgets, one column on
  a phone and two from 783px, with At a Glance first and Activity beside it.

  Every widget answers a question someone actually has. At a Glance counts what exists and
  links each count to the screen that edits it; Activity is the last things touched; Quick Add
  writes a real product. The "needs attention" notice is the one piece not borrowed from
  WordPress, because a store has a state WordPress has no widget for — stock that has run out.
*/

export const dynamic = 'force-dynamic';

export default async function AdminDashboard() {
  await requireAdmin();

  const [
    products,
    categories,
    brands,
    posts,
    reviews,
    withImage,
    outOfStock,
    lowStock,
    noImage,
    recent,
    categoryRows,
    brandRows,
  ] = await Promise.all([
    prisma.product.count(),
    prisma.category.count(),
    prisma.brand.count(),
    prisma.blogPost.count(),
    prisma.review.count(),
    prisma.product.count({ where: { NOT: { images: { isEmpty: true } } } }),
    prisma.product.count({ where: { inStock: false } }),
    prisma.product.count({ where: { inStock: true, stockCount: { lte: 5 } } }),
    prisma.product.count({ where: { images: { isEmpty: true } } }),
    prisma.product.findMany({
      orderBy: { updatedAt: 'desc' },
      take: 6,
      select: {
        id: true,
        name: true,
        slug: true,
        price: true,
        updatedAt: true,
        inStock: true,
        stockCount: true,
        category: { select: { name: true } },
      },
    }),
    prisma.category.findMany({ orderBy: { position: 'asc' }, select: { id: true, name: true } }),
    prisma.brand.findMany({ orderBy: { position: 'asc' }, select: { id: true, name: true } }),
  ]);

  const glance = [
    { icon: Package, label: products === 1 ? 'Product' : 'Products', value: products, href: '/admin/products' },
    { icon: FolderTree, label: 'Categories', value: categories, href: '/admin/categories' },
    { icon: Factory, label: 'Manufacturers', value: brands, href: '/admin/brands' },
    { icon: FileText, label: posts === 1 ? 'Journal post' : 'Journal posts', value: posts, href: '/admin/blog' },
    { icon: Images, label: 'With an image', value: withImage, href: '/admin/media' },
    { icon: Star, label: reviews === 1 ? 'Review' : 'Reviews', value: reviews, href: '/admin/products' },
  ];

  const attention: { text: string; href: string }[] = [];
  if (outOfStock > 0) {
    attention.push({
      text: `${outOfStock} product${outOfStock === 1 ? ' is' : 's are'} out of stock`,
      href: '/admin/products?filter=out',
    });
  }
  if (lowStock > 0) {
    attention.push({
      text: `${lowStock} running low, 5 or fewer left`,
      href: '/admin/products?filter=low',
    });
  }
  if (noImage > 0) {
    attention.push({
      text: `${noImage} without an image`,
      href: '/admin/products?filter=no-image',
    });
  }

  return (
    <>
      <WpScreenMeta
        options={
          <p className="m-0">
            This dashboard shows every widget it has. Counts and activity read the live Neon
            database on each load, so there is nothing cached to configure here.
          </p>
        }
        help={
          <div>
            <p className="mt-0">
              <strong>At a Glance</strong> counts what is in the catalogue — each line links to
              the screen that edits it.
            </p>
            <p>
              <strong>Quick Add</strong> writes a real product row. Image and full copy can be
              attached afterwards from the product screen.
            </p>
            <p className="mb-0">
              Everything here reads and writes the live database. A saved change appears on the
              storefront within a minute, when the catalogue cache turns over.
            </p>
          </div>
        }
      />

      <h1 className="wp-heading-inline">Dashboard</h1>
      <hr className="my-2 border-0 border-t border-[#c3c4c7]" />

      {attention.length > 0 && (
        <WpNotice tone="warning" dismissible={false}>
          <p>
            <strong>Needs attention.</strong>
          </p>
          <ul className="m-0 list-disc pl-5">
            {attention.map((a) => (
              <li key={a.href}>
                <Link href={a.href}>{a.text}</Link>
              </li>
            ))}
          </ul>
        </WpNotice>
      )}

      <WpNotice id="welcome" tone="info">
        <p>
          <strong>Welcome to MrAnabolics.</strong> Add a product from the widget below, or open{' '}
          <Link href="/admin/products">Products</Link> to edit stock, pricing and imagery in
          bulk. Changes go straight to the live database.
        </p>
      </WpNotice>

      <div className="wp-dashboard-columns">
        <div>
          <WpPostbox title="At a Glance" action={{ href: '/admin/products', label: 'Manage' }}>
            <ul className="wp-glance">
              {glance.map((g) => {
                const Icon = g.icon;
                return (
                  <li key={g.label}>
                    <Link href={g.href}>
                      <Icon className="h-4 w-4 shrink-0 text-[#646970]" strokeWidth={1.8} />
                      <span className="wp-num font-semibold">{g.value}</span>
                      <span>{g.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </WpPostbox>

          <WpPostbox
            title="Activity"
            action={{ href: '/admin/products', label: 'View all' }}
          >
            <p className="mb-2 mt-0 font-semibold">Recently edited</p>
            <ul className="wp-activity-list">
              {recent.map((p) => (
                <li key={p.id}>
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                    <Link href={`/admin/products/${p.id}`} className="font-semibold">
                      {p.name}
                    </Link>
                    <span className="wp-num wp-muted">
                      <time dateTime={p.updatedAt.toISOString()}>
                        {p.updatedAt.toISOString().slice(0, 10)}
                      </time>
                    </span>
                  </div>
                  <p className="m-0 wp-muted">
                    {p.category.name}
                    {' · '}
                    <span className="wp-num">{formatPrice(Number(p.price))}</span>
                    {' · '}
                    {p.inStock ? (
                      <span className="wp-num">{p.stockCount} in stock</span>
                    ) : (
                      <span style={{ color: 'var(--wp-error)' }}>Out of stock</span>
                    )}
                  </p>
                </li>
              ))}
            </ul>
          </WpPostbox>
        </div>

        <div>
          <WpPostbox title="Quick Add Product">
            <WpQuickProduct categories={categoryRows} brands={brandRows} />
          </WpPostbox>

          <WpPostbox title="Storefront">
            <p className="mt-0">
              The catalogue on the public site is served from this same database, memoised for
              60 seconds. A change saved here appears there within a minute.
            </p>
            <p className="mb-0">
              <a href="/" target="_blank" rel="noreferrer">
                Open the storefront
              </a>
              {' · '}
              <Link href="/admin/media">Media library</Link>
            </p>
          </WpPostbox>
        </div>
      </div>
    </>
  );
}
