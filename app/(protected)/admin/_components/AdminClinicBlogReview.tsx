'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Check, X, Pencil, ExternalLink, Trash2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
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
import { getCategoryInfo, formatBlogDate, getGradientClass } from '@/lib/utils/blogUtils'
import type { BlogPost } from '@/lib/utils/blogUtils'

export default function AdminClinicBlogReview() {
  const { posts, loading, refetch } = useBlogPosts({
    status: 'draft',
    clinicIdNotNull: true,
    limit: 50,
  })
  const { update, loading: updating } = useUpdateBlogPost()
  const { remove, loading: deleting } = useDeleteBlogPost()

  const [rejectId, setRejectId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [deleteId, setDeleteId] = useState<string | null>(null)

  async function approve(id: string) {
    await update(id, {
      status: 'published',
      published_at: new Date().toISOString(),
    })
    refetch()
  }

  async function reject() {
    if (!rejectId || !rejectReason.trim()) return
    await update(rejectId, {
      status: 'rejected',
      rejection_reason: rejectReason.trim(),
    })
    setRejectId(null)
    setRejectReason('')
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
            return (
              <Card key={post.id}>
                <CardContent className="flex items-center gap-4 py-3">
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
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm text-lhc-text-main truncate">
                      {post.title}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
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
                      onClick={() => approve(post.id)}
                      disabled={updating}
                      title="Approve"
                    >
                      <Check className="w-4 h-4 mr-1" /> Approve
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setRejectId(post.id)}
                      title="Reject"
                    >
                      <X className="w-4 h-4 mr-1" /> Reject
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        window.open(
                          `/blog/${post.category ?? 'general'}/${post.slug}?preview=true`,
                          '_blank'
                        )
                      }
                      title="Preview"
                    >
                      <ExternalLink className="w-4 h-4" />
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
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Reject dialog */}
      <Dialog open={!!rejectId} onOpenChange={() => setRejectId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Post</DialogTitle>
            <DialogDescription>
              Provide a reason for rejection. The clinic will see this message.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Reason for rejection..."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={reject}
              disabled={!rejectReason.trim() || updating}
            >
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
