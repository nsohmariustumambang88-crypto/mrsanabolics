import Link from 'next/link';
import Image from 'next/image';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { cloudinaryEnabled, CLOUD_NAME } from '@/lib/cloudinary';

export const dynamic = 'force-dynamic';

export default async function AdminMediaPage() {
  await requireAdmin();

  const products = await prisma.product.findMany({
    orderBy: { position: 'asc' },
    select: { id: true, slug: true, name: true, images: true },
  });

  const withImage = products.filter((p) => p.images.length > 0);
  const withoutImage = products.filter((p) => p.images.length === 0);

  return (
    <div className="space-y-10">
      <div>
        <h1 className="wp-heading-inline">Media</h1>
        <p className="max-w-[46rem] mt-2 text-sm wp-muted">
          Every product image, as attached in the database. Uploading happens on each
          product&rsquo;s own page so the file and the record are written together.
        </p>
      </div>

      {!cloudinaryEnabled && (
        <p className="border border-warning/40 bg-warning/5 p-4 text-sm wp-muted">
          Cloudinary is not configured, so images fall back to their source URLs untransformed.
          Set <code className="text-[11px]">NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME</code> in
          <code className="text-[11px]"> .env</code>.
        </p>
      )}

      <section>
        <h2 className="wp-postbox-title mb-2">
          Attached
          <span className="ml-2 text-[11px] uppercase wp-muted wp-num">
            {withImage.length}
          </span>
        </h2>

        <div className="mt-5 grid gap-px bg-[#dcdcde] sm:grid-cols-3 lg:grid-cols-4">
          {withImage.map((product) => (
            <Link
              key={product.id}
              href={`/admin/products/${product.id}`}
              className="group bg-white p-3 transition-colors hover:bg-[#f6f7f7]"
            >
              <span className="relative block aspect-[4/5] overflow-hidden border border-[#dcdcde] bg-[#f6f7f7]">
                <Image
                  src={product.images[0]}
                  alt={product.name}
                  fill
                  sizes="(min-width: 1024px) 20vw, 33vw"
                  className="object-cover"
                />
              </span>
              <span className="mt-2.5 block truncate text-sm font-medium group-hover:text-[#2271b1]">
                {product.name}
              </span>
              <span className="mt-0.5 block truncate text-[11px] wp-muted">
                {product.images[0]}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {withoutImage.length > 0 && (
        <section>
          <h2 className="wp-postbox-title mb-2">
            Missing an image
            <span className="ml-2 text-[11px] uppercase wp-muted wp-num">
              {withoutImage.length}
            </span>
          </h2>
          <p className="mt-2 text-sm wp-muted">
            These fall back to a drawn plate on the site, so nothing is broken — but they have
            no shareable image and no Open Graph card.
          </p>
          <ul className="mt-4 border-t border-[#dcdcde]">
            {withoutImage.map((product) => (
              <li key={product.id} className="border-b border-[#dcdcde]">
                <Link
                  href={`/admin/products/${product.id}`}
                  className="flex items-baseline justify-between gap-4 py-3 transition-colors hover:bg-[#f6f7f7]"
                >
                  <span className="text-sm font-medium">{product.name}</span>
                  <span className="text-[11px] text-[#2271b1]">Upload</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {cloudinaryEnabled && (
        <p className="border-t border-[#dcdcde] pt-6 text-[11px] uppercase wp-muted">
          Cloud: {CLOUD_NAME} · folder mranabolics/products
        </p>
      )}
    </div>
  );
}
