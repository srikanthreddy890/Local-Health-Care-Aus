'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from '@/lib/toast'

export interface AppointmentPreference {
  id: string
  patient_id: string
  clinic_id: string
  doctor_id: string | null
  centaur_doctor_id: number | null
  custom_api_config_id: string | null
  custom_api_doctor_id: string | null
  preferred_date: string
  preferred_time: string
  notification_email: boolean
  notification_sms: boolean
  notification_push: boolean
  notes: string | null
  is_active: boolean
  status: string
  check_database_appointments: boolean
  check_centaur_appointments: boolean
  check_custom_api_appointments: boolean
  last_checked_at: string | null
  last_check_error: string | null
  consecutive_errors: number
  created_at: string
  updated_at: string
  // joined
  clinic?: { id: string; name: string } | null
  doctor?: { id: string; full_name: string } | null
}

export interface CreatePreferenceInput {
  clinic_id: string
  doctor_id?: string | null
  centaur_doctor_id?: number | null
  custom_api_config_id?: string | null
  custom_api_doctor_id?: string | null
  preferred_date: string
  preferred_time: string
  notification_email: boolean
  notification_sms: boolean
  notification_push: boolean
  notes?: string | null
  check_database_appointments: boolean
  check_centaur_appointments: boolean
  check_custom_api_appointments: boolean
}

export function useAppointmentPreferences(userId: string | null) {
  const [preferences, setPreferences] = useState<AppointmentPreference[]>([])
  const [loading, setLoading] = useState(false)

  const fetchPreferences = useCallback(async () => {
    if (!userId) { setPreferences([]); return }
    setLoading(true)
    try {
      const supabase = createClient()
      const today = new Date().toISOString().split('T')[0]
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('appointment_preferences')
        .select('*, clinic:clinic_id(id, name), doctor:doctor_id(id, full_name)')
        .eq('patient_id', userId)
        .eq('is_active', true)
        .gte('preferred_date', today)
        .order('preferred_date', { ascending: true })
      if (error) throw error
      setPreferences(data ?? [])
    } catch {
      toast({ title: 'Error', description: 'Could not load appointment reminders.', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => { fetchPreferences() }, [fetchPreferences])

  async function createPreference(input: CreatePreferenceInput): Promise<boolean> {
    if (!userId) return false
    const supabase = createClient()

    // Duplicate check
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existing } = await (supabase as any)
      .from('appointment_preferences')
      .select('id')
      .eq('patient_id', userId)
      .eq('clinic_id', input.clinic_id)
      .eq('preferred_date', input.preferred_date)
      .eq('preferred_time', input.preferred_time)
      .eq('is_active', true)
      .maybeSingle()

    if (existing) {
      toast({ title: 'Duplicate Reminder', description: 'A reminder for this clinic, date and time already exists.', variant: 'destructive' })
      return false
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('appointment_preferences')
      .insert({ patient_id: userId, ...input })
      .select()
      .single()

    if (error) {
      toast({ title: 'Error', description: 'Could not create reminder.', variant: 'destructive' })
      return false
    }

    // Trigger immediate availability check
    try {
      const { data: checkData } = await supabase.functions.invoke('check-appointment-availability', {
        body: { preferenceId: data.id, immediateCheck: true },
      })
      if (checkData?.foundAvailability === true) {
        toast.success('Great News! We found an available appointment and sent you the details!')
      } else {
        toast.success("Reminder Set Successfully! We'll notify you as soon as a slot becomes available.")
      }
    } catch {
      toast.success("Reminder Set Successfully! We'll notify you as soon as a slot becomes available.")
    }

    await fetchPreferences()
    return true
  }

  async function deletePreference(id: string): Promise<void> {
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('appointment_preferences')
      .delete()
      .eq('id', id)
    if (error) {
      toast({ title: 'Error', description: 'Could not delete reminder.', variant: 'destructive' })
      return
    }
    setPreferences((prev) => prev.filter((p) => p.id !== id))
  }

  async function updatePreference(id: string, updates: Partial<CreatePreferenceInput>): Promise<void> {
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('appointment_preferences')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) {
      toast({ title: 'Error', description: 'Could not update reminder.', variant: 'destructive' })
      return
    }
    await fetchPreferences()
  }

  return { preferences, loading, createPreference, deletePreference, updatePreference, refetch: fetchPreferences }
}
