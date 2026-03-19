'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from '@/lib/toast'

interface DoctorInfo {
  id: string
  first_name: string
  last_name: string
  specialty?: string | null
  avatar_url?: string | null
  clinic_id?: string | null
}

interface ClinicInfo {
  id: string
  name: string
}

export interface DoctorFavorite {
  id: string
  patient_id: string
  doctor_id: string
  clinic_id?: string | null
  custom_name?: string | null
  notes?: string | null
  created_at?: string | null
  updated_at?: string | null
  doctor: DoctorInfo
  clinic?: ClinicInfo | null
}

export function useFavoriteDoctors(userId: string | null) {
  const [favorites, setFavorites] = useState<DoctorFavorite[]>([])
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)

  const fetchFavorites = useCallback(async () => {
    if (!userId) { setFavorites([]); setFavoriteIds(new Set()); return }
    setLoading(true)
    try {
      const supabase = createClient()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('patient_doctor_favorites')
        .select('*, doctor:doctor_id(id, first_name, last_name, specialty, avatar_url, clinic_id), clinic:clinic_id(id, name)')
        .eq('patient_id', userId)
        .order('created_at', { ascending: false })
      if (error) throw error
      const rows: DoctorFavorite[] = data ?? []
      setFavorites(rows)
      setFavoriteIds(new Set(rows.map((r) => r.doctor_id)))
    } catch {
      toast({ title: 'Error', description: 'Could not load favorite doctors.', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => { fetchFavorites() }, [fetchFavorites])

  function isFavorite(doctorId: string) {
    return favoriteIds.has(doctorId)
  }

  function getFavorite(doctorId: string) {
    return favorites.find((f) => f.doctor_id === doctorId) ?? null
  }

  async function addFavorite(doctorId: string, clinicId?: string) {
    if (!userId) return
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from('patient_doctor_favorites').insert({
      patient_id: userId,
      doctor_id: doctorId,
      ...(clinicId ? { clinic_id: clinicId } : {}),
    })
    if (error) {
      if (error.code === '23505') {
        toast({ title: 'Already in favorites', description: 'This doctor is already in your favorites.', variant: 'destructive' })
      } else {
        toast({ title: 'Error', description: 'Could not add doctor to favorites.', variant: 'destructive' })
      }
      return
    }
    toast({ title: 'Doctor added to favorites' })
    await fetchFavorites()
  }

  async function updateFavorite(favoriteId: string, customName?: string, notes?: string): Promise<boolean> {
    if (!userId) return false
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from('patient_doctor_favorites').update({
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

  async function removeFavorite(doctorId: string) {
    if (!userId) return
    // Optimistic update
    setFavoriteIds((prev) => { const s = new Set(prev); s.delete(doctorId); return s })
    setFavorites((prev) => prev.filter((f) => f.doctor_id !== doctorId))
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from('patient_doctor_favorites')
      .delete().eq('patient_id', userId).eq('doctor_id', doctorId)
    if (error) {
      toast({ title: 'Error', description: 'Could not remove favorite.', variant: 'destructive' })
      await fetchFavorites() // rollback via refetch
    }
  }

  async function toggleFavorite(doctorId: string, clinicId?: string) {
    if (isFavorite(doctorId)) {
      await removeFavorite(doctorId)
    } else {
      await addFavorite(doctorId, clinicId)
    }
  }

  return { favorites, loading, isFavorite, getFavorite, addFavorite, updateFavorite, removeFavorite, toggleFavorite, refetch: fetchFavorites }
}
