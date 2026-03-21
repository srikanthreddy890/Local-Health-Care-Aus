'use client'

import { useState, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import Image from 'next/image'
import { ArrowLeft, Loader2, Info, X, Check, AlertCircle } from 'lucide-react'
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
} from '@/lib/utils/blogUtils'
import BlogImageUpload from './BlogImageUpload'

const RichTextEditor = dynamic(() => import('./RichTextEditor'), { ssr: false })

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
}

export default function BlogEditorForm({ postId, clinicContext, onBack, onSaved }: Props) {
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

  // Collapsible sections
  const [showSeo, setShowSeo] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showImage, setShowImage] = useState(false)

  // Slug availability
  const { available: slugAvailable, checking: slugChecking } = useCheckSlugAvailability(
    slug,
    postId
  )

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

  const handleSave = useCallback(async () => {
    if (!title.trim()) return
    if (isContentEmpty) return

    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)

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

    if (isClinic) {
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

    let result
    if (postId) {
      result = await update(postId, postData)
    } else {
      result = await create(postData)
    }

    if (result) {
      onSaved?.()
      onBack()
    }
  }, [
    title, slug, content, excerpt, featuredImageUrl, authorName, category,
    metaTitle, metaDescription, tagsInput, status, isFeatured, readingTime,
    isClinic, clinicContext, postId, existingPost, create, update, onBack, onSaved, isContentEmpty,
  ])

  if (postId && loadingPost) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-lhc-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>
        <div className="flex items-center gap-3">
          <span className="text-sm text-lhc-text-muted">
            {wordCount} words · {readingTime} min read
          </span>
          <Button onClick={handleSave} disabled={isSaving || !title.trim() || isContentEmpty}>
            {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {isClinic ? 'Submit for Review' : status === 'published' ? 'Publish' : 'Save Draft'}
          </Button>
        </div>
      </div>

      {/* Title */}
      <div>
        <Label>Title *</Label>
        <Input
          placeholder="Enter post title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="text-lg font-semibold"
        />
      </div>

      {/* Slug */}
      <div>
        <Label>URL Slug</Label>
        <div className="flex items-center gap-2">
          <span className="text-sm text-lhc-text-muted">/blog/</span>
          <Input
            value={slug}
            onChange={(e) => {
              setSlug(generateSlug(e.target.value))
              setSlugManuallyEdited(true)
            }}
            className="flex-1"
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
        <Label>Author Name *</Label>
        <Input
          placeholder="Author name"
          value={authorName}
          onChange={(e) => setAuthorName(e.target.value)}
          readOnly={isClinic}
          className={isClinic ? 'bg-lhc-background/50' : ''}
        />
      </div>

      {/* Category */}
      <div>
        <Label>Category {!isClinic ? '*' : ''}</Label>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger>
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
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
        <Label>Excerpt (optional)</Label>
        <Textarea
          placeholder="Short summary of the post"
          value={excerpt}
          onChange={(e) => setExcerpt(e.target.value)}
          rows={2}
        />
      </div>

      {/* Content */}
      <div>
        <Label>Content *</Label>
        <RichTextEditor
          content={content}
          onChange={setContent}
          clinicId={clinicContext?.clinicId ?? 'platform'}
        />
        {isContentEmpty && title.trim() && (
          <p className="text-xs text-red-500 mt-1">Content is required</p>
        )}
      </div>

      {/* Featured Image (collapsible) */}
      <Card>
        <CardHeader
          className="cursor-pointer"
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

      {/* SEO Settings (collapsible) */}
      <Card>
        <CardHeader
          className="cursor-pointer"
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

      {/* Post Settings (collapsible) */}
      <Card>
        <CardHeader
          className="cursor-pointer"
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
                  {tagsInput
                    .split(',')
                    .map((t) => t.trim())
                    .filter(Boolean)
                    .map((tag) => (
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
            ) : (
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
            )}
          </CardContent>
        )}
      </Card>
    </div>
  )
}
