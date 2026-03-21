'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface ClinicWithMeta {
  id: string
  name: string
  zip_code?: string | null
  city?: string | null
  logo_url?: string | null
  phone?: string | null
  quotes_enabled: boolean
  chat_enabled?: boolean
  serviceCount: number
  isFavorite: boolean
}

interface Result {
  clinics: ClinicWithMeta[]
  loading: boolean
  userPostcode: string | null
  hasPostcode: boolean
  refetch: () => Promise<void>
}

export function useClinicsByPostcode(userId: string): Result {
  const [clinics, setClinics] = useState<ClinicWithMeta[]>([])
  const [loading, setLoading] = useState(false)
  const [userPostcode, setUserPostcode] = useState<string | null>(null)

  const fetchClinics = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    try {
      const supabase = createClient()

      // Single RPC call replaces 4 sequential queries
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: rows, error } = await (supabase as any)
        .rpc('get_clinics_for_quotes', { p_user_id: userId })
      if (error) throw error

      const postcode: string | null = rows?.[0]?.user_postcode ?? null
      setUserPostcode(postcode)

      const merged: ClinicWithMeta[] = (rows ?? []).map((r: {
        id: string; name: string; zip_code?: string | null; city?: string | null;
        logo_url?: string | null; phone?: string | null; quotes_enabled: boolean;
        chat_enabled?: boolean; service_count: number; is_favorite: boolean
      }) => ({
        id: r.id,
        name: r.name,
        zip_code: r.zip_code,
        city: r.city,
        logo_url: r.logo_url,
        phone: r.phone,
        quotes_enabled: r.quotes_enabled,
        chat_enabled: r.chat_enabled,
        serviceCount: Number(r.service_count),
        isFavorite: r.is_favorite,
      }))

      setClinics(merged)
    } catch {
      // silently fail — form still renders with empty list
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => { fetchClinics() }, [fetchClinics])

  return {
    clinics,
    loading,
    userPostcode,
    hasPostcode: !!userPostcode,
    refetch: fetchClinics,
  }
}
