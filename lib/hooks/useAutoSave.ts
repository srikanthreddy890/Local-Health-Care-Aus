'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

export type SaveStatus = 'idle' | 'unsaved' | 'saving' | 'saved'

interface AutoSaveData {
  title: string
  slug: string
  content: string
  excerpt: string
  featuredImageUrl: string
  authorName: string
  authorAvatarUrl: string | null
  authorType: string
  category: string
  metaTitle: string
  metaDescription: string
  tags: string[]
  readingTimeMinutes: number
  clinicId?: string
}

interface UseAutoSaveOptions {
  postId?: string
  data: AutoSaveData
  enabled: boolean
  debounceMs?: number
}

function buildContentHash(d: AutoSaveData): string {
  return JSON.stringify({
    title: d.title, content: d.content, slug: d.slug,
    excerpt: d.excerpt, featuredImageUrl: d.featuredImageUrl,
    category: d.category, metaTitle: d.metaTitle,
    metaDescription: d.metaDescription, tags: d.tags,
  })
}

export function useAutoSave({ postId, data, enabled, debounceMs = 30000 }: UseAutoSaveOptions) {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)
  const [draftPostId, setDraftPostId] = useState<string | null>(postId ?? null)

  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const savingRef = useRef(false)
  const lastSavedContentRef = useRef<string>('')
  const dataRef = useRef(data)
  dataRef.current = data
  const saveStatusRef = useRef<SaveStatus>('idle')

  const draftPostIdRef = useRef(draftPostId)
  draftPostIdRef.current = draftPostId

  const buildPostData = useCallback((d: AutoSaveData): Record<string, unknown> => {
    const postData: Record<string, unknown> = {
      title: d.title.trim(),
      slug: d.slug,
      content: d.content,
      excerpt: d.excerpt.trim() || null,
      featured_image_url: d.featuredImageUrl || null,
      author_name: d.authorName,
      author_avatar_url: d.authorAvatarUrl,
      author_type: d.authorType,
      category: d.category || null,
      meta_title: d.metaTitle.trim() || null,
      meta_description: d.metaDescription.trim() || null,
      tags: d.tags.length > 0 ? d.tags : null,
      reading_time_minutes: d.readingTimeMinutes,
      status: 'draft',
      updated_at: new Date().toISOString(),
    }
    if (d.clinicId) {
      postData.clinic_id = d.clinicId
      postData.is_featured = false
    }
    return postData
  }, [])

  const performSave = useCallback(async () => {
    const d = dataRef.current
    if (!d.title.trim()) return
    if (!d.content || d.content === '<p></p>' || d.content === '<p></p>\n') return

    const contentHash = buildContentHash(d)
    if (contentHash === lastSavedContentRef.current) {
      setSaveStatus('saved')
      saveStatusRef.current = 'saved'
      return
    }

    if (savingRef.current) return
    savingRef.current = true
    setSaveStatus('saving')
    saveStatusRef.current = 'saving'

    try {
      const supabase = createClient()
      const postData = buildPostData(d)
      const currentDraftId = draftPostIdRef.current

      if (currentDraftId) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase as any)
          .from('blog_posts')
          .update(postData)
          .eq('id', currentDraftId)
        if (error) throw error
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: created, error } = await (supabase as any)
          .from('blog_posts')
          .insert(postData)
          .select('id')
          .single()
        if (error) throw error
        if (created) {
          setDraftPostId(created.id)
          draftPostIdRef.current = created.id
        }
      }

      lastSavedContentRef.current = contentHash
      setLastSavedAt(new Date())
      setSaveStatus('saved')
      saveStatusRef.current = 'saved'
    } catch {
      setSaveStatus('unsaved')
      saveStatusRef.current = 'unsaved'
    } finally {
      savingRef.current = false
    }
  }, [buildPostData])

  // Mark unsaved when data changes and schedule debounced save
  useEffect(() => {
    if (!enabled) return
    if (!data.title.trim()) return

    const isContentEmpty = !data.content || data.content === '<p></p>' || data.content === '<p></p>\n'
    if (isContentEmpty) return

    // Skip if content hasn't changed from last save
    const contentHash = buildContentHash(data)
    if (contentHash === lastSavedContentRef.current) return

    setSaveStatus('unsaved')
    saveStatusRef.current = 'unsaved'
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      performSave()
    }, debounceMs)

    return () => clearTimeout(timerRef.current)
  }, [data.title, data.slug, data.content, data.excerpt, data.featuredImageUrl, data.category, data.metaTitle, data.metaDescription, JSON.stringify(data.tags), enabled, debounceMs, performSave])

  // Flush on unmount using refs (not stale state)
  useEffect(() => {
    return () => {
      clearTimeout(timerRef.current)
      if (saveStatusRef.current === 'unsaved') {
        performSave()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Sync external postId and initialize content hash for existing posts
  useEffect(() => {
    if (postId) {
      setDraftPostId(postId)
      draftPostIdRef.current = postId
    }
  }, [postId])

  // Initialize content hash when existing post data loads to prevent unnecessary first save
  const initializeFromExisting = useCallback((existingData: AutoSaveData) => {
    lastSavedContentRef.current = buildContentHash(existingData)
  }, [])

  const flushSave = useCallback(async () => {
    clearTimeout(timerRef.current)
    if (saveStatusRef.current === 'unsaved') {
      // Trigger immediate save for pending changes
      await performSave()
    } else if (savingRef.current) {
      // Wait for current save to finish
      await new Promise<void>((resolve) => {
        const check = () => {
          if (!savingRef.current) resolve()
          else setTimeout(check, 50)
        }
        check()
      })
    }
  }, [performSave])

  // Use ref for getEffectivePostId to avoid stale state in handleSave
  const getEffectivePostId = useCallback((): string | null => {
    return draftPostIdRef.current
  }, [])

  return { saveStatus, lastSavedAt, draftPostId, flushSave, performSave, initializeFromExisting, getEffectivePostId }
}
