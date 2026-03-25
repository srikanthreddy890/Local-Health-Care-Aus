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

/** Whitelisted domains for iframe src attributes in blog content. */
const ALLOWED_IFRAME_HOSTS = [
  'www.youtube.com',
  'youtube.com',
  'www.youtube-nocookie.com',
  'player.vimeo.com',
]

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

/**
 * Register a DOMPurify hook that strips iframe tags whose src is not
 * on the whitelist. Safe to call multiple times — only registers once.
 */
let _iframeHookRegistered = false
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function registerIframeHook(DOMPurify: any) {
  if (_iframeHookRegistered) return
  _iframeHookRegistered = true
  DOMPurify.addHook('uponSanitizeElement', (node: Element, data: { tagName: string }) => {
    if (data.tagName === 'iframe') {
      const src = node.getAttribute('src') || ''
      try {
        const url = new URL(src)
        if (!ALLOWED_IFRAME_HOSTS.includes(url.hostname)) {
          node.remove()
        }
      } catch {
        // Invalid URL — remove the iframe
        node.remove()
      }
    }
  })
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
    wordCount: getWordCount(post.content),
    articleSection: post.category ? getCategoryInfo(post.category).label : undefined,
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

export function getCollectionPageSchema(name: string, description: string, path: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name,
    description,
    url: `${SITE_URL}${path}`,
    publisher: {
      '@type': 'Organization',
      name: 'Local Health Care',
    },
  }
}

/* ------------------------------------------------------------------ */
/*  Site-wide schemas (Organization, WebSite)                          */
/* ------------------------------------------------------------------ */

export function getOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Local Health Care',
    url: SITE_URL,
    logo: `${SITE_URL}/images/brand/logo.png`,
    description:
      'Find and book appointments with trusted healthcare providers across Australia.',
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      url: `${SITE_URL}/contact`,
      availableLanguage: 'English',
    },
  }
}

export function getWebSiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Local Health Care',
    url: SITE_URL,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE_URL}/clinics?postcode={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  }
}

/* ------------------------------------------------------------------ */
/*  Clinic schemas (MedicalBusiness)                                   */
/* ------------------------------------------------------------------ */

export interface ClinicSchemaInput {
  id: string
  name: string
  description?: string | null
  address?: string | null
  suburb?: string | null
  state?: string | null
  postcode?: string | null
  phone?: string | null
  logo_url?: string | null
  source: 'registered' | 'apify'
}

export function getMedicalBusinessSchema(clinic: ClinicSchemaInput) {
  const urlPath = clinic.source === 'registered'
    ? `/clinic/${clinic.id}`
    : `/local-clinic/${clinic.id}`

  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'MedicalBusiness',
    name: clinic.name,
    url: `${SITE_URL}${urlPath}`,
    description: clinic.description || undefined,
    image: clinic.logo_url || undefined,
    isAcceptingNewPatients: true,
  }

  if (clinic.address || clinic.suburb) {
    schema.address = {
      '@type': 'PostalAddress',
      streetAddress: clinic.address || undefined,
      addressLocality: clinic.suburb || undefined,
      addressRegion: clinic.state || undefined,
      postalCode: clinic.postcode || undefined,
      addressCountry: 'AU',
    }
  }

  if (clinic.phone) {
    schema.telephone = clinic.phone
  }

  return schema
}
