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

      // 1. Patient postcode
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: profile } = await (supabase as any)
        .from('profiles')
        .select('postcode')
        .eq('id', userId)
        .single()
      const postcode: string | null = profile?.postcode ?? null
      setUserPostcode(postcode)

      // 2. Favorite clinic IDs
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: favRows } = await (supabase as any)
        .from('patient_clinic_favorites')
        .select('clinic_id')
        .eq('patient_id', userId)
      const favoriteIds = new Set<string>((favRows ?? []).map((r: { clinic_id: string }) => r.clinic_id))

      // 3. All active quotes-enabled clinics
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: clinicRows, error } = await (supabase as any)
        .from('clinics')
        .select('id, name, zip_code, city, logo_url, phone, quotes_enabled, chat_enabled')
        .eq('is_active', true)
        .eq('quotes_enabled', true)
        .order('name')
      if (error) throw error

      const clinicIds: string[] = (clinicRows ?? []).map((c: { id: string }) => c.id)

      // 4. Service counts
      let serviceCountMap: Record<string, number> = {}
      if (clinicIds.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: serviceRows } = await (supabase as any)
          .from('services')
          .select('clinic_id')
          .in('clinic_id', clinicIds)
          .eq('is_active', true)
        serviceCountMap = ((serviceRows ?? []) as { clinic_id: string }[]).reduce<Record<string, number>>((acc, r) => {
          acc[r.clinic_id] = (acc[r.clinic_id] ?? 0) + 1
          return acc
        }, {})
      }

      // 5. Merge + sort: favorites first → postcode match → alphabetical
      const merged: ClinicWithMeta[] = (clinicRows ?? []).map((c: {
        id: string; name: string; zip_code?: string | null; city?: string | null;
        logo_url?: string | null; phone?: string | null; quotes_enabled: boolean; chat_enabled?: boolean
      }) => ({
        ...c,
        serviceCount: serviceCountMap[c.id] ?? 0,
        isFavorite: favoriteIds.has(c.id),
      }))

      merged.sort((a, b) => {
        if (a.isFavorite !== b.isFavorite) return a.isFavorite ? -1 : 1
        const aMatch = postcode && a.zip_code === postcode ? 1 : 0
        const bMatch = postcode && b.zip_code === postcode ? 1 : 0
        if (aMatch !== bMatch) return bMatch - aMatch
        return a.name.localeCompare(b.name)
      })

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
