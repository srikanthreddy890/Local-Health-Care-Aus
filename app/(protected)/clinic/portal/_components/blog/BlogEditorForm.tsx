'use client'

import { useState, useEffect, useCallback, useMemo, Component } from 'react'
import type { ReactNode, ErrorInfo } from 'react'
import dynamic from 'next/dynamic'
import Image from 'next/image'
import DOMPurify from 'isomorphic-dompurify'
import { ArrowLeft, Loader2, Info, X, Check, AlertCircle, Eye, Pencil, Columns2, Cloud, CloudOff, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  useBlogPostById,
  useBlogCategories,
  useCheckSlugAvailability,
  useCreateBlogPost,
  useUpdateBlogPost,
} from '@/lib/hooks/useBlogPosts'
import {
  generateSlug,
  calculateReadingTime,
  getWordCount,
  generateExcerpt,
  BLOG_PURIFY_CONFIG,
  registerIframeHook,
} from '@/lib/utils/blogUtils'

registerIframeHook(DOMPurify)
import { useAutoSave } from '@/lib/hooks/useAutoSave'
import type { SaveStatus } from '@/lib/hooks/useAutoSave'
import BlogImageUpload from './BlogImageUpload'

const RichTextEditor = dynamic(() => import('./RichTextEditor'), {
  ssr: false,
  loading: () => (
    <div className="border border-lhc-border rounded-lg min-h-[400px] flex items-center justify-center bg-lhc-surface">
      <Loader2 className="w-5 h-5 animate-spin text-lhc-primary" />
    </div>
  ),
})

// Error boundary to catch editor initialization failures (e.g. chunk load errors on first visit)
class EditorErrorBoundary extends Component<
  { children: ReactNode; onRetry?: () => void },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: ReactNode; onRetry?: () => void }) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Blog editor error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="border border-lhc-border rounded-lg min-h-[400px] flex flex-col items-center justify-center bg-lhc-surface gap-3 p-6">
          <p className="text-sm text-lhc-text-muted">The editor failed to load.</p>
          <button
            type="button"
            className="flex items-center gap-2 text-sm text-lhc-primary hover:underline"
            onClick={() => this.setState({ hasError: false, error: null })}
          >
            <RefreshCw className="w-4 h-4" /> Try again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

interface ClinicContext {
  clinicId: string
  clinicName: string
  clinicLogo?: string
}

interface Props {
  postId?: string
  clinicContext?: ClinicContext
  onBack: () => void
  onSaved?: () => void
  isAdminEdit?: boolean
}

function SaveStatusIndicator({ status, lastSavedAt }: { status: SaveStatus; lastSavedAt: Date | null }) {
  if (status === 'idle') return null

  const getRelativeTime = (date: Date) => {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
    if (seconds < 10) return 'just now'
    if (seconds < 60) return `${seconds}s ago`
    const minutes = Math.floor(seconds / 60)
    return `${minutes}m ago`
  }

  return (
    <span className="flex items-center gap-1.5 text-xs">
      {status === 'unsaved' && (
        <>
          <CloudOff className="w-3.5 h-3.5 text-amber-500" />
          <span className="text-amber-600">Unsaved</span>
        </>
      )}
      {status === 'saving' && (
        <>
          <Loader2 className="w-3.5 h-3.5 animate-spin text-lhc-primary" />
          <span className="text-lhc-text-muted">Saving...</span>
        </>
      )}
      {status === 'saved' && (
        <>
          <Cloud className="w-3.5 h-3.5 text-green-500" />
          <span className="text-green-600">Saved {lastSavedAt ? getRelativeTime(lastSavedAt) : ''}</span>
        </>
      )}
    </span>
  )
}

export default function BlogEditorForm({ postId, clinicContext, onBack, onSaved, isAdminEdit }: Props) {
  const isClinic = !!clinicContext
  const { post: existingPost, loading: loadingPost } = useBlogPostById(postId ?? null)
  const { categories } = useBlogCategories()
  const { create, loading: creating } = useCreateBlogPost()
  const { update, loading: updating } = useUpdateBlogPost()

  // Form state
  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false)
  const [authorName, setAuthorName] = useState(clinicContext?.clinicName ?? '')
  const [category, setCategory] = useState('')
  const [excerpt, setExcerpt] = useState('')
  const [content, setContent] = useState('')
  const [featuredImageUrl, setFeaturedImageUrl] = useState('')
  const [featuredImageMode, setFeaturedImageMode] = useState<'upload' | 'url'>('upload')
  const [metaTitle, setMetaTitle] = useState('')
  const [metaDescription, setMetaDescription] = useState('')
  const [tagsInput, setTagsInput] = useState('')
  const [status, setStatus] = useState<'draft' | 'published'>('draft')
  const [isFeatured, setIsFeatured] = useState(false)

  // Preview mode
  const [previewMode, setPreviewMode] = useState<'edit' | 'preview' | 'split'>('edit')

  // Collapsible sections
  const [showSeo, setShowSeo] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showImage, setShowImage] = useState(false)

  // Load existing post
  useEffect(() => {
    if (!existingPost) return
    setTitle(existingPost.title)
    setSlug(existingPost.slug)
    setSlugManuallyEdited(true)
    setAuthorName(existingPost.author_name)
    setCategory(existingPost.category ?? '')
    setExcerpt(existingPost.excerpt ?? '')
    setContent(existingPost.content)
    setFeaturedImageUrl(existingPost.featured_image_url ?? '')
    setMetaTitle(existingPost.meta_title ?? '')
    setMetaDescription(existingPost.meta_description ?? '')
    setTagsInput(existingPost.tags?.join(', ') ?? '')
    setStatus(existingPost.status === 'published' ? 'published' : 'draft')
    setIsFeatured(existingPost.is_featured ?? false)
    if (existingPost.featured_image_url) setShowImage(true)
  }, [existingPost])

  // Auto-generate slug from title
  useEffect(() => {
    if (!slugManuallyEdited && title) {
      setSlug(generateSlug(title))
    }
  }, [title, slugManuallyEdited])

  const readingTime = calculateReadingTime(content)
  const wordCount = getWordCount(content)
  const isSaving = creating || updating

  const isContentEmpty = !content || content === '<p></p>' || content === '<p></p>\n'

  const tags = useMemo(() =>
    tagsInput.split(',').map((t) => t.trim()).filter(Boolean),
    [tagsInput]
  )

  // Auto-save
  const autoSaveData = useMemo(() => ({
    title,
    slug,
    content,
    excerpt: excerpt || generateExcerpt(content),
    featuredImageUrl,
    authorName: isClinic ? clinicContext!.clinicName : authorName,
    authorAvatarUrl: isClinic ? (clinicContext!.clinicLogo || null) : null,
    authorType: isClinic ? 'clinic' : 'platform',
    category,
    metaTitle,
    metaDescription,
    tags,
    readingTimeMinutes: readingTime,
    clinicId: isClinic ? clinicContext!.clinicId : undefined,
  }), [title, slug, content, excerpt, featuredImageUrl, authorName, category, metaTitle, metaDescription, tags, readingTime, isClinic, clinicContext])

  const { saveStatus, lastSavedAt, draftPostId, flushSave, performSave, initializeFromExisting, getEffectivePostId } = useAutoSave({
    postId,
    data: autoSaveData,
    enabled: !isAdminEdit && !!title.trim() && !isContentEmpty,
    debounceMs: 30000,
  })

  // Save unsaved changes before navigating away
  const handleBack = useCallback(async () => {
    if (saveStatus === 'unsaved' && title.trim() && !isContentEmpty) {
      await performSave()
    }
    onBack()
  }, [saveStatus, performSave, onBack, title, isContentEmpty])

  // Warn on browser navigation with unsaved changes
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (saveStatus === 'unsaved') {
        e.preventDefault()
      }
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [saveStatus])

  // Initialize content hash when existing post loads to prevent unnecessary first auto-save
  useEffect(() => {
    if (!existingPost) return
    initializeFromExisting({
      title: existingPost.title,
      slug: existingPost.slug,
      content: existingPost.content,
      excerpt: existingPost.excerpt ?? '',
      featuredImageUrl: existingPost.featured_image_url ?? '',
      authorName: existingPost.author_name,
      authorAvatarUrl: existingPost.author_avatar_url ?? null,
      authorType: existingPost.author_type,
      category: existingPost.category ?? '',
      metaTitle: existingPost.meta_title ?? '',
      metaDescription: existingPost.meta_description ?? '',
      tags: existingPost.tags ?? [],
      readingTimeMinutes: existingPost.reading_time_minutes ?? 1,
      clinicId: existingPost.clinic_id ?? undefined,
    })
  }, [existingPost, initializeFromExisting])

  // Slug availability — placed after auto-save hook so draftPostId is in scope
  const effectivePostIdForSlug = postId || draftPostId
  const { available: slugAvailable, checking: slugChecking } = useCheckSlugAvailability(
    slug,
    effectivePostIdForSlug ?? undefined
  )

  const handleSave = useCallback(async () => {
    if (!title.trim()) return
    if (isContentEmpty) return

    // Cancel any pending auto-save and wait for in-flight save
    await flushSave()

    const postData: Record<string, unknown> = {
      title: title.trim(),
      slug,
      content,
      excerpt: excerpt.trim() || generateExcerpt(content),
      featured_image_url: featuredImageUrl || null,
      author_name: isClinic ? clinicContext!.clinicName : authorName.trim(),
      author_avatar_url: isClinic ? (clinicContext!.clinicLogo || null) : null,
      author_type: isClinic ? 'clinic' : 'platform',
      category: category || null,
      meta_title: metaTitle.trim() || null,
      meta_description: metaDescription.trim() || null,
      tags: tags.length > 0 ? tags : null,
      reading_time_minutes: readingTime,
    }

    if (isAdminEdit) {
      // Admin edit: preserve current status
    } else if (isClinic) {
      postData.clinic_id = clinicContext!.clinicId
      postData.status = 'draft'
      postData.is_featured = false
      postData.rejection_reason = null
    } else {
      postData.status = status
      postData.is_featured = isFeatured
      if (status === 'published' && !existingPost?.published_at) {
        postData.published_at = new Date().toISOString()
      }
    }

    // Use ref-based ID to avoid stale state after flushSave
    const currentId = getEffectivePostId() || postId
    let result
    if (currentId) {
      result = await update(currentId, postData)
    } else {
      result = await create(postData)
    }

    if (result) {
      onSaved?.()
      onBack()
    }
  }, [
    title, slug, content, excerpt, featuredImageUrl, authorName, category,
    metaTitle, metaDescription, tags, status, isFeatured, readingTime,
    isClinic, clinicContext, postId, existingPost, create, update,
    onBack, onSaved, isContentEmpty, isAdminEdit, flushSave, getEffectivePostId,
  ])

  if (postId && loadingPost) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-lhc-primary" />
      </div>
    )
  }

  const sanitizedPreview = content ? DOMPurify.sanitize(content, BLOG_PURIFY_CONFIG) : ''

  const renderEditor = () => (
    <div className="space-y-6">
      {/* Main form card — wraps all fields on a white surface */}
      <div className="bg-lhc-surface rounded-xl border border-lhc-border shadow-sm">
        {/* Title — hero field */}
        <div className="p-6 pb-0">
          <Label className="mb-1.5 block">Title *</Label>
          <Input
            placeholder="Enter post title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="text-xl font-semibold h-12 bg-lhc-surface"
          />
        </div>

        {/* Meta fields in a compact grid */}
        <div className="p-6 pb-0 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Slug */}
          <div>
            <Label className="mb-1.5 block">URL Slug</Label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-lhc-text-muted whitespace-nowrap">/blog/</span>
              <Input
                value={slug}
                onChange={(e) => {
                  setSlug(generateSlug(e.target.value))
                  setSlugManuallyEdited(true)
                }}
                className="flex-1 bg-lhc-surface"
              />
              {slugChecking && <Loader2 className="w-4 h-4 animate-spin" />}
              {slugAvailable === true && <Check className="w-4 h-4 text-green-500" />}
              {slugAvailable === false && (
                <div className="flex items-center gap-1">
                  <AlertCircle className="w-4 h-4 text-red-500" />
                  <button
                    type="button"
                    className="text-xs text-lhc-primary underline"
                    onClick={() => setSlug(`${slug}-2`)}
                  >
                    Try {slug}-2
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Author Name */}
          <div>
            <Label className="mb-1.5 block">Author Name *</Label>
            <Input
              placeholder="Author name"
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              readOnly={isClinic}
              className={isClinic ? 'bg-lhc-background/60' : 'bg-lhc-surface'}
            />
          </div>

          {/* Category */}
          <div>
            <Label className="mb-1.5 block">Category {!isClinic ? '*' : ''}</Label>
            <Select value={category || 'none'} onValueChange={(v) => setCategory(v === 'none' ? '' : v)}>
              <SelectTrigger className="bg-lhc-surface">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Excerpt */}
          <div>
            <Label className="mb-1.5 block">Excerpt (optional)</Label>
            <Textarea
              placeholder="Short summary of the post"
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              rows={2}
              className="bg-lhc-surface"
            />
          </div>
        </div>

        {/* Content editor — full width, visually separated */}
        <div className="p-6">
          <Label className="mb-1.5 block">Content *</Label>
          <EditorErrorBoundary>
            <RichTextEditor
              content={content}
              onChange={setContent}
              clinicId={clinicContext?.clinicId ?? 'platform'}
            />
          </EditorErrorBoundary>
          {isContentEmpty && title.trim() && (
            <p className="text-xs text-red-500 mt-1.5">Content is required</p>
          )}
        </div>
      </div>

      {/* Collapsible sections — outside the main card */}
      {/* Featured Image */}
      <Card>
        <CardHeader
          className="cursor-pointer py-4"
          onClick={() => setShowImage(!showImage)}
        >
          <CardTitle className="text-sm flex items-center justify-between">
            Featured Image
            <span className="text-xs text-lhc-text-muted">{showImage ? '−' : '+'}</span>
          </CardTitle>
        </CardHeader>
        {showImage && (
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Button
                variant={featuredImageMode === 'upload' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFeaturedImageMode('upload')}
              >
                Upload
              </Button>
              <Button
                variant={featuredImageMode === 'url' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFeaturedImageMode('url')}
              >
                URL
              </Button>
            </div>

            {featuredImageMode === 'upload' ? (
              <BlogImageUpload
                clinicId={clinicContext?.clinicId ?? 'platform'}
                onUpload={(url) => setFeaturedImageUrl(url)}
              />
            ) : (
              <Input
                placeholder="https://example.com/image.jpg"
                value={featuredImageUrl}
                onChange={(e) => setFeaturedImageUrl(e.target.value)}
              />
            )}

            {featuredImageUrl && (
              <div className="relative">
                <Image
                  src={featuredImageUrl}
                  alt="Featured image preview"
                  width={400}
                  height={225}
                  className="rounded-lg object-cover"
                />
                <Button
                  variant="destructive"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={() => setFeaturedImageUrl('')}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* SEO Settings */}
      <Card>
        <CardHeader
          className="cursor-pointer py-4"
          onClick={() => setShowSeo(!showSeo)}
        >
          <CardTitle className="text-sm flex items-center justify-between">
            SEO Settings
            <span className="text-xs text-lhc-text-muted">{showSeo ? '−' : '+'}</span>
          </CardTitle>
        </CardHeader>
        {showSeo && (
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label>Meta Title</Label>
                <span className={`text-xs ${metaTitle.length > 60 ? 'text-red-500' : 'text-lhc-text-muted'}`}>
                  {metaTitle.length}/60
                </span>
              </div>
              <Input
                placeholder="SEO title (max 60 chars)"
                value={metaTitle}
                onChange={(e) => setMetaTitle(e.target.value)}
                maxLength={60}
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label>Meta Description</Label>
                <span className={`text-xs ${metaDescription.length > 160 ? 'text-red-500' : 'text-lhc-text-muted'}`}>
                  {metaDescription.length}/160
                </span>
              </div>
              <Textarea
                placeholder="SEO description (max 160 chars)"
                value={metaDescription}
                onChange={(e) => setMetaDescription(e.target.value)}
                maxLength={160}
                rows={2}
              />
            </div>
          </CardContent>
        )}
      </Card>

      {/* Post Settings */}
      <Card>
        <CardHeader
          className="cursor-pointer py-4"
          onClick={() => setShowSettings(!showSettings)}
        >
          <CardTitle className="text-sm flex items-center justify-between">
            Post Settings
            <span className="text-xs text-lhc-text-muted">{showSettings ? '−' : '+'}</span>
          </CardTitle>
        </CardHeader>
        {showSettings && (
          <CardContent className="space-y-4">
            {/* Tags */}
            <div>
              <Label>Tags (comma-separated)</Label>
              <Input
                placeholder="health, wellness, tips"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
              />
              {tagsInput && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {isClinic ? (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 text-blue-700 text-sm">
                <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <p>
                  Your post will be reviewed by the Local Healthcare team before publishing.
                </p>
              </div>
            ) : !isAdminEdit ? (
              <>
                {/* Status */}
                <div>
                  <Label>Status</Label>
                  <Select
                    value={status}
                    onValueChange={(v) => setStatus(v as 'draft' | 'published')}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="published">Published</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Featured */}
                <div className="flex items-center justify-between">
                  <Label>Featured Post</Label>
                  <Switch checked={isFeatured} onCheckedChange={setIsFeatured} />
                </div>
              </>
            ) : null}
          </CardContent>
        )}
      </Card>
    </div>
  )

  const renderPreview = () => (
    <div className="bg-white rounded-lg border border-lhc-border p-6">
      {featuredImageUrl && (
        <div className="relative aspect-video rounded-xl overflow-hidden mb-6">
          <Image
            src={featuredImageUrl}
            alt={title || 'Featured image'}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 800px"
          />
        </div>
      )}
      {title && (
        <h1 className="text-2xl sm:text-3xl font-bold text-lhc-text-main mb-4">
          {title}
        </h1>
      )}
      {excerpt && (
        <p className="text-lhc-text-muted mb-4 italic">{excerpt}</p>
      )}
      <div
        className="prose prose-lg max-w-none prose-headings:text-lhc-text-main prose-p:text-lhc-text-main prose-a:text-lhc-primary prose-img:rounded-lg"
        dangerouslySetInnerHTML={{ __html: sanitizedPreview }}
      />
    </div>
  )

  return (
    <div>
      {/* Sticky header */}
      <div className="sticky top-0 z-10 bg-lhc-background/95 backdrop-blur-sm border-b border-lhc-border -mx-4 sm:-mx-6 px-4 sm:px-6 py-3 mb-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <Button variant="ghost" onClick={handleBack} className="gap-2">
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>
          <div className="flex items-center gap-3 flex-wrap">
            {/* Preview mode toggles */}
            <div className="flex items-center bg-lhc-surface border border-lhc-border rounded-lg overflow-hidden shadow-sm">
              <button
                type="button"
                className={`px-3 py-1.5 text-xs flex items-center gap-1.5 font-medium transition-colors ${previewMode === 'edit' ? 'bg-lhc-primary text-white' : 'text-lhc-text-muted hover:text-lhc-text-main hover:bg-lhc-background/50'}`}
                onClick={() => setPreviewMode('edit')}
                title="Edit"
              >
                <Pencil className="w-3.5 h-3.5" /> Edit
              </button>
              <button
                type="button"
                className={`px-3 py-1.5 text-xs flex items-center gap-1.5 font-medium transition-colors border-x border-lhc-border ${previewMode === 'split' ? 'bg-lhc-primary text-white' : 'text-lhc-text-muted hover:text-lhc-text-main hover:bg-lhc-background/50'}`}
                onClick={() => setPreviewMode('split')}
                title="Split view"
              >
                <Columns2 className="w-3.5 h-3.5" /> Split
              </button>
              <button
                type="button"
                className={`px-3 py-1.5 text-xs flex items-center gap-1.5 font-medium transition-colors ${previewMode === 'preview' ? 'bg-lhc-primary text-white' : 'text-lhc-text-muted hover:text-lhc-text-main hover:bg-lhc-background/50'}`}
                onClick={() => setPreviewMode('preview')}
                title="Preview"
              >
                <Eye className="w-3.5 h-3.5" /> Preview
              </button>
            </div>

            <SaveStatusIndicator status={saveStatus} lastSavedAt={lastSavedAt} />

            <span className="text-sm text-lhc-text-muted hidden sm:inline">
              {wordCount} words · {readingTime} min read
            </span>
            <Button onClick={handleSave} disabled={isSaving || !title.trim() || isContentEmpty}>
              {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isAdminEdit
                ? 'Save Edits'
                : isClinic
                  ? 'Submit for Review'
                  : status === 'published'
                    ? 'Publish'
                    : 'Save Draft'}
            </Button>
          </div>
        </div>
      </div>

      {/* Content area */}
      {previewMode === 'edit' && renderEditor()}
      {previewMode === 'preview' && renderPreview()}
      {previewMode === 'split' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>{renderEditor()}</div>
          <div className="lg:sticky lg:top-20 lg:self-start">
            <h3 className="text-sm font-medium text-lhc-text-muted mb-3">Live Preview</h3>
            {renderPreview()}
          </div>
        </div>
      )}
    </div>
  )
}
