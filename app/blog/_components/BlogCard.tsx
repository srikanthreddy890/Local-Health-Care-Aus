'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Star, Eye, Clock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import type { BlogPost } from '@/lib/utils/blogUtils'
import {
  getCategoryInfo,
  getGradientClass,
  formatBlogDate,
  generateExcerpt,
} from '@/lib/utils/blogUtils'

interface Props {
  post: BlogPost
  variant?: 'featured' | 'default' | 'compact'
}

export default function BlogCard({ post, variant = 'default' }: Props) {
  const catInfo = post.category ? getCategoryInfo(post.category) : null
  const href = `/blog/${post.category ?? 'general'}/${post.slug}`
  const excerpt = post.excerpt || generateExcerpt(post.content)

  if (variant === 'compact') {
    return (
      <Link href={href} className="flex items-start gap-3 group">
        <div className="relative w-16 h-16 rounded-md overflow-hidden flex-shrink-0">
          {post.featured_image_url ? (
            <Image
              src={post.featured_image_url}
              alt={post.title}
              fill
              className="object-cover"
              sizes="64px"
            />
          ) : (
            <div className={`w-full h-full bg-gradient-to-br ${getGradientClass(post.title)}`} />
          )}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-lhc-text-main line-clamp-2 group-hover:text-lhc-primary transition-colors">
            {post.title}
          </p>
          {post.published_at && (
            <p className="text-xs text-lhc-text-muted mt-1">{formatBlogDate(post.published_at)}</p>
          )}
        </div>
      </Link>
    )
  }

  if (variant === 'featured') {
    return (
      <Link href={href}>
        <Card className="overflow-hidden group h-full">
          <div className="relative aspect-video overflow-hidden">
            {post.featured_image_url ? (
              <Image
                src={post.featured_image_url}
                alt={post.title}
                fill
                className="object-cover transition-transform duration-300 group-hover:scale-105"
                sizes="(max-width: 768px) 100vw, 33vw"
              />
            ) : (
              <div className={`w-full h-full bg-gradient-to-br ${getGradientClass(post.title)}`} />
            )}
            <div className="absolute top-3 left-3 flex gap-2">
              {catInfo && (
                <Badge variant="secondary" className="bg-white/90 text-xs">
                  {catInfo.label}
                </Badge>
              )}
              {post.is_featured && (
                <Badge variant="secondary" className="bg-amber-100 text-amber-800 text-xs">
                  <Star className="w-3 h-3 mr-1" /> Featured
                </Badge>
              )}
            </div>
          </div>
          <div className="p-4">
            <h3 className="font-semibold text-lg text-lhc-text-main line-clamp-2 group-hover:text-lhc-primary transition-colors">
              {post.title}
            </h3>
            <p className="text-sm text-lhc-text-muted mt-2 line-clamp-3">{excerpt}</p>
            <div className="flex items-center gap-3 mt-3 text-xs text-lhc-text-muted">
              <span>{post.author_name}</span>
              {post.published_at && <span>{formatBlogDate(post.published_at)}</span>}
              {post.reading_time_minutes && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {post.reading_time_minutes} min
                </span>
              )}
            </div>
          </div>
        </Card>
      </Link>
    )
  }

  // default variant
  return (
    <Link href={href}>
      <Card className="overflow-hidden group h-full">
        <div className="relative aspect-[16/10] overflow-hidden">
          {post.featured_image_url ? (
            <Image
              src={post.featured_image_url}
              alt={post.title}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          ) : (
            <div className={`w-full h-full bg-gradient-to-br ${getGradientClass(post.title)}`} />
          )}
          {catInfo && (
            <Badge variant="secondary" className="absolute top-3 left-3 bg-white/90 text-xs">
              {catInfo.label}
            </Badge>
          )}
        </div>
        <div className="p-4">
          <h3 className="font-semibold text-lhc-text-main line-clamp-2 group-hover:text-lhc-primary transition-colors">
            {post.title}
          </h3>
          <p className="text-sm text-lhc-text-muted mt-1.5 line-clamp-2">{excerpt}</p>
          <div className="flex items-center gap-3 mt-3 text-xs text-lhc-text-muted">
            <span>{post.author_name}</span>
            {post.published_at && <span>{formatBlogDate(post.published_at)}</span>}
            {post.reading_time_minutes && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" /> {post.reading_time_minutes} min
              </span>
            )}
            {(post.view_count ?? 0) > 0 && (
              <span className="flex items-center gap-1">
                <Eye className="w-3 h-3" /> {post.view_count}
              </span>
            )}
          </div>
        </div>
      </Card>
    </Link>
  )
}
