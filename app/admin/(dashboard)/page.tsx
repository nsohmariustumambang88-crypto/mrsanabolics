import Link from 'next/link';
import {
  Package,
  FolderTree,
  Factory,
  FileText,
  Images,
  Star,
  Users,
  Inbox,
  ShoppingCart,
  Mail,
  BarChart3,
  Tag,
} from 'lucide-react';
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
    contacts,
    openEnquiries,
    orders,
    openOrders,
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
    prisma.contact.count(),
    prisma.enquiry.count({ where: { status: { in: ['NEW', 'OPEN'] } } }),
    prisma.order.count(),
    prisma.order.count({ where: { status: { in: ['NEW', 'CONFIRMED', 'PACKED'] } } }),
  ]);

  /*
    The newer areas, counted in a second batch purely to keep the first one readable. Each of
    these is a thing somebody has to act on, which is why they feed the attention notice rather
    than only the glance list.
  */
  const since = (days: number) => new Date(Date.now() - days * 86_400_000);
  const [
    pendingReviews,
    subscribers,
    visitorsToday,
    activeDiscounts,
    draftCampaigns,
    deadSearches,
    catchAllZones,
  ] = await Promise.all([
    prisma.review.count({ where: { status: 'PENDING' } }),
    prisma.subscriber.count({ where: { status: 'SUBSCRIBED' } }),
    prisma.visitor.count({ where: { lastSeenAt: { gte: since(1) } } }),
    prisma.discount.count({ where: { status: 'ACTIVE' } }),
    prisma.campaign.count({ where: { status: { in: ['DRAFT', 'READY'] } } }),
    prisma.searchQuery.count({ where: { resultCount: 0, occurredAt: { gte: since(7) } } }),
    /* A zone with an empty country list is the rest-of-world catch-all. */
    prisma.deliveryZone.count({ where: { active: true, countries: { isEmpty: true } } }),
  ]);

  const glance = [
    { icon: Package, label: products === 1 ? 'Product' : 'Products', value: products, href: '/admin/products' },
    { icon: FolderTree, label: 'Categories', value: categories, href: '/admin/categories' },
    { icon: Factory, label: 'Manufacturers', value: brands, href: '/admin/brands' },
    { icon: FileText, label: posts === 1 ? 'Journal post' : 'Journal posts', value: posts, href: '/admin/blog' },
    { icon: Images, label: 'With an image', value: withImage, href: '/admin/media' },
    { icon: Star, label: reviews === 1 ? 'Review' : 'Reviews', value: reviews, href: '/admin/reviews' },
    { icon: Users, label: contacts === 1 ? 'Contact' : 'Contacts', value: contacts, href: '/admin/contacts' },
    { icon: Inbox, label: 'Open enquiries', value: openEnquiries, href: '/admin/enquiries' },
    { icon: ShoppingCart, label: orders === 1 ? 'Order' : 'Orders', value: orders, href: '/admin/orders' },
    { icon: Mail, label: 'Subscribers', value: subscribers, href: '/admin/subscribers' },
    { icon: BarChart3, label: 'Visitors today', value: visitorsToday, href: '/admin/analytics' },
    { icon: Tag, label: 'Active discounts', value: activeDiscounts, href: '/admin/discounts' },
  ];

  const attention: { text: string; href: string }[] = [];
  if (pendingReviews > 0) {
    /* Somebody wrote this and it is not on the site yet, which makes it the oldest debt here. */
    attention.push({
      text: `${pendingReviews} review${pendingReviews === 1 ? '' : 's'} waiting to be read`,
      href: '/admin/reviews?status=pending',
    });
  }
  if (catchAllZones === 0) {
    /* Without a rest-of-world zone some customers are offered no delivery at all. */
    attention.push({
      text: 'No catch-all delivery zone — some countries get no delivery option',
      href: '/admin/delivery',
    });
  }
  if (deadSearches > 0) {
    attention.push({
      text: `${deadSearches} search${deadSearches === 1 ? '' : 'es'} returned nothing this week`,
      href: '/admin/search?filter=no-results',
    });
  }
  if (draftCampaigns > 0) {
    attention.push({
      text: `${draftCampaigns} campaign${draftCampaigns === 1 ? '' : 's'} unsent`,
      href: '/admin/campaigns',
    });
  }
  if (openOrders > 0) {
    attention.push({
      text: `${openOrders} order${openOrders === 1 ? '' : 's'} still to fulfil`,
      href: '/admin/orders?filter=open',
    });
  }
  if (openEnquiries > 0) {
    /* Someone outside the business is waiting on this one, which is why it leads. */
    attention.push({
      text: `${openEnquiries} enquir${openEnquiries === 1 ? 'y is' : 'ies are'} waiting on a reply`,
      href: '/admin/enquiries',
    });
  }
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
              <strong>At a Glance</strong> counts what is in the catalogue and who is in the
              CRM — each line links to the screen that works on it.
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
