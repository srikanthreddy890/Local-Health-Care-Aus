import { format } from 'date-fns'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface BlogPost {
  id: string
  title: string
  slug: string
  content: string
  excerpt: string | null
  featured_image_url: string | null
  author_name: string
  author_avatar_url: string | null
  author_type: string
  category: string | null
  status: string
  is_featured: boolean | null
  reading_time_minutes: number | null
  view_count: number | null
  meta_title: string | null
  meta_description: string | null
  tags: string[] | null
  clinic_id: string | null
  rejection_reason: string | null
  published_at: string | null
  updated_at: string | null
  created_at: string | null
}

export interface BlogCategory {
  id: string
  name: string
  description: string | null
  icon: string | null
  sort_order: number | null
  created_at: string | null
}

/* ------------------------------------------------------------------ */
/*  Slug                                                               */
/* ------------------------------------------------------------------ */

export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

/* ------------------------------------------------------------------ */
/*  HTML helpers                                                       */
/* ------------------------------------------------------------------ */

export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim()
}

export function calculateReadingTime(html: string): number {
  const text = stripHtml(html)
  const wordCount = text.split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.ceil(wordCount / 200))
}

export function getWordCount(html: string): number {
  return stripHtml(html).split(/\s+/).filter(Boolean).length
}

export function extractFirstImageFromHtml(html: string): string | null {
  const match = html.match(/<img[^>]+src=["']([^"']+)["']/)
  return match?.[1] ?? null
}

/* ------------------------------------------------------------------ */
/*  Text helpers                                                       */
/* ------------------------------------------------------------------ */

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength).trimEnd() + '...'
}

export function generateExcerpt(html: string, maxLength = 160): string {
  return truncateText(stripHtml(html), maxLength)
}

export function formatBlogDate(dateStr: string): string {
  return format(new Date(dateStr), 'MMMM d, yyyy')
}

/* ------------------------------------------------------------------ */
/*  Category info                                                      */
/* ------------------------------------------------------------------ */

const CATEGORY_MAP: Record<string, { label: string; color: string }> = {
  general: { label: 'General Health', color: 'blue' },
  dental: { label: 'Dental Care', color: 'emerald' },
  specialist: { label: 'Specialist', color: 'purple' },
  pharmacy: { label: 'Pharmacy', color: 'amber' },
  lab: { label: 'Lab & Diagnostics', color: 'cyan' },
  wellness: { label: 'Wellness', color: 'green' },
  news: { label: 'News', color: 'red' },
}

export function getCategoryInfo(categoryId: string): { label: string; color: string } {
  return CATEGORY_MAP[categoryId] ?? { label: categoryId, color: 'gray' }
}

/* ------------------------------------------------------------------ */
/*  Gradient placeholders                                              */
/* ------------------------------------------------------------------ */

const GRADIENTS = [
  'from-blue-400 to-cyan-300',
  'from-emerald-400 to-teal-300',
  'from-purple-400 to-pink-300',
  'from-amber-400 to-orange-300',
]

export function getGradientClass(title: string): string {
  return GRADIENTS[title.length % GRADIENTS.length]
}

/* ------------------------------------------------------------------ */
/*  DOMPurify config (shared between editor preview & public render)   */
/* ------------------------------------------------------------------ */

export const BLOG_PURIFY_CONFIG = {
  ALLOWED_TAGS: [
    'p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li', 'a', 'img', 'blockquote', 'code', 'pre', 'hr',
    'table', 'thead', 'tbody', 'tr', 'th', 'td', 'span', 'div',
    'figure', 'figcaption', 'sub', 'sup', 's',
    'input', 'label',
    'iframe',
    'colgroup', 'col',
  ],
  ALLOWED_ATTR: [
    'href', 'src', 'alt', 'title', 'class', 'style', 'target', 'rel',
    'width', 'height',
    'data-type', 'data-youtube-video',
    'frameborder', 'allowfullscreen', 'allow',
    'checked', 'disabled', 'type',
    'colspan', 'rowspan',
    'loading',
  ],
}

/* ------------------------------------------------------------------ */
/*  Schema.org JSON-LD                                                 */
/* ------------------------------------------------------------------ */

const SITE_URL = 'https://localhealthcare.com.au'

export function getArticleSchema(post: BlogPost) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.meta_title || post.title,
    description: post.meta_description || post.excerpt || generateExcerpt(post.content),
    image: [post.featured_image_url || `${SITE_URL}/images/brand/og-image.png`],
    author: {
      '@type': post.author_type === 'clinic' ? 'Organization' : 'Person',
      name: post.author_name,
    },
    publisher: {
      '@type': 'Organization',
      name: 'Local Health Care',
      logo: { '@type': 'ImageObject', url: `${SITE_URL}/favicon.png` },
    },
    datePublished: post.published_at,
    dateModified: post.updated_at || post.published_at,
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${SITE_URL}/blog/${post.category ?? 'general'}/${post.slug}`,
    },
  }
}

export function getBlogBreadcrumbSchema(items: { name: string; url: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: `${SITE_URL}${item.url}`,
    })),
  }
}

export function getBlogListingSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Health Blog',
    description: 'Health tips, medical insights, and wellness advice from trusted healthcare providers.',
    url: `${SITE_URL}/blog`,
    publisher: {
      '@type': 'Organization',
      name: 'Local Health Care',
    },
  }
}
