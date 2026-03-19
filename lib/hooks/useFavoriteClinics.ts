'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from '@/lib/toast'

interface ClinicInfo {
  id: string
  name: string
  logo_url?: string | null
  city?: string | null
  state?: string | null
  phone?: string | null
}

export interface ClinicFavorite {
  id: string
  patient_id: string
  clinic_id: string
  custom_name?: string | null
  notes?: string | null
  created_at?: string | null
  updated_at?: string | null
  clinic: ClinicInfo
}

export function useFavoriteClinics(userId: string | null) {
  const [favorites, setFavorites] = useState<ClinicFavorite[]>([])
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)

  const fetchFavorites = useCallback(async () => {
    if (!userId) { setFavorites([]); setFavoriteIds(new Set()); return }
    setLoading(true)
    try {
      const supabase = createClient()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('patient_clinic_favorites')
        .select('*, clinic:clinic_id(id, name, logo_url, city, state, phone)')
        .eq('patient_id', userId)
        .order('created_at', { ascending: false })
      if (error) throw error
      const rows: ClinicFavorite[] = data ?? []
      setFavorites(rows)
      setFavoriteIds(new Set(rows.map((r) => r.clinic_id)))
    } catch {
      toast({ title: 'Error', description: 'Could not load favorite clinics.', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => { fetchFavorites() }, [fetchFavorites])

  function isFavorite(clinicId: string) {
    return favoriteIds.has(clinicId)
  }

  function getFavorite(clinicId: string) {
    return favorites.find((f) => f.clinic_id === clinicId) ?? null
  }

  async function addFavorite(clinicId: string, customName?: string, notes?: string): Promise<boolean> {
    if (!userId) return false
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from('patient_clinic_favorites').insert({
      patient_id: userId,
      clinic_id: clinicId,
      ...(customName ? { custom_name: customName } : {}),
      ...(notes ? { notes } : {}),
    })
    if (error) {
      if (error.code === '23505') {
        toast({ title: 'Already in favorites', description: 'This clinic is already in your favorites.', variant: 'destructive' })
        await fetchFavorites() // sync stale local state so heart reflects server reality
      } else {
        toast({ title: 'Error', description: 'Could not add to favorites.', variant: 'destructive' })
      }
      return false
    }
    toast({ title: 'Added to favorites', description: customName ? `Saved as "${customName}"` : 'Clinic added to your favorites.' })
    await fetchFavorites()
    return true
  }

  async function updateFavorite(favoriteId: string, customName?: string, notes?: string): Promise<boolean> {
    if (!userId) return false
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from('patient_clinic_favorites').update({
      custom_name: customName ?? null,
      notes: notes ?? null,
      updated_at: new Date().toISOString(),
    }).eq('id', favoriteId)
    if (error) {
      toast({ title: 'Error', description: 'Could not update favorite.', variant: 'destructive' })
      return false
    }
    toast({ title: 'Favorite updated' })
    await fetchFavorites()
    return true
  }

  async function removeFavorite(clinicId: string) {
    if (!userId) return
    // Optimistic update
    setFavoriteIds((prev) => { const s = new Set(prev); s.delete(clinicId); return s })
    setFavorites((prev) => prev.filter((f) => f.clinic_id !== clinicId))
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from('patient_clinic_favorites')
      .delete().eq('patient_id', userId).eq('clinic_id', clinicId)
    if (error) {
      toast({ title: 'Error', description: 'Could not remove favorite.', variant: 'destructive' })
      await fetchFavorites() // rollback via refetch
    }
  }

  async function toggleFavorite(clinicId: string) {
    if (isFavorite(clinicId)) {
      await removeFavorite(clinicId)
    } else {
      await addFavorite(clinicId)
    }
  }

  return { favorites, loading, isFavorite, getFavorite, addFavorite, updateFavorite, removeFavorite, toggleFavorite, refetch: fetchFavorites }
}
