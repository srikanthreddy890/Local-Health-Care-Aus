'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from '@/lib/toast'
import type { BlogPost, BlogCategory } from '@/lib/utils/blogUtils'

/* ------------------------------------------------------------------ */
/*  Filter types                                                       */
/* ------------------------------------------------------------------ */

export interface BlogFilters {
  category?: string
  status?: string
  isFeatured?: boolean
  limit?: number
  offset?: number
  searchQuery?: string
  tag?: string
  clinicId?: string
  clinicIdNotNull?: boolean
  clinicIdIsNull?: boolean
}

/* ------------------------------------------------------------------ */
/*  Query helpers                                                      */
/* ------------------------------------------------------------------ */

function applyFilters(query: any, filters: BlogFilters) {
  if (filters.category) query = query.eq('category', filters.category)
  if (filters.status) query = query.eq('status', filters.status)
  if (filters.isFeatured !== undefined) query = query.eq('is_featured', filters.isFeatured)
  if (filters.searchQuery) query = query.ilike('title', `%${filters.searchQuery}%`)
  if (filters.tag) query = query.contains('tags', [filters.tag])
  if (filters.clinicId) query = query.eq('clinic_id', filters.clinicId)
  if (filters.clinicIdNotNull) query = query.not('clinic_id', 'is', null)
  if (filters.clinicIdIsNull) query = query.is('clinic_id', null)
  return query
}

/* ------------------------------------------------------------------ */
/*  useBlogPosts                                                       */
/* ------------------------------------------------------------------ */

export function useBlogPosts(filters: BlogFilters = {}) {
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)
  const limit = filters.limit ?? 12
  const offset = filters.offset ?? 0

  const fetch = useCallback(async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query = (supabase as any)
        .from('blog_posts')
        .select('*')
        .order('published_at', { ascending: false, nullsFirst: false })
        .range(offset, offset + limit - 1)
      query = applyFilters(query, filters)
      const { data, error } = await query
      if (error) throw error
      setPosts(data ?? [])
    } catch {
      toast.error('Could not load blog posts')
    } finally {
      setLoading(false)
    }
  }, [filters.category, filters.status, filters.isFeatured, filters.searchQuery, filters.tag, filters.clinicId, filters.clinicIdNotNull, filters.clinicIdIsNull, limit, offset])

  useEffect(() => { fetch() }, [fetch])
  return { posts, loading, refetch: fetch }
}

/* ------------------------------------------------------------------ */
/*  useBlogPostsCount                                                  */
/* ------------------------------------------------------------------ */

export function useBlogPostsCount(filters: BlogFilters = {}) {
  const [count, setCount] = useState(0)

  const fetch = useCallback(async () => {
    try {
      const supabase = createClient()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query = (supabase as any)
        .from('blog_posts')
        .select('*', { count: 'exact', head: true })
      query = applyFilters(query, filters)
      const { count: c, error } = await query
      if (error) throw error
      setCount(c ?? 0)
    } catch {
      /* silent */
    }
  }, [filters.category, filters.status, filters.isFeatured, filters.searchQuery, filters.tag, filters.clinicId, filters.clinicIdNotNull, filters.clinicIdIsNull])

  useEffect(() => { fetch() }, [fetch])
  return { count }
}

/* ------------------------------------------------------------------ */
/*  useFeaturedBlogPosts                                               */
/* ------------------------------------------------------------------ */

export function useFeaturedBlogPosts(limit = 3) {
  return useBlogPosts({ isFeatured: true, status: 'published', limit })
}

/* ------------------------------------------------------------------ */
/*  useBlogPost (single by slug, published only)                       */
/* ------------------------------------------------------------------ */

export function useBlogPost(slug: string | null) {
  const [post, setPost] = useState<BlogPost | null>(null)
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!slug) { setPost(null); setLoading(false); return }
    setLoading(true)
    try {
      const supabase = createClient()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('blog_posts')
        .select('*')
        .eq('slug', slug)
        .eq('status', 'published')
        .single()
      if (error) throw error
      setPost(data)
    } catch {
      setPost(null)
    } finally {
      setLoading(false)
    }
  }, [slug])

  useEffect(() => { fetch() }, [fetch])
  return { post, loading }
}

/* ------------------------------------------------------------------ */
/*  useBlogPostPreview (any status when preview=true)                  */
/* ------------------------------------------------------------------ */

export function useBlogPostPreview(slug: string | null, isPreview: boolean) {
  const [post, setPost] = useState<BlogPost | null>(null)
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!slug) { setPost(null); setLoading(false); return }
    setLoading(true)
    try {
      const supabase = createClient()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query = (supabase as any)
        .from('blog_posts')
        .select('*')
        .eq('slug', slug)
      if (!isPreview) query = query.eq('status', 'published')
      const { data, error } = await query.single()
      if (error) throw error
      setPost(data)
    } catch {
      setPost(null)
    } finally {
      setLoading(false)
    }
  }, [slug, isPreview])

  useEffect(() => { fetch() }, [fetch])
  return { post, loading }
}

/* ------------------------------------------------------------------ */
/*  useBlogPostById (for editing)                                      */
/* ------------------------------------------------------------------ */

export function useBlogPostById(id: string | null) {
  const [post, setPost] = useState<BlogPost | null>(null)
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!id) { setPost(null); setLoading(false); return }
    setLoading(true)
    try {
      const supabase = createClient()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('blog_posts')
        .select('*')
        .eq('id', id)
        .single()
      if (error) throw error
      setPost(data)
    } catch {
      toast.error('Could not load blog post')
      setPost(null)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { fetch() }, [fetch])
  return { post, loading, refetch: fetch }
}

/* ------------------------------------------------------------------ */
/*  useCheckSlugAvailability (debounced 400ms)                         */
/* ------------------------------------------------------------------ */

export function useCheckSlugAvailability(slug: string, excludeId?: string) {
  const [available, setAvailable] = useState<boolean | null>(null)
  const [checking, setChecking] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => {
    if (!slug || slug.length < 2) { setAvailable(null); return }
    setChecking(true)
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(async () => {
      try {
        const supabase = createClient()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let query = (supabase as any)
          .from('blog_posts')
          .select('id', { count: 'exact', head: true })
          .eq('slug', slug)
        if (excludeId) query = query.neq('id', excludeId)
        const { count, error } = await query
        if (error) throw error
        setAvailable((count ?? 0) === 0)
      } catch {
        setAvailable(null)
      } finally {
        setChecking(false)
      }
    }, 400)
    return () => clearTimeout(timerRef.current)
  }, [slug, excludeId])

  return { available, checking }
}

/* ------------------------------------------------------------------ */
/*  useRelatedPosts                                                    */
/* ------------------------------------------------------------------ */

export function useRelatedPosts(postId: string | null, category: string | null, limit = 3) {
  const [posts, setPosts] = useState<BlogPost[]>([])

  const fetch = useCallback(async () => {
    if (!postId || !category) { setPosts([]); return }
    try {
      const supabase = createClient()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('blog_posts')
        .select('*')
        .eq('category', category)
        .eq('status', 'published')
        .neq('id', postId)
        .order('published_at', { ascending: false })
        .limit(limit)
      if (error) throw error
      setPosts(data ?? [])
    } catch {
      /* silent */
    }
  }, [postId, category, limit])

  useEffect(() => { fetch() }, [fetch])
  return { posts }
}

/* ------------------------------------------------------------------ */
/*  useBlogCategories                                                  */
/* ------------------------------------------------------------------ */

export function useBlogCategories() {
  const [categories, setCategories] = useState<BlogCategory[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    try {
      const supabase = createClient()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('blog_categories')
        .select('*')
        .order('sort_order', { ascending: true })
      if (error) throw error
      setCategories(data ?? [])
    } catch {
      toast.error('Could not load categories')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetch() }, [fetch])
  return { categories, loading }
}

/* ------------------------------------------------------------------ */
/*  useBlogCategory (single)                                           */
/* ------------------------------------------------------------------ */

export function useBlogCategory(id: string | null) {
  const [category, setCategory] = useState<BlogCategory | null>(null)
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!id) { setCategory(null); setLoading(false); return }
    try {
      const supabase = createClient()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('blog_categories')
        .select('*')
        .eq('id', id)
        .single()
      if (error) throw error
      setCategory(data)
    } catch {
      setCategory(null)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { fetch() }, [fetch])
  return { category, loading }
}

/* ------------------------------------------------------------------ */
/*  usePendingClinicPostsCount                                         */
/* ------------------------------------------------------------------ */

export function usePendingClinicPostsCount() {
  const [count, setCount] = useState(0)

  const fetch = useCallback(async () => {
    try {
      const supabase = createClient()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { count: c, error } = await (supabase as any)
        .from('blog_posts')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'draft')
        .not('clinic_id', 'is', null)
      if (error) throw error
      setCount(c ?? 0)
    } catch {
      /* silent */
    }
  }, [])

  useEffect(() => { fetch() }, [fetch])
  return { count }
}

/* ------------------------------------------------------------------ */
/*  Mutation: useCreateBlogPost                                        */
/* ------------------------------------------------------------------ */

export function useCreateBlogPost() {
  const [loading, setLoading] = useState(false)

  const create = useCallback(async (post: Record<string, unknown>): Promise<BlogPost | null> => {
    setLoading(true)
    try {
      const supabase = createClient()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('blog_posts')
        .insert(post)
        .select()
        .single()
      if (error) throw error
      toast.success('Blog post created')
      return data
    } catch (err: any) {
      toast.error(err?.message || 'Could not create blog post')
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  return { create, loading }
}

/* ------------------------------------------------------------------ */
/*  Mutation: useUpdateBlogPost                                        */
/* ------------------------------------------------------------------ */

export function useUpdateBlogPost() {
  const [loading, setLoading] = useState(false)

  const update = useCallback(async (id: string, updates: Record<string, unknown>): Promise<BlogPost | null> => {
    setLoading(true)
    try {
      const supabase = createClient()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('blog_posts')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      toast.success('Blog post updated')
      return data
    } catch (err: any) {
      toast.error(err?.message || 'Could not update blog post')
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  return { update, loading }
}

/* ------------------------------------------------------------------ */
/*  Mutation: useDeleteBlogPost                                        */
/* ------------------------------------------------------------------ */

export function useDeleteBlogPost() {
  const [loading, setLoading] = useState(false)

  const remove = useCallback(async (id: string): Promise<boolean> => {
    setLoading(true)
    try {
      const supabase = createClient()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from('blog_posts')
        .delete()
        .eq('id', id)
      if (error) throw error
      toast.success('Blog post deleted')
      return true
    } catch {
      toast.error('Could not delete blog post')
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  return { remove, loading }
}

/* ------------------------------------------------------------------ */
/*  Mutation: useIncrementViewCount                                    */
/* ------------------------------------------------------------------ */

export function useIncrementViewCount() {
  const increment = useCallback(async (slug: string) => {
    const key = `blog_viewed_${slug}`
    if (typeof window !== 'undefined' && sessionStorage.getItem(key)) return
    try {
      const supabase = createClient()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).rpc('increment_blog_view_count', { p_slug: slug })
      if (typeof window !== 'undefined') sessionStorage.setItem(key, '1')
    } catch {
      /* silent */
    }
  }, [])

  return { increment }
}
