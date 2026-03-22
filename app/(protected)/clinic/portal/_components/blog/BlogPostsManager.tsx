'use client'

import { useState, useMemo } from 'react'
import Image from 'next/image'
import {
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  ExternalLink,
  Trash2,
  Star,
  Eye,
  Clock,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  useBlogPosts,
  useBlogCategories,
  useDeleteBlogPost,
} from '@/lib/hooks/useBlogPosts'
import { getCategoryInfo, formatBlogDate, getGradientClass } from '@/lib/utils/blogUtils'
import type { BlogPost } from '@/lib/utils/blogUtils'
import BlogEditorForm from './BlogEditorForm'

interface ClinicContext {
  clinicId: string
  clinicName: string
  clinicLogo?: string
}

interface Props {
  clinicContext?: ClinicContext
  platformOnly?: boolean
}

function StatusBadge({ status, isClinic }: { status: string; isClinic: boolean }) {
  if (status === 'published') return <Badge className="bg-green-100 text-green-700">Published</Badge>
  if (status === 'rejected') return <Badge className="bg-red-100 text-red-700">Rejected</Badge>
  if (status === 'archived') return <Badge variant="outline">Archived</Badge>
  // draft
  if (isClinic) return <Badge className="bg-amber-100 text-amber-700">Pending Review</Badge>
  return <Badge className="bg-amber-100 text-amber-700">Draft</Badge>
}

export default function BlogPostsManager({ clinicContext, platformOnly }: Props) {
  const isClinic = !!clinicContext
  const [view, setView] = useState<'list' | 'editor'>('list')
  const [editingPostId, setEditingPostId] = useState<string | undefined>()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [page, setPage] = useState(0)
  const PAGE_SIZE = 50

  const filters = useMemo(() => ({
    ...(isClinic ? { clinicId: clinicContext!.clinicId } : {}),
    ...(platformOnly ? { clinicIdIsNull: true } : {}),
    ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
    ...(categoryFilter !== 'all' ? { category: categoryFilter } : {}),
    ...(search ? { searchQuery: search } : {}),
    limit: PAGE_SIZE + 1, // Fetch one extra to detect if there's a next page
    offset: page * PAGE_SIZE,
  }), [isClinic, clinicContext, platformOnly, statusFilter, categoryFilter, search, page])

  const { posts: rawPosts, loading, refetch } = useBlogPosts(filters)
  const { categories } = useBlogCategories()
  const { remove, loading: deleting } = useDeleteBlogPost()

  const hasNextPage = rawPosts.length > PAGE_SIZE
  const posts = hasNextPage ? rawPosts.slice(0, PAGE_SIZE) : rawPosts

  function openEditor(postId?: string) {
    setEditingPostId(postId)
    setView('editor')
  }

  async function handleDelete() {
    if (!deleteId) return
    const ok = await remove(deleteId)
    if (ok) {
      setDeleteId(null)
      refetch()
    }
  }

  if (view === 'editor') {
    return (
      <BlogEditorForm
        postId={editingPostId}
        clinicContext={clinicContext}
        onBack={() => { setView('list'); setEditingPostId(undefined) }}
        onSaved={refetch}
      />
    )
  }

  const statusOptions = isClinic
    ? [
        { value: 'all', label: 'All' },
        { value: 'draft', label: 'Pending Review' },
        { value: 'published', label: 'Published' },
        { value: 'rejected', label: 'Rejected' },
      ]
    : [
        { value: 'all', label: 'All' },
        { value: 'draft', label: 'Draft' },
        { value: 'published', label: 'Published' },
        { value: 'archived', label: 'Archived' },
        { value: 'rejected', label: 'Rejected' },
      ]

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-lhc-text-main">Blog Posts</h2>
          <p className="text-sm text-lhc-text-muted">
            {isClinic
              ? 'Create and manage blog posts for your clinic.'
              : 'Manage all blog posts.'}
          </p>
        </div>
        <Button onClick={() => openEditor()}>
          <Plus className="w-4 h-4 mr-2" /> New Post
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-lhc-text-muted" />
          <Input
            placeholder="Search posts..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0) }}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0) }}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v); setPage(0) }}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Posts list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-lg bg-lhc-border/30 animate-pulse" />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-lhc-text-muted">No posts found.</p>
          <Button className="mt-4" onClick={() => openEditor()}>
            <Plus className="w-4 h-4 mr-2" /> Create your first post
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => (
            <PostRow
              key={post.id}
              post={post}
              isClinic={isClinic}
              onEdit={() => openEditor(post.id)}
              onDelete={() => setDeleteId(post.id)}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {(page > 0 || hasNextPage) && (
        <div className="flex items-center justify-center gap-4 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(page - 1)}
            disabled={page === 0}
          >
            <ChevronLeft className="w-4 h-4 mr-1" /> Previous
          </Button>
          <span className="text-sm text-lhc-text-muted">
            Page {page + 1}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(page + 1)}
            disabled={!hasNextPage}
          >
            Next <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      )}

      {/* Delete confirmation */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Post</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this post? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function PostRow({
  post,
  isClinic,
  onEdit,
  onDelete,
}: {
  post: BlogPost
  isClinic: boolean
  onEdit: () => void
  onDelete: () => void
}) {
  const catInfo = post.category ? getCategoryInfo(post.category) : null

  return (
    <Card>
      <CardContent className="flex items-center gap-4 py-3">
        {/* Thumbnail */}
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

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-sm text-lhc-text-main truncate">{post.title}</h3>
            {post.is_featured && <Star className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />}
          </div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {catInfo && (
              <Badge variant="outline" className="text-xs">
                {catInfo.label}
              </Badge>
            )}
            <StatusBadge status={post.status} isClinic={isClinic} />
            {(post.view_count ?? 0) > 0 && (
              <span className="text-xs text-lhc-text-muted flex items-center gap-1">
                <Eye className="w-3 h-3" /> {post.view_count}
              </span>
            )}
            {post.created_at && (
              <span className="text-xs text-lhc-text-muted">
                {formatBlogDate(post.created_at)}
              </span>
            )}
          </div>
          {/* Rejection reason */}
          {post.status === 'rejected' && post.rejection_reason && (
            <p className="text-xs text-red-600 mt-1 line-clamp-1">
              Reason: {post.rejection_reason}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <Button variant="ghost" size="sm" onClick={onEdit} title="Edit">
            <Pencil className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            title="Preview"
            onClick={() => {
              const category = post.category ?? 'general'
              window.open(`/blog/${category}/${post.slug}?preview=true`, '_blank')
            }}
          >
            <ExternalLink className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onDelete} title="Delete">
            <Trash2 className="w-4 h-4 text-red-500" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
