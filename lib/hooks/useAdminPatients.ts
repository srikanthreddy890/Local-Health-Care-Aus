'use client'

import { useState, useCallback, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from '@/lib/toast'

const PAGE_SIZE = 15

export interface AdminPatient {
  id: string
  first_name: string | null
  last_name: string | null
  phone: string | null
  city: string | null
  postcode: string | null
  date_of_birth: string | null
  avatar_url: string | null
  created_at: string | null
}

export function useAdminPatients(userId: string) {
  const [patients, setPatients] = useState<AdminPatient[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(0)
  const [totalCount, setTotalCount] = useState(0)

  // Debounce search input (300ms)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(timer)
  }, [search])

  const fetchPatients = useCallback(async () => {
    try {
      setLoading(true)
      const supabase = createClient()

      // Defense-in-depth admin check
      const { data: isAdmin } = await supabase.rpc('has_role', { _user_id: userId, _role: 'admin' })
      if (!isAdmin) throw new Error('Unauthorized: Admin access required')

      let query = supabase
        .from('profiles')
        .select('id, first_name, last_name, phone, city, postcode, date_of_birth, avatar_url, created_at', {
          count: 'exact',
        })
        .eq('user_type', 'patient')
        .order('created_at', { ascending: false })

      if (debouncedSearch.trim()) {
        const s = `%${debouncedSearch.trim()}%`
        query = query.or(
          `first_name.ilike.${s},last_name.ilike.${s},phone.ilike.${s},city.ilike.${s},postcode.ilike.${s}`,
        )
      }

      const from = page * PAGE_SIZE
      const to = from + PAGE_SIZE - 1
      const { data, count, error } = await query.range(from, to)

      if (error) throw error
      setPatients(data ?? [])
      setTotalCount(count ?? 0)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load patients')
    } finally {
      setLoading(false)
    }
  }, [userId, debouncedSearch, page])

  useEffect(() => {
    if (userId) fetchPatients()
  }, [fetchPatients, userId])

  // Reset page when search changes
  useEffect(() => {
    setPage(0)
  }, [debouncedSearch])

  return {
    patients,
    loading,
    search,
    setSearch,
    page,
    setPage,
    totalCount,
    totalPages: Math.ceil(totalCount / PAGE_SIZE),
    refetch: fetchPatients,
  }
}
