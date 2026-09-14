import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { updateBlogPost } from '@/app/admin/actions';
import { InlineEditor } from '@/components/admin/inline-editor';

export const dynamic = 'force-dynamic';

export default async function AdminBlogPage() {
  await requireAdmin();

  const posts = await prisma.blogPost.findMany({ orderBy: { date: 'desc' } });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="wp-heading-inline">Journal</h1>
        <p className="max-w-[46rem] mt-2 text-sm wp-muted wp-num">
          {posts.length} posts. The image field takes a Cloudinary public ID or a full URL —
          the delivery helper handles either.
        </p>
      </div>

      <div className="border-t border-[#dcdcde]">
        {posts.map((post) => (
          <InlineEditor
            key={post.id}
            title={post.title}
            subtitle={post.excerpt}
            meta={post.date.toISOString().slice(0, 10)}
            action={updateBlogPost.bind(null, post.id)}
            fields={[
              { name: 'title', label: 'Title', value: post.title, required: true },
              {
                name: 'excerpt',
                label: 'Excerpt',
                value: post.excerpt,
                type: 'textarea',
                rows: 2,
                required: true,
                hint: 'Shown on cards and used as the meta description.',
              },
              {
                name: 'content',
                label: 'Body',
                value: post.content,
                type: 'textarea',
                rows: 16,
                required: true,
                hint: 'Markdown: ## heading, ### subheading, - list, 1. list, > callout, | tables |, **bold**, [link](/shop), [^2] cites source 2, [[figure:key]] places a drawn figure.',
              },
              { name: 'category', label: 'Topic', value: post.category },
              { name: 'author', label: 'Byline', value: post.author },
              {
                name: 'metaTitle',
                label: 'Search title',
                value: post.metaTitle ?? '',
                hint: 'Optional. Shown in search results instead of the headline. Under 60 characters.',
              },
              {
                name: 'metaDescription',
                label: 'Search description',
                value: post.metaDescription ?? '',
                type: 'textarea',
                rows: 2,
                hint: 'Optional. Falls back to the excerpt. Under 155 characters.',
              },
              {
                name: 'image',
                label: 'Image',
                value: post.image,
                hint: 'Cloudinary public ID, or a full https URL to be fetched and optimised.',
              },
              {
                name: 'imageAlt',
                label: 'Image description',
                value: post.imageAlt,
                hint: 'What the picture shows, for screen readers and image search.',
              },
              {
                name: 'imageCredit',
                label: 'Image credit',
                value: post.imageCredit ?? '',
                hint: 'Photographer and licence, printed under the picture.',
              },
            ]}
          />
        ))}
      </div>
    </div>
  );
}
