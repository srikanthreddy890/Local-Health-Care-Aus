'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from '@/lib/toast'

export interface AppointmentPreference {
  id: string
  patient_id: string
  clinic_id: string
  doctor_id: string | null
  service_id: string | null
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
  service?: { id: string; name: string } | null
}

export interface CreatePreferenceInput {
  clinic_id: string
  doctor_id?: string | null
  service_id?: string | null
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
        .select('*')
        .eq('patient_id', userId)
        .eq('is_active', true)
        .gte('preferred_date', today)
        .order('preferred_date', { ascending: true })
      if (error) throw error

      // Fetch clinic names from clinics_public (accessible to patients)
      const clinicIds = [...new Set((data ?? []).map((p: AppointmentPreference) => p.clinic_id).filter(Boolean))]
      let clinicMap: Record<string, string> = {}
      if (clinicIds.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: clinics } = await (supabase as any)
          .from('clinics_public')
          .select('id, name')
          .in('id', clinicIds)
        if (clinics) {
          clinicMap = Object.fromEntries(clinics.map((c: { id: string; name: string }) => [c.id, c.name]))
        }
      }

      // Fetch service names
      const serviceIds = [...new Set((data ?? []).map((p: AppointmentPreference) => p.service_id).filter(Boolean))]
      let serviceMap: Record<string, string> = {}
      if (serviceIds.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: services } = await (supabase as any)
          .from('services_public')
          .select('id, name')
          .in('id', serviceIds)
        if (services) {
          serviceMap = Object.fromEntries(services.map((s: { id: string; name: string }) => [s.id, s.name]))
        }
      }

      // Attach clinic + service info
      const enriched = (data ?? []).map((p: AppointmentPreference) => ({
        ...p,
        clinic: p.clinic_id ? { id: p.clinic_id, name: clinicMap[p.clinic_id] ?? 'Unknown Clinic' } : null,
        service: p.service_id ? { id: p.service_id, name: serviceMap[p.service_id] ?? 'Unknown Service' } : null,
      }))

      setPreferences(enriched)
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

    // ── Client-side availability pre-check ──────────────────────────────────
    // Before creating the reminder, check if a matching slot already exists
    let foundSlotLocally = false
    if (input.check_database_appointments && input.doctor_id && input.service_id) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: matchingSlots } = await (supabase as any)
          .from('appointments_public')
          .select('id, appointment_date, start_time, end_time, max_bookings, current_bookings')
          .eq('clinic_id', input.clinic_id)
          .eq('doctor_id', input.doctor_id)
          .eq('service_id', input.service_id)
          .eq('status', 'available')
          .eq('appointment_date', input.preferred_date)
          .limit(5)

        const available = (matchingSlots ?? []).filter(
          (s: { current_bookings: number; max_bookings: number }) => s.current_bookings < s.max_bookings
        )
        if (available.length > 0) foundSlotLocally = true
      } catch {
        // silently continue — the edge function will also check
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('appointment_preferences')
      .insert({ patient_id: userId, ...input, status: foundSlotLocally ? 'notified' : 'active' })
      .select()
      .single()

    if (error) {
      toast({ title: 'Error', description: 'Could not create reminder.', variant: 'destructive' })
      return false
    }

    if (foundSlotLocally) {
      // We already know slots exist — notify immediately
      toast.success('Great News! We found an available appointment slot for your selection. Head to Book Appointment to reserve it!')
      // Still trigger the edge function to send email/SMS notifications
      try {
        await supabase.functions.invoke('check-appointment-availability', {
          body: { preferenceId: data.id, immediateCheck: true },
        })
      } catch {
        // notifications will be sent by cron if edge function fails
      }
    } else {
      // No slot found locally — trigger edge function for broader check (centaur, custom API, etc.)
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
