'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Check, X, Eye, Trash2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
  useBlogPosts,
  useUpdateBlogPost,
  useDeleteBlogPost,
} from '@/lib/hooks/useBlogPosts'
import { getCategoryInfo, formatBlogDate, getGradientClass, generateExcerpt } from '@/lib/utils/blogUtils'
import AdminBlogPreviewDialog from './AdminBlogPreviewDialog'

export default function AdminClinicBlogReview() {
  const { posts, loading, refetch } = useBlogPosts({
    status: 'draft',
    clinicIdNotNull: true,
    limit: 50,
  })
  const { update, loading: updating } = useUpdateBlogPost()
  const { remove, loading: deleting } = useDeleteBlogPost()

  const [previewPostId, setPreviewPostId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  async function quickApprove(id: string) {
    await update(id, {
      status: 'published',
      published_at: new Date().toISOString(),
    })
    refetch()
  }

  async function handleDelete() {
    if (!deleteId) return
    await remove(deleteId)
    setDeleteId(null)
    refetch()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-lhc-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-lhc-text-main">Clinic Blog Review</h2>
        <p className="text-sm text-lhc-text-muted">
          Review and approve blog posts submitted by clinics.
        </p>
      </div>

      {posts.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-lhc-text-muted">No posts pending review.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => {
            const catInfo = post.category ? getCategoryInfo(post.category) : null
            const excerptText = post.excerpt || generateExcerpt(post.content, 120)
            return (
              <Card key={post.id}>
                <CardContent className="py-4">
                  <div className="flex items-start gap-4">
                    <div className="relative w-20 h-20 rounded-md overflow-hidden flex-shrink-0">
                      {post.featured_image_url ? (
                        <Image
                          src={post.featured_image_url}
                          alt={post.title}
                          fill
                          className="object-cover"
                          sizes="80px"
                        />
                      ) : (
                        <div className={`w-full h-full bg-gradient-to-br ${getGradientClass(post.title)}`} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-sm text-lhc-text-main">
                        {post.title}
                      </h3>
                      <p className="text-xs text-lhc-text-muted mt-1 line-clamp-2">
                        {excerptText}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs text-lhc-text-muted">by {post.author_name}</span>
                        {catInfo && (
                          <Badge variant="outline" className="text-xs">
                            {catInfo.label}
                          </Badge>
                        )}
                        {post.created_at && (
                          <span className="text-xs text-lhc-text-muted">
                            {formatBlogDate(post.created_at)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button
                        size="sm"
                        onClick={() => setPreviewPostId(post.id)}
                        title="Review"
                      >
                        <Eye className="w-4 h-4 mr-1" /> Review
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => quickApprove(post.id)}
                        disabled={updating}
                        title="Quick approve"
                      >
                        <Check className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteId(post.id)}
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Full preview/edit dialog */}
      <AdminBlogPreviewDialog
        postId={previewPostId}
        onClose={() => setPreviewPostId(null)}
        onUpdated={refetch}
      />

      {/* Delete dialog */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Post</DialogTitle>
            <DialogDescription>
              Are you sure? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
