import { cache, Suspense } from 'react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import HomeHeader from '@/app/_components/home/HomeHeader'
import HomeFooter from '@/app/_components/home/HomeFooter'
import BlogListing from '../../_components/BlogListing'
import { createClient } from '@/lib/supabase/server'
import { getCollectionPageSchema } from '@/lib/utils/blogUtils'

interface Props {
  params: Promise<{ slug: string }>
}

const getCategory = cache(async (slug: string) => {
  const supabase = await createClient()
  const { data } = await (supabase as any)
    .from('blog_categories')
    .select('*')
    .eq('id', slug)
    .single()
  return data
})

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const data = await getCategory(slug)

  if (!data) return { title: 'Category Not Found' }

  const description = data.description || `Browse ${data.name} health articles, tips, and guides from trusted Australian healthcare providers.`

  return {
    title: `${data.name} — Health Articles & Guides`,
    description,
    keywords: [
      `${data.name} articles`,
      `${data.name} health tips`,
      `${data.name} Australia`,
      'health blog',
      'medical advice',
      'healthcare tips Australia',
    ],
    openGraph: {
      title: `${data.name} — Health Articles & Guides | Local Health Care`,
      description,
      url: `/blog/category/${slug}`,
    },
    alternates: { canonical: `/blog/category/${slug}` },
  }
}

export default async function BlogCategoryPage({ params }: Props) {
  const { slug } = await params
  const category = await getCategory(slug)

  if (!category) notFound()

  return (
    <div className="min-h-screen bg-lhc-background flex flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            getCollectionPageSchema(
              `${category.name} Articles`,
              category.description || `Browse ${category.name} articles on Local Health Care.`,
              `/blog/category/${slug}`,
            ),
          ),
        }}
      />
      <HomeHeader />
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
          <h1 className="text-3xl font-bold text-lhc-text-main mb-2">{category.name}</h1>
          {category.description && (
            <p className="text-lhc-text-muted mb-6">{category.description}</p>
          )}
        </div>
        <Suspense fallback={
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-80 rounded-xl bg-lhc-border/30 animate-pulse" />
              ))}
            </div>
          </div>
        }>
          <BlogListing initialCategory={slug} />
        </Suspense>
      </main>
      <HomeFooter />
    </div>
  )
}
