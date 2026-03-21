'use client'

import { useEffect } from 'react'
import DOMPurify from 'isomorphic-dompurify'
import Image from 'next/image'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Eye, Clock, Calendar } from 'lucide-react'
import SocialShareButtons from './SocialShareButtons'
import { useIncrementViewCount } from '@/lib/hooks/useBlogPosts'
import type { BlogPost } from '@/lib/utils/blogUtils'
import { getCategoryInfo, formatBlogDate, getGradientClass } from '@/lib/utils/blogUtils'

const PURIFY_CONFIG = {
  ALLOWED_TAGS: [
    'p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li', 'a', 'img', 'blockquote', 'code', 'pre', 'hr',
    'table', 'thead', 'tbody', 'tr', 'th', 'td', 'span', 'div',
    'figure', 'figcaption', 'sub', 'sup',
  ],
  ALLOWED_ATTR: [
    'href', 'src', 'alt', 'title', 'class', 'style', 'target', 'rel',
    'width', 'height',
  ],
}

interface Props {
  post: BlogPost
}

export default function BlogPostContent({ post }: Props) {
  const { increment } = useIncrementViewCount()
  const catInfo = post.category ? getCategoryInfo(post.category) : null
  const shareUrl = `https://localhealthcare.com.au/blog/${post.category ?? 'general'}/${post.slug}`
  const sanitized = DOMPurify.sanitize(post.content, PURIFY_CONFIG)

  useEffect(() => {
    if (post.status === 'published') {
      increment(post.slug)
    }
  }, [post.slug, post.status, increment])

  return (
    <article>
      {/* Featured Image */}
      {post.featured_image_url ? (
        <div className="relative aspect-video rounded-xl overflow-hidden mb-6">
          <Image
            src={post.featured_image_url}
            alt={post.title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 800px"
            priority
          />
        </div>
      ) : (
        <div className={`aspect-video rounded-xl mb-6 bg-gradient-to-br ${getGradientClass(post.title)}`} />
      )}

      {/* Category + Tags */}
      <div className="flex items-center gap-2 flex-wrap mb-4">
        {catInfo && (
          <Link href={`/blog/category/${post.category}`}>
            <Badge>{catInfo.label}</Badge>
          </Link>
        )}
        {post.tags?.slice(0, 3).map((tag) => (
          <Link key={tag} href={`/blog?tag=${encodeURIComponent(tag)}`}>
            <Badge variant="outline">{tag}</Badge>
          </Link>
        ))}
      </div>

      {/* Title */}
      <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-lhc-text-main mb-4">
        {post.title}
      </h1>

      {/* Author + Meta */}
      <div className="flex items-center gap-4 mb-6 pb-6 border-b border-lhc-border">
        <div className="flex items-center gap-3">
          {post.author_avatar_url ? (
            <Image
              src={post.author_avatar_url}
              alt={post.author_name}
              width={40}
              height={40}
              className="rounded-full"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-lhc-primary/20 flex items-center justify-center text-sm font-medium text-lhc-primary">
              {post.author_name.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <p className="text-sm font-medium text-lhc-text-main">{post.author_name}</p>
            <p className="text-xs text-lhc-text-muted">
              {post.author_type === 'clinic' ? 'Clinic' : 'Editorial'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4 text-sm text-lhc-text-muted ml-auto">
          {post.published_at && (
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4" /> {formatBlogDate(post.published_at)}
            </span>
          )}
          {post.reading_time_minutes && (
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" /> {post.reading_time_minutes} min read
            </span>
          )}
          {(post.view_count ?? 0) > 0 && (
            <span className="flex items-center gap-1">
              <Eye className="w-4 h-4" /> {post.view_count}
            </span>
          )}
        </div>
      </div>

      {/* Share */}
      <div className="mb-6">
        <SocialShareButtons url={shareUrl} title={post.title} />
      </div>

      {/* Content */}
      <div
        className="prose prose-lg max-w-none prose-headings:text-lhc-text-main prose-p:text-lhc-text-main prose-a:text-lhc-primary prose-img:rounded-lg"
        dangerouslySetInnerHTML={{ __html: sanitized }}
      />
    </article>
  )
}
