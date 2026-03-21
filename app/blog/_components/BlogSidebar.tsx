'use client'

import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import BlogCard from './BlogCard'
import type { BlogPost, BlogCategory } from '@/lib/utils/blogUtils'

interface Props {
  recentPosts: BlogPost[]
  categories: BlogCategory[]
  tags: string[]
  currentPostId?: string
}

export default function BlogSidebar({ recentPosts, categories, tags, currentPostId }: Props) {
  const filtered = currentPostId
    ? recentPosts.filter((p) => p.id !== currentPostId)
    : recentPosts

  return (
    <div className="space-y-6">
      {/* Recent Posts */}
      {filtered.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Recent Posts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {filtered.slice(0, 4).map((post) => (
              <BlogCard key={post.id} post={post} variant="compact" />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Categories */}
      {categories.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Categories</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <Link key={cat.id} href={`/blog/category/${cat.id}`}>
                <Badge variant="outline" className="cursor-pointer hover:bg-lhc-primary/10">
                  {cat.name}
                </Badge>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Tags */}
      {tags.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Popular Tags</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {tags.slice(0, 10).map((tag) => (
              <Link key={tag} href={`/blog?tag=${encodeURIComponent(tag)}`}>
                <Badge variant="secondary" className="cursor-pointer hover:bg-lhc-primary/10">
                  {tag}
                </Badge>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Newsletter CTA */}
      <Card className="bg-lhc-primary/5 border-lhc-primary/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Subscribe to Health Tips</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-lhc-text-muted">
            Get the latest health tips and wellness advice delivered to your inbox.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
