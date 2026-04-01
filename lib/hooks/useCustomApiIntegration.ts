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

export interface DoctorSlotEntry {
  doctorId: string
  doctorName: string
  specialty?: string | null
  slotId: string
  avatarUrl?: string | null
}

export interface MergedSlotResult {
  /** Unique times sorted chronologically */
  times: string[]
  /** Map from time string to available doctors at that time */
  doctorsByTime: Record<string, DoctorSlotEntry[]>
  /** Total slots across all doctors before dedup */
  totalSlots: number
}

interface UseCustomApiIntegrationReturn {
  isLoading: boolean
  lastSync: Date | null
  getDoctors: () => Promise<CustomApiDoctor[]>
  getDoctorSlots: (doctorId: string, date: string) => Promise<CustomApiSlot[]>
  getAllDoctorSlots: (
    doctors: { id: string; name: string; specialty?: string | null; avatarUrl?: string | null }[],
    date: string,
    onProgress?: (completed: number, total: number) => void,
  ) => Promise<MergedSlotResult>
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

  // Core caller — all methods route through the Next.js API proxy
  // skipLoadingState: when true, caller manages its own loading indicator (e.g. batch fetches)
  const callCustomApi = useCallback(
    async (action: string, params: Record<string, unknown> = {}, skipLoadingState = false): Promise<Record<string, unknown>> => {
      if (!isValidConfig) {
        console.warn(`[useCustomApiIntegration] Invalid configId "${configId}", skipping ${action}`)
        return {}
      }

      if (!skipLoadingState) setIsLoading(true)
      try {
        const res = await fetch('/api/custom-api-proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action, configId, clinicId, ...params }),
        })

        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}))
          throw new Error(errBody.error || `API proxy returned ${res.status}`)
        }

        const data = await res.json()

        if (data?.error) {
          console.warn(`[useCustomApiIntegration] ${action} returned error:`, data.error)
        }

        return (data as Record<string, unknown>) ?? {}
      } finally {
        if (!skipLoadingState) setIsLoading(false)
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
    async (doctorId: string, date: string, skipLoadingState = false): Promise<CustomApiSlot[]> => {
      if (!isValidConfig) return []
      try {
        const result = await callCustomApi('get_appointments', { doctorId, date }, skipLoadingState)
        const raw = normalizeArray(result, ['slots', 'appointments', 'data'])
        setLastSync(new Date())

        const mapped = raw.map((s) => {
          // Extract time portion from full datetime ("2026-03-27 10:00:00" → "10:00:00")
          const rawStart = String(s.start_time ?? s.startTime ?? s.start ?? '')
          const rawEnd = String(s.end_time ?? s.endTime ?? s.end ?? '')
          const startTime = rawStart.includes(' ') ? rawStart.split(' ')[1] ?? rawStart : rawStart
          const endTime = rawEnd.includes(' ') ? rawEnd.split(' ')[1] ?? rawEnd : rawEnd

          // "state" field: "0" = available in Centaur/D4W APIs
          // Use String() coercion to handle both number 0 and string "0"
          const stateRaw = s.state
          const isAvailable = stateRaw !== undefined && stateRaw !== null
            ? String(stateRaw) === '0' || String(stateRaw).toLowerCase() === 'available'
            : s.available === true || s.available === undefined

          return {
            appointment_id: String(s.appointment_id ?? s.id ?? s.slotId ?? s.slot_id ?? ''),
            slot_id: String(s.slot_id ?? s.slotId ?? s.id ?? s.appointment_id ?? ''),
            start_time: startTime,
            end_time: endTime || undefined,
            doctor_name: (s.doctor_name ?? s.doctorName) as string | undefined,
            doctor_id: String(s.doctor_id ?? s.doctorId ?? s.DoctorId ?? s.practitioner_id ?? s.PractitionerId ?? ''),
            available: isAvailable,
            duration: s.duration as number | undefined,
            _raw: s,
          }
        })

        // Filter slots to only show the selected doctor's slots.
        // Some external APIs return all doctors' slots regardless of the doctorId filter.
        const filtered = mapped.filter((s) => {
          // If slot has no doctor_id field, include it (can't filter)
          if (!s.doctor_id) return true
          // Match against the selected doctor
          return s.doctor_id === doctorId
        })

        // If filtering removed everything, return unfiltered (API may not include doctor_id in slots)
        return filtered.length > 0 ? filtered : mapped
      } catch (err) {
        console.error('[useCustomApiIntegration] getDoctorSlots failed:', err)
        return []
      }
    },
    [callCustomApi, isValidConfig],
  )

  // ── getAllDoctorSlots (batch) ─────────────────────────────────────────────
  // Uses the server-side batch endpoint to fetch all doctors' slots in a
  // single HTTP request. The server fetches the API config once and fans out
  // external calls in parallel — eliminating N round trips and redundant
  // config lookups. Falls back to per-doctor fetching if batch fails.

  const getAllDoctorSlots = useCallback(
    async (
      doctors: { id: string; name: string; specialty?: string | null; avatarUrl?: string | null }[],
      date: string,
      onProgress?: (completed: number, total: number) => void,
    ): Promise<MergedSlotResult> => {
      const total = doctors.length
      const doctorsByTime: Record<string, DoctorSlotEntry[]> = {}
      let totalSlots = 0

      // Build a lookup map for doctor metadata
      const doctorMap = new Map(doctors.map((d) => [d.id, d]))

      try {
        // Signal progress start
        onProgress?.(0, total)

        const batchStart = performance.now()
        console.log(`[getAllDoctorSlots] 🚀 BATCH request: ${total} doctors, date=${date}, configId=${configId}`)

        // Single batch request to server
        const res = await fetch('/api/custom-api-proxy/batch-slots', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            configId,
            clinicId,
            doctorIds: doctors.map((d) => d.id),
            date,
          }),
        })

        const networkMs = Math.round(performance.now() - batchStart)
        console.log(`[getAllDoctorSlots] Batch response: status=${res.status}, took ${networkMs}ms`)

        if (!res.ok) {
          throw new Error(`Batch endpoint returned ${res.status}`)
        }

        const { results } = (await res.json()) as {
          results: Record<string, { slots: Record<string, unknown>[]; error?: string }>
        }

        const totalSlotsReturned = Object.values(results).reduce((sum, r) => sum + r.slots.length, 0)
        const errors = Object.entries(results).filter(([, r]) => r.error).map(([id, r]) => `${id}: ${r.error}`)
        console.log(`[getAllDoctorSlots] ✅ BATCH complete: ${totalSlotsReturned} raw slots, ${errors.length} errors${errors.length > 0 ? ` (${errors.join(', ')})` : ''}, total ${networkMs}ms`)

        // Process results — same dedup logic, but data arrives all at once
        let completed = 0
        for (const [doctorId, result] of Object.entries(results)) {
          const doc = doctorMap.get(doctorId)
          if (!doc || result.error) {
            completed++
            onProgress?.(completed, total)
            continue
          }

          // Parse all slots first, then filter — mirrors getDoctorSlots fallback logic
          const parsed: { startTime: string; slotDoctorId: string; isAvailable: boolean; slotId: string }[] = []
          for (const s of result.slots) {
            const rawStart = String(s.start_time ?? s.startTime ?? s.start ?? '')
            const startTime = rawStart.includes(' ') ? rawStart.split(' ')[1] ?? rawStart : rawStart

            const stateRaw = s.state
            const isAvailable = stateRaw !== undefined && stateRaw !== null
              ? String(stateRaw) === '0' || String(stateRaw).toLowerCase() === 'available'
              : s.available === true || s.available === undefined

            if (!isAvailable || !startTime) continue

            const slotDoctorId = String(s.doctor_id ?? s.doctorId ?? s.DoctorId ?? s.practitioner_id ?? s.PractitionerId ?? '')
            parsed.push({
              startTime,
              slotDoctorId,
              isAvailable,
              slotId: String(s.slot_id ?? s.slotId ?? s.id ?? s.appointment_id ?? ''),
            })
          }

          // Filter to this doctor's slots. If filtering removes everything,
          // fall back to unfiltered (API may not include doctor_id in slots).
          const filtered = parsed.filter((s) => !s.slotDoctorId || s.slotDoctorId === doctorId)
          const slotsToUse = filtered.length > 0 ? filtered : parsed

          for (const slot of slotsToUse) {
            totalSlots++
            if (!doctorsByTime[slot.startTime]) doctorsByTime[slot.startTime] = []
            doctorsByTime[slot.startTime].push({
              doctorId: doc.id,
              doctorName: doc.name,
              specialty: doc.specialty,
              slotId: slot.slotId,
              avatarUrl: doc.avatarUrl,
            })
          }

          completed++
          onProgress?.(completed, total)
        }
      } catch (batchError) {
        // Fallback: per-doctor fetching (original approach)
        console.warn('[getAllDoctorSlots] ❌ BATCH FAILED — falling back to per-doctor fetch:', batchError)
        let completed = 0

        const results = await Promise.allSettled(
          doctors.map(async (doc) => {
            const slots = await getDoctorSlots(doc.id, date, true)
            completed++
            onProgress?.(completed, total)
            return { doc, slots }
          }),
        )

        for (const result of results) {
          if (result.status !== 'fulfilled') continue
          const { doc, slots } = result.value
          for (const slot of slots) {
            if (!slot.available) continue
            totalSlots++
            const timeKey = slot.start_time
            if (!timeKey) continue
            if (!doctorsByTime[timeKey]) doctorsByTime[timeKey] = []
            doctorsByTime[timeKey].push({
              doctorId: doc.id,
              doctorName: doc.name,
              specialty: doc.specialty,
              slotId: slot.slot_id || slot.appointment_id || '',
              avatarUrl: doc.avatarUrl,
            })
          }
        }
      }

      const times = Object.keys(doctorsByTime).sort()
      return { times, doctorsByTime, totalSlots }
    },
    [clinicId, configId, getDoctorSlots],
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
    getAllDoctorSlots,
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
