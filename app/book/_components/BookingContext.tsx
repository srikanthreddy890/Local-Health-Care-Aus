'use client'

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'

// ── Types ────────────────────────────────────────────────────────────────────
export interface ClinicInfo {
  id: string
  name: string
  logo_url?: string | null
  address_line1?: string | null
  city?: string | null
  state?: string | null
  phone?: string | null
  email?: string | null
  website?: string | null
  operating_hours_detailed?: Record<string, { open: string; close: string; closed?: boolean }> | null
  custom_api_enabled?: boolean | null
  custom_api_config_id?: string | null
}

export interface DoctorInfo {
  id: string
  first_name: string
  last_name: string
  specialty?: string | null
  avatar_url?: string | null
}

export interface ServiceInfo {
  id: string
  name: string
  price?: number | null
  duration_minutes?: number | null
}

export interface SlotInfo {
  id: string
  appointment_date: string
  start_time: string
  end_time: string
}

/** Entry for a doctor available at a specific time slot */
export interface DoctorSlotEntry {
  doctorId: string
  doctorName: string
  specialty?: string | null
  slotId: string
  avatarUrl?: string | null
}

interface BookingData {
  clinic: ClinicInfo | null
  doctor: DoctorInfo | null
  service: ServiceInfo | null
  slot: SlotInfo | null
  /** Maps time string (e.g. "10:00:00") to available doctors at that time */
  availableDoctorsForSlot?: Record<string, DoctorSlotEntry[]> | null
  /** The selected time (before doctor is chosen) e.g. "10:00:00" */
  selectedTimeSlot?: string | null
}

interface BookingContextType {
  data: BookingData
  clinicError: string | null
  setClinic: (clinic: ClinicInfo | null) => void
  setDoctor: (doctor: DoctorInfo | null) => void
  setService: (service: ServiceInfo | null) => void
  setSlot: (slot: SlotInfo | null) => void
  setAvailableDoctorsForSlot: (map: Record<string, DoctorSlotEntry[]> | null) => void
  setSelectedTimeSlot: (time: string | null) => void
  /** Fetch and cache a single entity by ID if not already loaded */
  ensureClinic: (id: string) => Promise<void>
  ensureDoctor: (id: string) => Promise<void>
  ensureService: (id: string) => Promise<void>
  ensureSlot: (id: string) => Promise<void>
}

const BookingCtx = createContext<BookingContextType | null>(null)

export function useBookingContext() {
  const ctx = useContext(BookingCtx)
  if (!ctx) throw new Error('useBookingContext must be inside BookingProvider')
  return ctx
}

const STORAGE_KEY = 'lhc_booking_context'

function loadFromSession(): BookingData {
  try {
    const raw = typeof window !== 'undefined' ? sessionStorage.getItem(STORAGE_KEY) : null
    if (raw) return JSON.parse(raw) as BookingData
  } catch { /* ignore */ }
  return { clinic: null, doctor: null, service: null, slot: null, availableDoctorsForSlot: null, selectedTimeSlot: null }
}

function saveToSession(data: BookingData) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch { /* ignore */ }
}

export function BookingProvider({ children }: { children: ReactNode }) {
  const [restored] = useState(() => loadFromSession())
  const [clinic, setClinic] = useState<ClinicInfo | null>(restored.clinic)
  const [clinicError, setClinicError] = useState<string | null>(null)
  const [doctor, setDoctor] = useState<DoctorInfo | null>(restored.doctor)
  const [service, setService] = useState<ServiceInfo | null>(restored.service)
  const [slot, setSlot] = useState<SlotInfo | null>(restored.slot)
  const [availableDoctorsForSlot, setAvailableDoctorsForSlot] = useState<Record<string, DoctorSlotEntry[]> | null>(restored.availableDoctorsForSlot ?? null)
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | null>(restored.selectedTimeSlot ?? null)

  // Persist to sessionStorage whenever booking data changes
  useEffect(() => {
    saveToSession({ clinic, doctor, service, slot, availableDoctorsForSlot, selectedTimeSlot })
  }, [clinic, doctor, service, slot, availableDoctorsForSlot, selectedTimeSlot])

  const ensureClinic = useCallback(async (id: string) => {
    if (clinic?.id === id) return
    setClinicError(null)
    try {
      const supabase = createClient()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('clinics_public')
        .select('id, name, logo_url, address_line1, city, state, phone, email, website, operating_hours_detailed, custom_api_enabled, custom_api_config_id')
        .eq('id', id)
        .single()
      if (error) throw error
      if (!data) throw new Error('Clinic not found')
      setClinic(data)
    } catch (err) {
      setClinicError(err instanceof Error ? err.message : 'Failed to load clinic')
    }
  }, [clinic?.id])

  const ensureDoctor = useCallback(async (id: string) => {
    if (doctor?.id === id) return
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from('doctors_public')
      .select('id, first_name, last_name, specialty, avatar_url')
      .eq('id', id)
      .single()
    if (data) setDoctor(data)
  }, [doctor?.id])

  const ensureService = useCallback(async (id: string) => {
    if (service?.id === id) return
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from('services_public')
      .select('id, name, price, duration_minutes')
      .eq('id', id)
      .single()
    if (data) setService(data)
  }, [service?.id])

  const ensureSlot = useCallback(async (id: string) => {
    if (slot?.id === id) return
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from('appointments_public')
      .select('id, appointment_date, start_time, end_time')
      .eq('id', id)
      .single()
    if (data) setSlot(data)
  }, [slot?.id])

  return (
    <BookingCtx.Provider
      value={{
        data: { clinic, doctor, service, slot, availableDoctorsForSlot, selectedTimeSlot },
        clinicError,
        setClinic,
        setDoctor,
        setService,
        setSlot,
        setAvailableDoctorsForSlot,
        setSelectedTimeSlot,
        ensureClinic,
        ensureDoctor,
        ensureService,
        ensureSlot,
      }}
    >
      {children}
    </BookingCtx.Provider>
  )
}
