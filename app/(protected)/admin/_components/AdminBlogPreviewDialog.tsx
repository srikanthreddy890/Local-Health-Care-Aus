'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import DOMPurify from 'isomorphic-dompurify'
import { Check, X, Pencil, Eye, Loader2, Clock, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  useBlogPostById,
  useUpdateBlogPost,
} from '@/lib/hooks/useBlogPosts'
import {
  getCategoryInfo,
  formatBlogDate,
  getGradientClass,
  getWordCount,
  calculateReadingTime,
  BLOG_PURIFY_CONFIG,
} from '@/lib/utils/blogUtils'
import BlogEditorForm from '@/app/(protected)/clinic/portal/_components/blog/BlogEditorForm'

interface Props {
  postId: string | null
  onClose: () => void
  onUpdated: () => void
}

export default function AdminBlogPreviewDialog({ postId, onClose, onUpdated }: Props) {
  const { post, loading, refetch } = useBlogPostById(postId)
  const { update, loading: updating } = useUpdateBlogPost()

  const [mode, setMode] = useState<'preview' | 'edit'>('preview')
  const [showRejectForm, setShowRejectForm] = useState(false)
  const [rejectReason, setRejectReason] = useState('')

  // Reset state when opening a different post
  useEffect(() => {
    setMode('preview')
    setShowRejectForm(false)
    setRejectReason('')
  }, [postId])

  async function approve() {
    if (!postId) return
    await update(postId, {
      status: 'published',
      published_at: new Date().toISOString(),
    })
    onUpdated()
    onClose()
  }

  async function reject() {
    if (!postId || !rejectReason.trim()) return
    await update(postId, {
      status: 'rejected',
      rejection_reason: rejectReason.trim(),
    })
    setRejectReason('')
    setShowRejectForm(false)
    onUpdated()
    onClose()
  }

  const sanitized = post ? DOMPurify.sanitize(post.content, BLOG_PURIFY_CONFIG) : ''
  const catInfo = post?.category ? getCategoryInfo(post.category) : null
  const wordCount = post ? getWordCount(post.content) : 0
  const readingTime = post ? calculateReadingTime(post.content) : 0

  return (
    <Dialog open={!!postId} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            {mode === 'preview' ? 'Review Blog Post' : 'Edit Blog Post'}
            <div className="flex items-center gap-1 ml-auto">
              <Button
                variant={mode === 'preview' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setMode('preview')}
              >
                <Eye className="w-4 h-4 mr-1" /> Preview
              </Button>
              <Button
                variant={mode === 'edit' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setMode('edit')}
              >
                <Pencil className="w-4 h-4 mr-1" /> Edit
              </Button>
            </div>
          </DialogTitle>
          <DialogDescription>
            Review the content and approve or reject this clinic submission.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-lhc-primary" />
          </div>
        ) : !post ? (
          <div className="text-center py-8 text-lhc-text-muted">Post not found.</div>
        ) : mode === 'edit' ? (
          <BlogEditorForm
            postId={post.id}
            onBack={() => { setMode('preview'); refetch() }}
            onSaved={() => { refetch(); onUpdated() }}
            isAdminEdit
          />
        ) : (
          <div className="space-y-6">
            {/* Post metadata */}
            <div className="flex items-center gap-3 flex-wrap">
              {catInfo && <Badge>{catInfo.label}</Badge>}
              {post.tags?.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="outline">{tag}</Badge>
              ))}
              <span className="text-xs text-lhc-text-muted flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> {readingTime} min read
              </span>
              <span className="text-xs text-lhc-text-muted">
                {wordCount} words
              </span>
              {post.created_at && (
                <span className="text-xs text-lhc-text-muted flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" /> {formatBlogDate(post.created_at)}
                </span>
              )}
            </div>

            {/* Author info */}
            <div className="flex items-center gap-3">
              {post.author_avatar_url ? (
                <Image
                  src={post.author_avatar_url}
                  alt={post.author_name}
                  width={36}
                  height={36}
                  className="rounded-full"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-lhc-primary/20 flex items-center justify-center text-sm font-medium text-lhc-primary">
                  {post.author_name.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-lhc-text-main">{post.author_name}</p>
                <p className="text-xs text-lhc-text-muted">{post.author_type === 'clinic' ? 'Clinic' : 'Editorial'}</p>
              </div>
            </div>

            {/* Featured image */}
            {post.featured_image_url ? (
              <div className="relative aspect-video rounded-xl overflow-hidden">
                <Image
                  src={post.featured_image_url}
                  alt={post.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 800px"
                />
              </div>
            ) : (
              <div className={`aspect-video rounded-xl bg-gradient-to-br ${getGradientClass(post.title)}`} />
            )}

            {/* Title */}
            <h2 className="text-2xl font-bold text-lhc-text-main">{post.title}</h2>

            {/* Excerpt */}
            {post.excerpt && (
              <p className="text-lhc-text-muted italic border-l-4 border-lhc-primary pl-4">
                {post.excerpt}
              </p>
            )}

            {/* Content */}
            <div
              className="prose prose-lg max-w-none prose-headings:text-lhc-text-main prose-p:text-lhc-text-main prose-a:text-lhc-primary prose-img:rounded-lg"
              dangerouslySetInnerHTML={{ __html: sanitized }}
            />

            {/* Reject form */}
            {showRejectForm && (
              <div className="space-y-3 p-4 bg-red-50 rounded-lg border border-red-200">
                <p className="text-sm font-medium text-red-700">Rejection Reason</p>
                <Textarea
                  placeholder="Explain why this post is being rejected..."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  rows={3}
                  className="border-red-200"
                />
                <div className="flex gap-2">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={reject}
                    disabled={!rejectReason.trim() || updating}
                  >
                    {updating && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
                    Confirm Rejection
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => { setShowRejectForm(false); setRejectReason('') }}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {/* Action buttons */}
            {!showRejectForm && (
              <div className="flex items-center gap-2 pt-4 border-t border-lhc-border">
                <Button onClick={approve} disabled={updating}>
                  {updating && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
                  <Check className="w-4 h-4 mr-1" /> Approve & Publish
                </Button>
                <Button variant="outline" onClick={() => setShowRejectForm(true)}>
                  <X className="w-4 h-4 mr-1" /> Reject
                </Button>
                <Button variant="ghost" onClick={() => setMode('edit')}>
                  <Pencil className="w-4 h-4 mr-1" /> Edit Post
                </Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
