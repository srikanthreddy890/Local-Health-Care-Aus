'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from '@/lib/toast'

export interface FamilyMember {
  id: string
  user_id: string
  relationship: string
  first_name: string
  last_name: string
  date_of_birth: string | null
  gender: string | null
  email: string | null
  mobile: string | null
  address_line1: string | null
  address_line2: string | null
  city: string | null
  state: string | null
  postcode: string | null
  country: string | null
  notes: string | null
  is_active: boolean | null
  created_at: string | null
  updated_at: string | null
}

export interface FamilyMemberFormData {
  relationship: string
  first_name: string
  last_name: string
  date_of_birth: string
  gender: string
  email: string
  mobile: string
  address_line1: string
  address_line2: string
  city: string
  state: string
  postcode: string
  country: string
  notes: string
}

export const DEFAULT_FORM_DATA: FamilyMemberFormData = {
  relationship: '',
  first_name: '',
  last_name: '',
  date_of_birth: '',
  gender: '',
  email: '',
  mobile: '',
  address_line1: '',
  address_line2: '',
  city: '',
  state: '',
  postcode: '',
  country: 'Australia',
  notes: '',
}

export function useFamilyMembers() {
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const fetchFamilyMembers = useCallback(async () => {
    setIsLoading(true)
    try {
      const supabase = createClient()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('family_members')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
      if (error) throw error
      setFamilyMembers(data ?? [])
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not load family members.'
      toast.error(msg)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { fetchFamilyMembers() }, [fetchFamilyMembers])

  async function addFamilyMember(data: FamilyMemberFormData) {
    setIsLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).from('family_members').insert({
        ...data,
        user_id: user.id,
        date_of_birth: data.date_of_birth || null,
        gender: data.gender || null,
        email: data.email || null,
        mobile: data.mobile || null,
        address_line1: data.address_line1 || null,
        address_line2: data.address_line2 || null,
        city: data.city || null,
        state: data.state || null,
        postcode: data.postcode || null,
        notes: data.notes || null,
        is_active: true,
      })
      if (error) throw error
      toast({ title: 'Family member added' })
      await fetchFamilyMembers()
      return true
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not add family member.'
      toast.error(msg)
      return false
    } finally {
      setIsLoading(false)
    }
  }

  async function updateFamilyMember(id: string, data: Partial<FamilyMemberFormData>) {
    setIsLoading(true)
    try {
      const supabase = createClient()
      const updatePayload: Record<string, unknown> = { updated_at: new Date().toISOString() }
      for (const [key, value] of Object.entries(data)) {
        updatePayload[key] = value === '' ? null : value
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from('family_members')
        .update(updatePayload)
        .eq('id', id)
      if (error) throw error
      toast({ title: 'Family member updated' })
      await fetchFamilyMembers()
      return true
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not update family member.'
      toast.error(msg)
      return false
    } finally {
      setIsLoading(false)
    }
  }

  async function deleteFamilyMember(id: string) {
    setIsLoading(true)
    try {
      const supabase = createClient()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from('family_members')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
      toast({ title: 'Family member removed' })
      await fetchFamilyMembers()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not remove family member.'
      toast.error(msg)
    } finally {
      setIsLoading(false)
    }
  }

  return { familyMembers, isLoading, fetchFamilyMembers, addFamilyMember, updateFamilyMember, deleteFamilyMember }
}
