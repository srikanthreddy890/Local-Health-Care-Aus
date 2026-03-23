'use client'

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
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

interface BookingData {
  clinic: ClinicInfo | null
  doctor: DoctorInfo | null
  service: ServiceInfo | null
  slot: SlotInfo | null
}

interface BookingContextType {
  data: BookingData
  setClinic: (clinic: ClinicInfo | null) => void
  setDoctor: (doctor: DoctorInfo | null) => void
  setService: (service: ServiceInfo | null) => void
  setSlot: (slot: SlotInfo | null) => void
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

export function BookingProvider({ children }: { children: ReactNode }) {
  const [clinic, setClinic] = useState<ClinicInfo | null>(null)
  const [doctor, setDoctor] = useState<DoctorInfo | null>(null)
  const [service, setService] = useState<ServiceInfo | null>(null)
  const [slot, setSlot] = useState<SlotInfo | null>(null)

  const ensureClinic = useCallback(async (id: string) => {
    if (clinic?.id === id) return
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from('clinics_public')
      .select('id, name, logo_url, address_line1, city, state, phone, email, website, operating_hours_detailed')
      .eq('id', id)
      .single()
    if (data) setClinic(data)
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
        data: { clinic, doctor, service, slot },
        setClinic,
        setDoctor,
        setService,
        setSlot,
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
