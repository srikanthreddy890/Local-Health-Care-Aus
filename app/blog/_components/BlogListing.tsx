'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import BlogCard from './BlogCard'
import BlogSidebar from './BlogSidebar'
import CategoryFilterBar from './CategoryFilterBar'
import {
  useBlogPosts,
  useBlogPostsCount,
  useFeaturedBlogPosts,
  useBlogCategories,
} from '@/lib/hooks/useBlogPosts'

interface Props {
  initialCategory?: string
}

const PAGE_SIZE = 12

export default function BlogListing({ initialCategory }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [search, setSearch] = useState(searchParams.get('search') ?? '')
  const [category, setCategory] = useState(initialCategory ?? searchParams.get('category'))
  const [tag, setTag] = useState(searchParams.get('tag'))
  const [page, setPage] = useState(Number(searchParams.get('page') ?? 0))

  // For category pages, the initialCategory isn't a user-applied filter
  const hasUserFilters = !!(search || (category && category !== initialCategory) || tag)
  const hasAnyFilter = !!(search || category || tag)

  // Sync URL
  useEffect(() => {
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (category && !initialCategory) params.set('category', category)
    if (tag) params.set('tag', tag)
    if (page > 0) params.set('page', String(page))
    const qs = params.toString()
    router.replace(qs ? `?${qs}` : window.location.pathname, { scroll: false })
  }, [search, category, tag, page, router, initialCategory])

  const filters = useMemo(() => ({
    status: 'published',
    searchQuery: search || undefined,
    category: category || undefined,
    tag: tag || undefined,
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
  }), [search, category, tag, page])

  const { posts, loading } = useBlogPosts(filters)
  const { count } = useBlogPostsCount({ ...filters, limit: undefined, offset: undefined })
  const { posts: featuredPosts } = useFeaturedBlogPosts(3)
  const { categories } = useBlogCategories()

  // Collect all tags from current posts for sidebar
  const allTags = useMemo(() => {
    const tagSet = new Set<string>()
    posts.forEach((p) => p.tags?.forEach((t) => tagSet.add(t)))
    featuredPosts.forEach((p) => p.tags?.forEach((t) => tagSet.add(t)))
    return Array.from(tagSet)
  }, [posts, featuredPosts])

  const totalPages = Math.ceil(count / PAGE_SIZE)

  function clearFilters() {
    setSearch('')
    setCategory(initialCategory ?? null)
    setTag(null)
    setPage(0)
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Hero */}
      {!initialCategory && (
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-lhc-text-main mb-3">
            Health Blog
          </h1>
          <p className="text-lhc-text-muted max-w-2xl mx-auto">
            Health tips, medical insights, and wellness advice from trusted healthcare providers.
          </p>
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-md mx-auto mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-lhc-text-muted" />
        <Input
          placeholder="Search articles..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0) }}
          className="pl-10"
        />
      </div>

      {/* Category Filter */}
      <div className="mb-8">
        <CategoryFilterBar
          categories={categories}
          selected={category ?? null}
          onSelect={(id) => { setCategory(id); setPage(0) }}
        />
      </div>

      {/* Active filters */}
      {hasUserFilters && (
        <div className="flex items-center gap-2 mb-6">
          <span className="text-sm text-lhc-text-muted">Filters active</span>
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="w-3.5 h-3.5 mr-1" /> Clear
          </Button>
        </div>
      )}

      <div className="flex gap-8">
        {/* Main content */}
        <div className="flex-1 min-w-0">
          {/* Featured (only when no filters and not category page) */}
          {!hasAnyFilter && !initialCategory && featuredPosts.length > 0 && (
            <div className="mb-10">
              <h2 className="text-xl font-semibold text-lhc-text-main mb-4">Featured</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {featuredPosts.map((post) => (
                  <BlogCard key={post.id} post={post} variant="featured" />
                ))}
              </div>
            </div>
          )}

          {/* Posts Grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-80 rounded-xl bg-lhc-border/30 animate-pulse" />
              ))}
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-lhc-text-muted">No articles found.</p>
              {hasUserFilters && (
                <Button variant="outline" className="mt-4" onClick={clearFilters}>
                  Clear filters
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {posts.map((post) => (
                <BlogCard key={post.id} post={post} />
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 mt-8">
              <Button
                variant="outline"
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                Previous
              </Button>
              <span className="text-sm text-lhc-text-muted">
                Page {page + 1} of {totalPages}
              </span>
              <Button
                variant="outline"
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </div>

        {/* Sidebar (desktop only) */}
        <aside className="hidden lg:block w-72 flex-shrink-0">
          <div className="sticky top-24">
            <BlogSidebar
              recentPosts={posts.slice(0, 4)}
              categories={categories}
              tags={allTags}
            />
          </div>
        </aside>
      </div>
    </div>
  )
}
