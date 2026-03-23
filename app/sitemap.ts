import type { MetadataRoute } from 'next'
import { createClient } from '@supabase/supabase-js'

const SITE_URL = 'https://localhealthcare.com.au'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${SITE_URL}/blog`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/clinics`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/privacy-policy`,
      lastModified: new Date('2024-01-01'),
      changeFrequency: 'weekly',
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/terms-and-conditions`,
      lastModified: new Date('2024-01-01'),
      changeFrequency: 'weekly',
      priority: 0.3,
    },
  ]

  // Fetch published blog posts and categories from Supabase
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (supabaseUrl && supabaseKey) {
    try {
      const supabase = createClient(supabaseUrl, supabaseKey)

      // Blog categories
      const { data: categories } = await supabase
        .from('blog_categories')
        .select('id')

      if (categories) {
        for (const cat of categories) {
          entries.push({
            url: `${SITE_URL}/blog/category/${cat.id}`,
            changeFrequency: 'weekly',
            priority: 0.7,
          })
        }
      }

      // Published blog posts
      const { data: posts } = await supabase
        .from('blog_posts')
        .select('slug, category, updated_at')
        .eq('status', 'published')

      if (posts) {
        for (const post of posts) {
          entries.push({
            url: `${SITE_URL}/blog/${post.category ?? 'general'}/${post.slug}`,
            lastModified: post.updated_at ? new Date(post.updated_at) : undefined,
            changeFrequency: 'weekly',
            priority: 0.7,
          })
        }
      }
    } catch {
      // Sitemap still returns static entries if Supabase is unreachable
    }
  }

  return entries
}
