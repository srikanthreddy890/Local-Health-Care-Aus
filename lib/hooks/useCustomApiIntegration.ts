'use client'

import { useCallback, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

// ── Types ───────────────────────────────────────────────────────────────────

export interface CustomApiDoctor {
  id: string
  name: string
  specialization?: string
  duration?: number
  email?: string
  phone?: string
}

export interface CustomApiSlot {
  appointment_id?: string
  slot_id?: string
  start_time: string
  end_time?: string
  doctor_name?: string
  doctor_id?: string
  available?: boolean
  duration?: number
  /** Full raw slot object from the API (for extracting external IDs) */
  _raw?: Record<string, unknown>
}

export interface CustomApiBookingResult {
  success: boolean
  bookingId?: string
  status?: string
  error?: string
  data?: Record<string, unknown>
}

interface IntegrationStatus {
  enabled: boolean
  configName?: string
}

interface UseCustomApiIntegrationReturn {
  isLoading: boolean
  lastSync: Date | null
  getDoctors: () => Promise<CustomApiDoctor[]>
  getDoctorSlots: (doctorId: string, date: string) => Promise<CustomApiSlot[]>
  bookAppointment: (bookingData: Record<string, unknown>) => Promise<CustomApiBookingResult>
  cancelAppointment: (bookingId: string, reason?: string) => Promise<{ success: boolean; error?: string }>
  checkIntegrationStatus: () => Promise<IntegrationStatus>
}

// ── Hook ────────────────────────────────────────────────────────────────────

export function useCustomApiIntegration({
  clinicId,
  configId,
}: {
  clinicId: string
  configId: string
}): UseCustomApiIntegrationReturn {
  const [isLoading, setIsLoading] = useState(false)
  const [lastSync, setLastSync] = useState<Date | null>(null)

  const isValidConfig = !!(configId && configId.length > 10 && clinicId)

  // Core caller — all methods route through here
  const callCustomApi = useCallback(
    async (action: string, params: Record<string, unknown> = {}): Promise<Record<string, unknown>> => {
      if (!isValidConfig) {
        console.warn(`[useCustomApiIntegration] Invalid configId "${configId}", skipping ${action}`)
        return {}
      }

      setIsLoading(true)
      try {
        const supabase = createClient()
        const { data, error } = await supabase.functions.invoke('custom-api-integration', {
          body: { action, configId, clinicId, ...params },
        })

        if (error) throw new Error(error.message ?? 'Edge function error')
        return (data as Record<string, unknown>) ?? {}
      } finally {
        setIsLoading(false)
      }
    },
    [clinicId, configId, isValidConfig],
  )

  // ── getDoctors ──────────────────────────────────────────────────────────

  const getDoctors = useCallback(async (): Promise<CustomApiDoctor[]> => {
    if (!isValidConfig) return []
    try {
      const result = await callCustomApi('get_doctors')
      const raw = normalizeArray(result, ['doctors', 'data'])
      setLastSync(new Date())
      return raw.map((d) => ({
        id: String(d.id ?? d.doctor_id ?? ''),
        name: String(d.name ?? d.doctor_name ?? d.fullName ?? ''),
        specialization: d.specialization as string | undefined,
        duration: d.duration as number | undefined,
        email: d.email as string | undefined,
        phone: d.phone as string | undefined,
      }))
    } catch (err) {
      console.error('[useCustomApiIntegration] getDoctors failed:', err)
      return []
    }
  }, [callCustomApi, isValidConfig])

  // ── getDoctorSlots ──────────────────────────────────────────────────────

  const getDoctorSlots = useCallback(
    async (doctorId: string, date: string): Promise<CustomApiSlot[]> => {
      if (!isValidConfig) return []
      try {
        const result = await callCustomApi('get_appointments', { doctorId, date })
        const raw = normalizeArray(result, ['slots', 'appointments', 'data'])
        setLastSync(new Date())
        return raw.map((s) => ({
          appointment_id: String(s.appointment_id ?? s.id ?? s.slotId ?? ''),
          slot_id: String(s.slot_id ?? s.slotId ?? s.id ?? ''),
          start_time: String(s.start_time ?? s.startTime ?? ''),
          end_time: (s.end_time ?? s.endTime) as string | undefined,
          doctor_name: (s.doctor_name ?? s.doctorName) as string | undefined,
          doctor_id: (s.doctor_id ?? s.doctorId) as string | undefined,
          available: s.available !== false,
          duration: s.duration as number | undefined,
          _raw: s,
        }))
      } catch (err) {
        console.error('[useCustomApiIntegration] getDoctorSlots failed:', err)
        return []
      }
    },
    [callCustomApi, isValidConfig],
  )

  // ── bookAppointment ─────────────────────────────────────────────────────

  const bookAppointment = useCallback(
    async (bookingData: Record<string, unknown>): Promise<CustomApiBookingResult> => {
      if (!isValidConfig) return { success: false, error: 'Invalid configuration' }
      try {
        const result = await callCustomApi('book_appointment', bookingData)
        return {
          success: true,
          bookingId: String(result.booking_id ?? result.bookingId ?? result.id ?? ''),
          status: String(result.status ?? result.bookingStatus ?? 'confirmed'),
          data: result,
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Booking failed'
        console.error('[useCustomApiIntegration] bookAppointment failed:', err)
        return { success: false, error: msg }
      }
    },
    [callCustomApi, isValidConfig],
  )

  // ── cancelAppointment ───────────────────────────────────────────────────

  const cancelAppointment = useCallback(
    async (bookingId: string, reason?: string): Promise<{ success: boolean; error?: string }> => {
      if (!isValidConfig) return { success: false, error: 'Invalid configuration' }
      try {
        await callCustomApi('cancel_appointment', { bookingId, reason })
        return { success: true }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Cancellation failed'
        return { success: false, error: msg }
      }
    },
    [callCustomApi, isValidConfig],
  )

  // ── checkIntegrationStatus ──────────────────────────────────────────────

  const checkIntegrationStatus = useCallback(async (): Promise<IntegrationStatus> => {
    if (!isValidConfig) return { enabled: false }
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabase = createClient() as any
      const { data } = await supabase
        .from('api_configurations_safe')
        .select('config_name, is_active')
        .eq('id', configId)
        .single()

      return {
        enabled: !!data?.is_active,
        configName: data?.config_name ?? undefined,
      }
    } catch {
      return { enabled: false }
    }
  }, [configId, isValidConfig])

  return {
    isLoading,
    lastSync,
    getDoctors,
    getDoctorSlots,
    bookAppointment,
    cancelAppointment,
    checkIntegrationStatus,
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Normalize API response into an array. Handles both direct arrays and wrapped
 * objects like { doctors: [...] } or { data: { slots: [...] } }.
 */
function normalizeArray(
  result: Record<string, unknown>,
  possibleKeys: string[],
): Record<string, unknown>[] {
  // Direct array
  if (Array.isArray(result)) return result

  // Check nested keys: result.data.X or result.X
  for (const key of possibleKeys) {
    const val = result[key]
    if (Array.isArray(val)) return val

    // One level deeper (result.data.key)
    if (typeof result.data === 'object' && result.data !== null) {
      const nested = (result.data as Record<string, unknown>)[key]
      if (Array.isArray(nested)) return nested
    }
  }

  // If result.data is itself an array
  if (Array.isArray(result.data)) return result.data

  return []
}
