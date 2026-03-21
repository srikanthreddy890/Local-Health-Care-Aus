import { cache } from 'react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import HomeHeader from '@/app/_components/home/HomeHeader'
import HomeFooter from '@/app/_components/home/HomeFooter'
import BlogPostContent from '../../_components/BlogPostContent'
import BlogCard from '../../_components/BlogCard'
import BlogSidebar from '../../_components/BlogSidebar'
import { createClient } from '@/lib/supabase/server'
import {
  getCategoryInfo,
  getArticleSchema,
  getBlogBreadcrumbSchema,
  generateExcerpt,
} from '@/lib/utils/blogUtils'
import type { BlogPost, BlogCategory } from '@/lib/utils/blogUtils'

interface Props {
  params: Promise<{ category: string; slug: string }>
  searchParams: Promise<{ preview?: string }>
}

const getPost = cache(async (slug: string, allowUnpublished: boolean) => {
  const supabase = await createClient()
  let query = (supabase as any)
    .from('blog_posts')
    .select('*')
    .eq('slug', slug)
  if (!allowUnpublished) query = query.eq('status', 'published')
  const { data } = await query.single()
  return data as BlogPost | null
})

async function getRelated(postId: string, category: string) {
  const supabase = await createClient()
  const { data } = await (supabase as any)
    .from('blog_posts')
    .select('*')
    .eq('category', category)
    .eq('status', 'published')
    .neq('id', postId)
    .order('published_at', { ascending: false })
    .limit(3)
  return (data ?? []) as BlogPost[]
}

async function getRecentAndCategories() {
  const supabase = await createClient()
  const [postsRes, catsRes] = await Promise.all([
    (supabase as any)
      .from('blog_posts')
      .select('*')
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(5),
    (supabase as any)
      .from('blog_categories')
      .select('*')
      .order('sort_order', { ascending: true }),
  ])
  return {
    recentPosts: (postsRes.data ?? []) as BlogPost[],
    categories: (catsRes.data ?? []) as BlogCategory[],
  }
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { slug } = await params
  const sp = await searchParams
  const post = await getPost(slug, sp.preview === 'true')
  if (!post) return { title: 'Post Not Found' }

  const catInfo = post.category ? getCategoryInfo(post.category) : null
  const description = post.meta_description || post.excerpt || generateExcerpt(post.content)

  return {
    title: post.meta_title || post.title,
    description,
    openGraph: {
      type: 'article',
      title: post.meta_title || post.title,
      description,
      url: `/blog/${post.category ?? 'general'}/${post.slug}`,
      images: post.featured_image_url ? [{ url: post.featured_image_url }] : undefined,
      publishedTime: post.published_at ?? undefined,
      modifiedTime: post.updated_at ?? undefined,
      authors: [post.author_name],
      section: catInfo?.label,
      tags: post.tags ?? undefined,
    },
    twitter: { card: 'summary_large_image' },
    alternates: { canonical: `/blog/${post.category ?? 'general'}/${post.slug}` },
  }
}

export default async function BlogPostPage({ params, searchParams }: Props) {
  const { category, slug } = await params
  const sp = await searchParams
  const isPreview = sp.preview === 'true'
  const post = await getPost(slug, isPreview)

  if (!post) notFound()

  const catInfo = post.category ? getCategoryInfo(post.category) : null
  const [related, { recentPosts, categories }] = await Promise.all([
    post.category ? getRelated(post.id, post.category) : Promise.resolve([]),
    getRecentAndCategories(),
  ])

  // Collect tags for sidebar
  const allTags = new Set<string>()
  recentPosts.forEach((p) => p.tags?.forEach((t) => allTags.add(t)))

  const breadcrumbs = [
    { name: 'Home', url: '/' },
    { name: 'Blog', url: '/blog' },
    ...(catInfo ? [{ name: catInfo.label, url: `/blog/category/${post.category}` }] : []),
    { name: post.title, url: `/blog/${category}/${slug}` },
  ]

  return (
    <div className="min-h-screen bg-lhc-background flex flex-col">
      <HomeHeader />
      <main className="flex-1">
        {/* JSON-LD */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(getArticleSchema(post)),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(getBlogBreadcrumbSchema(breadcrumbs)),
          }}
        />

        {/* Preview Banner */}
        {isPreview && (
          <div className="bg-amber-100 text-amber-800 text-center py-2 text-sm font-medium">
            Preview Mode — This post is not yet published
          </div>
        )}

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Breadcrumbs */}
          <nav className="flex items-center gap-1 text-sm text-lhc-text-muted mb-6 flex-wrap">
            {breadcrumbs.map((crumb, i) => (
              <span key={crumb.url} className="flex items-center gap-1">
                {i > 0 && <ChevronRight className="w-3.5 h-3.5" />}
                {i < breadcrumbs.length - 1 ? (
                  <Link href={crumb.url} className="hover:text-lhc-primary transition-colors">
                    {crumb.name}
                  </Link>
                ) : (
                  <span className="text-lhc-text-main font-medium line-clamp-1">{crumb.name}</span>
                )}
              </span>
            ))}
          </nav>

          <div className="flex gap-8">
            {/* Post Content */}
            <div className="flex-1 min-w-0">
              <BlogPostContent post={post} />

              {/* Related Articles */}
              {related.length > 0 && (
                <section className="mt-12 pt-8 border-t border-lhc-border">
                  <h2 className="text-xl font-semibold text-lhc-text-main mb-6">
                    Related Articles
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {related.map((p) => (
                      <BlogCard key={p.id} post={p} />
                    ))}
                  </div>
                </section>
              )}
            </div>

            {/* Sidebar */}
            <aside className="hidden lg:block w-72 flex-shrink-0">
              <div className="sticky top-24">
                <BlogSidebar
                  recentPosts={recentPosts}
                  categories={categories}
                  tags={Array.from(allTags)}
                  currentPostId={post.id}
                />
              </div>
            </aside>
          </div>
        </div>
      </main>
      <HomeFooter />
    </div>
  )
}
