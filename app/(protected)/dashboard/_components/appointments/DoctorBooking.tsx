'use client'

/**
 * DoctorBooking — Steps 2 → 3 → 4 of the appointment booking flow.
 *
 * Step 2 (no doctorId)        : Pick a doctor.
 * Step 3 (doctorId, no slotId): Pick a date from a horizontal strip + pick a time.
 * Step 4 (doctorId + slotId)  : Pick a service (optional), add notes, confirm.
 */

import { useState, useEffect, useCallback } from 'react'
import {
  MapPin, Phone, Mail, Clock, Globe,
  User, Loader2, CheckCircle2, CalendarDays, AlertCircle,
  ClipboardList, Stethoscope, BadgeCheck,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from '@/lib/toast'
import { cn, getInitials, fmt12, fmtDate } from '@/lib/utils'
import { useConditionalFamilySelector } from '@/lib/utils/familyMemberValidation'

// ── Types ──────────────────────────────────────────────────────────────────────
interface ClinicDetail {
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

interface Doctor {
  id: string
  first_name: string
  last_name: string
  specialty?: string | null
  bio?: string | null
  avatar_url?: string | null
  consultation_fee?: number | null
  years_experience?: number | null
}

interface Slot {
  id: string
  appointment_date: string
  start_time: string
  end_time: string
  is_emergency_slot?: boolean | null
}

interface Service {
  id: string
  name: string
  description?: string | null
  price?: number | null
  duration_minutes?: number | null
}

interface Props {
  userId: string
  clinicId: string
  clinicName?: string
  doctorId?: string
  slotId?: string
  onSelectDoctor: (id: string, name: string) => void
  onSelectSlot: (id: string | null) => void
  onBooked: () => void
}

// ── Step indicator ─────────────────────────────────────────────────────────────
function StepIndicator({ step }: { step: 2 | 3 | 4 }) {
  const steps = [
    { n: 2, label: 'Doctor' },
    { n: 3, label: 'Date & Time' },
    { n: 4, label: 'Confirm' },
  ]
  return (
    <div className="flex items-center">
      {steps.map((s, i) => {
        const done   = step > s.n
        const active = step === s.n
        return (
          <div key={s.n} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1">
              <div className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all',
                done   ? 'bg-lhc-primary text-white' :
                active ? 'bg-lhc-primary text-white ring-4 ring-lhc-primary/20' :
                         'bg-lhc-border/60 text-lhc-text-muted',
              )}>
                {done ? <CheckCircle2 className="w-4 h-4" /> : s.n - 1}
              </div>
              <span className={cn(
                'text-[10px] font-semibold whitespace-nowrap',
                active ? 'text-lhc-primary' : done ? 'text-lhc-text-main' : 'text-lhc-text-muted',
              )}>
                {s.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={cn(
                'flex-1 h-0.5 mb-4 mx-1 rounded-full transition-all',
                step > s.n ? 'bg-lhc-primary' : 'bg-lhc-border/60',
              )} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Clinic info sidebar ────────────────────────────────────────────────────────
function ClinicSidebar({ clinic }: { clinic: ClinicDetail | null }) {
  if (!clinic) {
    return (
      <div className="bg-white rounded-2xl border border-lhc-border p-5 shadow-sm animate-pulse">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-lhc-border/60" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3.5 bg-lhc-border/60 rounded w-3/4" />
            <div className="h-2.5 bg-lhc-border/40 rounded w-1/2" />
          </div>
        </div>
        {[1, 2, 3].map((i) => <div key={i} className="h-3 bg-lhc-border/40 rounded mb-2" />)}
      </div>
    )
  }

  const todayDow = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'][new Date().getDay()]
  const todayHours = clinic.operating_hours_detailed?.[todayDow]

  return (
    <div className="bg-white rounded-2xl border border-lhc-border shadow-sm overflow-hidden">
      {/* Clinic header */}
      <div className="bg-gradient-to-br from-lhc-primary/8 to-lhc-primary/3 px-5 pt-5 pb-4 border-b border-lhc-border">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-lhc-primary/15 flex items-center justify-center text-lhc-primary font-bold text-sm flex-shrink-0">
            {getInitials(clinic.name)}
          </div>
          <div>
            <p className="font-semibold text-lhc-text-main text-sm leading-snug">{clinic.name}</p>
            {todayHours && (
              <span className={cn(
                'inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full mt-1',
                todayHours.closed
                  ? 'bg-red-100 text-red-600'
                  : 'bg-green-100 text-green-700',
              )}>
                <span className={cn('w-1.5 h-1.5 rounded-full', todayHours.closed ? 'bg-red-500' : 'bg-green-500')} />
                {todayHours.closed
                  ? 'Closed today'
                  : todayHours.open && todayHours.close
                    ? `Open · ${fmt12(todayHours.open)} – ${fmt12(todayHours.close)}`
                    : 'Open today'}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Contact details */}
      <div className="px-5 py-4 space-y-2.5 text-sm">
        {(clinic.address_line1 || clinic.city) && (
          <div className="flex items-start gap-2.5 text-lhc-text-muted">
            <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0 text-lhc-primary/60" />
            <span className="leading-snug">{[clinic.address_line1, clinic.city, clinic.state].filter(Boolean).join(', ')}</span>
          </div>
        )}
        {clinic.phone && (
          <div className="flex items-center gap-2.5 text-lhc-text-muted">
            <Phone className="w-4 h-4 flex-shrink-0 text-lhc-primary/60" />
            <a href={`tel:${clinic.phone}`} className="hover:text-lhc-primary transition-colors">{clinic.phone}</a>
          </div>
        )}
        {clinic.email && (
          <div className="flex items-center gap-2.5 text-lhc-text-muted">
            <Mail className="w-4 h-4 flex-shrink-0 text-lhc-primary/60" />
            <a href={`mailto:${clinic.email}`} className="hover:text-lhc-primary transition-colors truncate">{clinic.email}</a>
          </div>
        )}
        {clinic.website && (
          <div className="flex items-center gap-2.5 text-lhc-text-muted">
            <Globe className="w-4 h-4 flex-shrink-0 text-lhc-primary/60" />
            <a href={clinic.website} target="_blank" rel="noopener noreferrer" className="hover:text-lhc-primary transition-colors truncate">
              {clinic.website.replace(/^https?:\/\//, '')}
            </a>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function DoctorBooking({
  userId, clinicId, clinicName, doctorId, slotId,
  onSelectDoctor, onSelectSlot, onBooked,
}: Props) {
  const [clinic,          setClinic]          = useState<ClinicDetail | null>(null)
  const [doctors,         setDoctors]         = useState<Doctor[]>([])
  const [slots,           setSlots]           = useState<Slot[]>([])
  const [services,        setServices]        = useState<Service[]>([])
  const [selectedDate,    setSelectedDate]    = useState<string | null>(null)
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [notes,           setNotes]           = useState('')
  const [submitting,      setSubmitting]      = useState(false)
  const [loadingDoctors,  setLoadingDoctors]  = useState(false)
  const [loadingSlots,    setLoadingSlots]    = useState(false)
  const [loadingServices, setLoadingServices] = useState(false)
  const [selectedFamilyMemberId, setSelectedFamilyMemberId] = useState<string | null>(null)

  const { familyMembers: eligibleFamilyMembers, hasFamilyMembers } = useConditionalFamilySelector(userId)

  const selectedDoctor = doctors.find((d) => d.id === doctorId) ?? null
  const selectedSlot   = slots.find((s)   => s.id === slotId)   ?? null

  const slotsByDate: Record<string, Slot[]> = {}
  for (const s of slots) {
    if (!slotsByDate[s.appointment_date]) slotsByDate[s.appointment_date] = []
    slotsByDate[s.appointment_date].push(s)
  }
  const sortedDates = Object.keys(slotsByDate).sort()
  const todayStr    = new Date().toISOString().split('T')[0]
  const tomorrowDate = new Date(); tomorrowDate.setDate(tomorrowDate.getDate() + 1)
  const tomorrowStr  = tomorrowDate.toISOString().split('T')[0]

  // ── Fetchers ────────────────────────────────────────────────────────────────
  const fetchClinic = useCallback(async () => {
    try {
      const supabase = createClient()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('clinics_public')
        .select('id, name, logo_url, address_line1, city, state, phone, email, website, operating_hours_detailed')
        .eq('id', clinicId)
        .single()
      if (error) throw error
      if (data) setClinic(data)
    } catch (err) {
      toast({ title: 'Could not load clinic details', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' })
    }
  }, [clinicId])

  const fetchDoctors = useCallback(async () => {
    setLoadingDoctors(true)
    try {
      const supabase = createClient()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('doctors')
        .select('id, first_name, last_name, specialty, bio, avatar_url, consultation_fee, years_experience')
        .eq('clinic_id', clinicId)
        .eq('is_active', true)
        .order('display_order', { ascending: true })
      if (error) throw error
      if (data) setDoctors(data)
    } catch (err) {
      toast({ title: 'Could not load doctors', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' })
    } finally {
      setLoadingDoctors(false)
    }
  }, [clinicId])

  const fetchSlots = useCallback(async (dId: string) => {
    setLoadingSlots(true)
    setSlots([])
    try {
      const supabase = createClient()
      const today = new Date().toISOString().split('T')[0]
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('appointments')
        .select('id, appointment_date, start_time, end_time, is_emergency_slot')
        .eq('clinic_id', clinicId)
        .eq('doctor_id', dId)
        .eq('status', 'available')
        .gte('appointment_date', today)
        .order('appointment_date', { ascending: true })
        .order('start_time',      { ascending: true })
        .limit(90)
      if (error) throw error
      if (data) setSlots(data)
    } catch (err) {
      toast({ title: 'Could not load available slots', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' })
    } finally {
      setLoadingSlots(false)
    }
  }, [clinicId])

  const fetchServices = useCallback(async () => {
    setLoadingServices(true)
    try {
      const supabase = createClient()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('services')
        .select('id, name, description, price, duration_minutes')
        .eq('clinic_id', clinicId)
        .eq('is_active', true)
      if (error) throw error
      if (data) setServices(data)
    } catch (err) {
      toast({ title: 'Could not load services', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' })
    } finally {
      setLoadingServices(false)
    }
  }, [clinicId])

  useEffect(() => { fetchClinic()  }, [fetchClinic])
  useEffect(() => { fetchDoctors() }, [fetchDoctors])
  useEffect(() => {
    if (doctorId) { fetchSlots(doctorId); fetchServices() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doctorId])
  useEffect(() => {
    if (selectedSlot) setSelectedDate(selectedSlot.appointment_date)
  }, [selectedSlot])

  // ── Confirm booking ──────────────────────────────────────────────────────────
  const handleConfirm = async () => {
    if (!selectedSlot) return
    setSubmitting(true)
    try {
      const supabase = createClient()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: slotCheck, error: checkError } = await (supabase as any)
        .from('appointments').select('status').eq('id', selectedSlot.id).single()
      if (checkError || !slotCheck) throw checkError ?? new Error('Slot not found')
      if (slotCheck.status !== 'available') {
        toast({ title: 'Slot no longer available', description: 'This time was just booked by someone else. Please choose a different slot.', variant: 'destructive' })
        if (doctorId) fetchSlots(doctorId)
        onSelectSlot(null)
        return
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).from('bookings').insert({
        appointment_id:   selectedSlot.id,
        patient_id:       userId,
        clinic_id:        clinicId,
        status:           'pending',
        service_name:     selectedService?.name ?? null,
        patient_notes:    notes || null,
        booking_reference: 'BK' + Date.now(),
        doctor_name:      selectedDoctor ? `Dr. ${selectedDoctor.first_name} ${selectedDoctor.last_name}` : null,
        appointment_date: selectedSlot.appointment_date,
        start_time:       selectedSlot.start_time,
        end_time:         selectedSlot.end_time,
        family_member_id: selectedFamilyMemberId ?? null,
      })
      if (error) throw error
      toast.success('Booking confirmed! You\'ll receive a reminder before your appointment.')
      onBooked()
    } catch (err) {
      toast({ title: 'Booking failed', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  const step = !doctorId ? 2 : !slotId ? 3 : 4

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

      {/* ── Left: Booking content ──────────────────────────────────────────── */}
      <div className="lg:col-span-2 space-y-4">

        {/* Step progress header */}
        <div className="bg-white rounded-2xl border border-lhc-border px-6 py-5 shadow-sm">
          <p className="text-xs font-semibold text-lhc-text-muted uppercase tracking-wider mb-4">
            Booking at <span className="text-lhc-primary">{clinicName ?? clinic?.name ?? '…'}</span>
          </p>
          <StepIndicator step={step as 2 | 3 | 4} />
        </div>

        {/* ── STEP 2: Doctor picker ─────────────────────────────────────── */}
        {step === 2 && (
          <div className="bg-white rounded-2xl border border-lhc-border shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-lhc-border bg-lhc-background/40">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-lhc-primary/10 flex items-center justify-center">
                  <Stethoscope className="w-4 h-4 text-lhc-primary" />
                </div>
                <h3 className="font-semibold text-lhc-text-main">Select a Doctor</h3>
              </div>
            </div>

            <div className="p-5">
              {loadingDoctors ? (
                <div className="flex items-center justify-center py-14 gap-2 text-lhc-text-muted">
                  <Loader2 className="w-5 h-5 animate-spin text-lhc-primary" />
                  <span className="text-sm">Loading doctors…</span>
                </div>
              ) : doctors.length === 0 ? (
                <div className="flex flex-col items-center py-14 text-center">
                  <AlertCircle className="w-10 h-10 text-lhc-text-muted/25 mb-3" />
                  <p className="font-medium text-lhc-text-main text-sm">No doctors listed</p>
                  <p className="text-xs text-lhc-text-muted mt-1">This clinic hasn't added doctor profiles yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {doctors.map((doc) => (
                    <button
                      key={doc.id}
                      onClick={() => onSelectDoctor(doc.id, `Dr. ${doc.first_name} ${doc.last_name}`)}
                      className="group text-left rounded-2xl border-2 border-lhc-border hover:border-lhc-primary bg-lhc-background/30 hover:bg-white p-4 transition-all duration-150 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lhc-primary"
                    >
                      <div className="flex items-start gap-3">
                        {doc.avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={doc.avatar_url} alt="" className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-lhc-primary/10 group-hover:bg-lhc-primary/15 flex items-center justify-center text-lhc-primary font-bold flex-shrink-0 transition-colors">
                            {getInitials(`${doc.first_name} ${doc.last_name}`)}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-lhc-text-main text-sm leading-tight">
                            Dr. {doc.first_name} {doc.last_name}
                          </p>
                          {doc.specialty && (
                            <p className="text-xs text-lhc-primary font-medium mt-0.5">{doc.specialty}</p>
                          )}
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {doc.years_experience != null && (
                              <span className="text-[11px] bg-lhc-background border border-lhc-border text-lhc-text-muted rounded-full px-2 py-0.5">
                                {doc.years_experience} yrs exp
                              </span>
                            )}
                            {doc.consultation_fee != null && (
                              <span className="text-[11px] bg-lhc-primary/8 border border-lhc-primary/20 text-lhc-primary font-semibold rounded-full px-2 py-0.5">
                                ${doc.consultation_fee}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      {doc.bio && (
                        <p className="text-xs text-lhc-text-muted mt-2.5 line-clamp-2 leading-relaxed">{doc.bio}</p>
                      )}
                      <div className="mt-3 pt-3 border-t border-lhc-border/60 flex items-center justify-between">
                        <span className="text-xs text-lhc-text-muted">Tap to select & view availability</span>
                        <span className="text-xs font-bold text-lhc-primary group-hover:underline">Select →</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── STEP 3: Date & time ───────────────────────────────────────── */}
        {step === 3 && selectedDoctor && (
          <div className="bg-white rounded-2xl border border-lhc-border shadow-sm overflow-hidden">

            {/* Selected doctor banner */}
            <div className="flex items-center gap-3 px-6 py-3.5 bg-lhc-primary/6 border-b border-lhc-primary/15">
              {selectedDoctor.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={selectedDoctor.avatar_url} alt="" className="w-9 h-9 rounded-lg object-cover flex-shrink-0" />
              ) : (
                <div className="w-9 h-9 rounded-lg bg-lhc-primary/15 flex items-center justify-center text-lhc-primary font-bold text-xs flex-shrink-0">
                  {getInitials(`${selectedDoctor.first_name} ${selectedDoctor.last_name}`)}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-lhc-text-main text-sm">
                  Dr. {selectedDoctor.first_name} {selectedDoctor.last_name}
                </p>
                {selectedDoctor.specialty && (
                  <p className="text-xs text-lhc-primary">{selectedDoctor.specialty}</p>
                )}
              </div>
              <CheckCircle2 className="w-5 h-5 text-lhc-primary flex-shrink-0" />
            </div>

            <div className="p-6">
              {loadingSlots ? (
                <div className="flex items-center justify-center py-14 gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-lhc-primary" />
                  <span className="text-sm text-lhc-text-muted">Checking availability…</span>
                </div>
              ) : slots.length === 0 ? (
                <div className="flex flex-col items-center py-14 text-center">
                  <AlertCircle className="w-9 h-9 text-lhc-text-muted/25 mb-2" />
                  <p className="text-sm font-medium text-lhc-text-main">No available slots</p>
                  <p className="text-xs text-lhc-text-muted mt-1">This doctor has no upcoming availability. Try another.</p>
                </div>
              ) : (
                <div className="space-y-7">
                  {/* "Next available" heading */}
                  <p className="text-xs font-semibold text-lhc-text-muted uppercase tracking-wider">
                    Next available
                  </p>

                  {sortedDates.map((date) => {
                    const daySlots = slotsByDate[date]
                    const d = new Date(date + 'T00:00:00')
                    const dayLabel =
                      date === todayStr     ? 'Today'    :
                      date === tomorrowStr  ? 'Tomorrow' : null

                    return (
                      <div key={date}>
                        {/* Date section header */}
                        <div className="flex items-baseline gap-3 mb-3">
                          <h4 className="font-semibold text-lhc-text-main">
                            {d.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'long' })}
                          </h4>
                          {dayLabel && (
                            <span className="text-[10px] font-bold uppercase tracking-wider text-lhc-text-muted">
                              {dayLabel}
                            </span>
                          )}
                        </div>

                        {/* Time slot pills */}
                        {daySlots && daySlots.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {daySlots.map((slot) => (
                              <button
                                key={slot.id}
                                onClick={() => onSelectSlot(slot.id)}
                                className={cn(
                                  'px-4 py-2 rounded-full border text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lhc-primary',
                                  slot.is_emergency_slot
                                    ? 'border-red-200 bg-red-50 text-red-600 hover:border-red-400 hover:bg-red-100'
                                    : slotId === slot.id
                                      ? 'bg-lhc-primary border-lhc-primary text-white shadow-sm'
                                      : 'border-lhc-border/70 text-lhc-primary bg-lhc-primary/5 hover:border-lhc-primary hover:bg-lhc-primary/10',
                                )}
                              >
                                {fmt12(slot.start_time)}
                                {slot.is_emergency_slot && (
                                  <span className="ml-1.5 text-[9px] font-bold uppercase tracking-wider">Urgent</span>
                                )}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-lhc-text-muted italic">
                            There are no appointments available online for the selected practitioner on this day.
                          </p>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── STEP 4: Confirm ───────────────────────────────────────────── */}
        {step === 4 && selectedDoctor && selectedSlot && (
          <div className="space-y-4">

            {/* Summary card with accent header */}
            <div className="bg-white rounded-2xl border border-lhc-border shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-lhc-primary to-lhc-primary-hover px-6 py-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-white/90" />
                  <h3 className="font-bold text-white">Review your booking</h3>
                </div>
                <p className="text-xs text-white/70 mt-0.5">Double-check your details before confirming</p>
              </div>

              <div className="p-6">
                <dl className="space-y-0">
                  {[
                    { label: 'Clinic',    value: clinic?.name ?? clinicName },
                    { label: 'Doctor',    value: `Dr. ${selectedDoctor.first_name} ${selectedDoctor.last_name}${selectedDoctor.specialty ? ` · ${selectedDoctor.specialty}` : ''}` },
                    { label: 'Date',      value: fmtDate(selectedSlot.appointment_date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) },
                    { label: 'Time',      value: `${fmt12(selectedSlot.start_time)} – ${fmt12(selectedSlot.end_time)}`, highlight: true },
                    ...(selectedService ? [{ label: 'Service', value: selectedService.name }] : []),
                  ].map(({ label, value, highlight }) => (
                    <div key={label} className="flex items-start justify-between py-3 border-b border-lhc-border/60 last:border-0 gap-4">
                      <dt className="text-xs font-semibold text-lhc-text-muted uppercase tracking-wide flex-shrink-0 w-16">{label}</dt>
                      <dd className={cn('text-sm text-right', highlight ? 'font-bold text-lhc-primary' : 'font-medium text-lhc-text-main')}>{value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>

            {/* Service selector */}
            <div className="bg-white rounded-2xl border border-lhc-border shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-lhc-border bg-lhc-background/40 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-lhc-text-main text-sm">Service</h3>
                  <p className="text-xs text-lhc-text-muted mt-0.5">Optional — helps the clinic prepare for your visit</p>
                </div>
                <span className="text-[10px] font-semibold text-lhc-text-muted border border-lhc-border rounded-full px-2 py-0.5 uppercase tracking-wide">Optional</span>
              </div>

              <div className="p-4">
                {loadingServices ? (
                  <div className="flex items-center gap-2 py-4 text-sm text-lhc-text-muted">
                    <Loader2 className="w-4 h-4 animate-spin text-lhc-primary" />
                    Loading services…
                  </div>
                ) : services.length === 0 ? (
                  <p className="text-sm text-lhc-text-muted italic py-2 px-1">No services listed — will be recorded as a general consultation.</p>
                ) : (
                  <div className="space-y-2">
                    {/* General / none option */}
                    <label className={cn(
                      'flex items-center gap-3 border-2 rounded-xl p-3.5 cursor-pointer transition-all',
                      !selectedService ? 'border-lhc-primary bg-lhc-primary/5' : 'border-lhc-border hover:border-lhc-primary/40 hover:bg-lhc-background/50',
                    )}>
                      <input type="radio" name="service" checked={!selectedService} onChange={() => setSelectedService(null)} className="accent-lhc-primary" />
                      <span className="text-sm font-medium text-lhc-text-main">General Consultation</span>
                    </label>

                    {services.map((svc) => (
                      <label key={svc.id} className={cn(
                        'flex items-start gap-3 border-2 rounded-xl p-3.5 cursor-pointer transition-all',
                        selectedService?.id === svc.id ? 'border-lhc-primary bg-lhc-primary/5' : 'border-lhc-border hover:border-lhc-primary/40 hover:bg-lhc-background/50',
                      )}>
                        <input type="radio" name="service" checked={selectedService?.id === svc.id} onChange={() => setSelectedService(svc)} className="accent-lhc-primary mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-lhc-text-main">{svc.name}</p>
                          {svc.description && <p className="text-xs text-lhc-text-muted mt-0.5 line-clamp-1">{svc.description}</p>}
                          {svc.duration_minutes != null && (
                            <p className="text-xs text-lhc-text-muted flex items-center gap-1 mt-1">
                              <Clock className="w-3 h-3" /> {svc.duration_minutes} min
                            </p>
                          )}
                        </div>
                        {svc.price != null && (
                          <span className="text-sm font-bold text-lhc-text-main flex-shrink-0">${svc.price.toFixed(2)}</span>
                        )}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Family member selector */}
            {hasFamilyMembers && (
              <div className="bg-white rounded-2xl border border-lhc-border shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-lhc-border bg-lhc-background/40 flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-lhc-text-main text-sm">Booking for</h3>
                    <p className="text-xs text-lhc-text-muted mt-0.5">Select who this appointment is for</p>
                  </div>
                </div>
                <div className="p-4 space-y-2">
                  <label className={cn(
                    'flex items-center gap-3 border-2 rounded-xl p-3.5 cursor-pointer transition-all',
                    !selectedFamilyMemberId ? 'border-lhc-primary bg-lhc-primary/5' : 'border-lhc-border hover:border-lhc-primary/40 hover:bg-lhc-background/50',
                  )}>
                    <input
                      type="radio"
                      name="familyMember"
                      checked={!selectedFamilyMemberId}
                      onChange={() => setSelectedFamilyMemberId(null)}
                      className="accent-lhc-primary"
                    />
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-lhc-primary/60" />
                      <span className="text-sm font-medium text-lhc-text-main">Myself</span>
                    </div>
                  </label>
                  {eligibleFamilyMembers.map((member) => (
                    <label key={member.id} className={cn(
                      'flex items-center gap-3 border-2 rounded-xl p-3.5 cursor-pointer transition-all',
                      selectedFamilyMemberId === member.id ? 'border-lhc-primary bg-lhc-primary/5' : 'border-lhc-border hover:border-lhc-primary/40 hover:bg-lhc-background/50',
                    )}>
                      <input
                        type="radio"
                        name="familyMember"
                        checked={selectedFamilyMemberId === member.id}
                        onChange={() => setSelectedFamilyMemberId(member.id)}
                        className="accent-lhc-primary"
                      />
                      <div>
                        <p className="text-sm font-medium text-lhc-text-main">
                          {member.first_name} {member.last_name}
                        </p>
                        <p className="text-xs text-lhc-text-muted">{member.relationship}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            <div className="bg-white rounded-2xl border border-lhc-border shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-lhc-border bg-lhc-background/40 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-lhc-text-main text-sm">Notes for the clinic</h3>
                  <p className="text-xs text-lhc-text-muted mt-0.5">Symptoms, allergies, or anything the clinic should know</p>
                </div>
                <span className="text-[10px] font-semibold text-lhc-text-muted border border-lhc-border rounded-full px-2 py-0.5 uppercase tracking-wide">Optional</span>
              </div>
              <div className="p-4">
                <textarea
                  id="patient-notes"
                  aria-label="Patient notes (optional)"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. reason for visit, current medications, allergies…"
                  rows={3}
                  className="w-full border border-lhc-border rounded-xl px-4 py-3 text-sm text-lhc-text-main placeholder-lhc-text-muted/70 bg-lhc-background focus:outline-none focus:ring-2 focus:ring-lhc-primary/30 focus:border-lhc-primary resize-none transition"
                />
              </div>
            </div>

            {/* Confirm button */}
            <button
              onClick={handleConfirm}
              disabled={submitting}
              className={cn(
                'w-full flex items-center justify-center gap-2.5 bg-lhc-primary hover:bg-lhc-primary-hover text-white font-bold rounded-2xl px-6 py-4 text-base transition-all shadow-sm hover:shadow-md',
                submitting && 'opacity-60 cursor-not-allowed',
              )}
            >
              {submitting
                ? <><Loader2 className="w-5 h-5 animate-spin" /> Confirming your booking…</>
                : <><CheckCircle2 className="w-5 h-5" /> Confirm Booking</>
              }
            </button>

            <p className="text-center text-xs text-lhc-text-muted pb-2">
              You can cancel free of charge up to 24 hours before your appointment.
            </p>
          </div>
        )}
      </div>

      {/* ── Right: Sidebar ─────────────────────────────────────────────────── */}
      <div className="space-y-4">
        <ClinicSidebar clinic={clinic} />

        {/* Booking tips */}
        <div className="bg-lhc-primary/5 border border-lhc-primary/15 rounded-2xl p-4">
          <p className="font-semibold text-lhc-primary text-sm mb-2 flex items-center gap-1.5">
            <ClipboardList className="w-4 h-4" /> Booking Tips
          </p>
          <ul className="space-y-1.5 text-xs text-lhc-text-muted">
            <li className="flex items-start gap-1.5"><BadgeCheck className="w-3.5 h-3.5 text-lhc-primary/60 flex-shrink-0 mt-0.5" />Arrive 5–10 minutes early to complete paperwork.</li>
            <li className="flex items-start gap-1.5"><BadgeCheck className="w-3.5 h-3.5 text-lhc-primary/60 flex-shrink-0 mt-0.5" />Bring referral letters or relevant health records.</li>
            <li className="flex items-start gap-1.5"><BadgeCheck className="w-3.5 h-3.5 text-lhc-primary/60 flex-shrink-0 mt-0.5" />Cancellations require 24 hours notice.</li>
            <li className="flex items-start gap-1.5"><BadgeCheck className="w-3.5 h-3.5 text-lhc-primary/60 flex-shrink-0 mt-0.5" />You earn loyalty points for every completed visit.</li>
          </ul>
        </div>

        {/* Appointment summary shown in sidebar during step 3/4 */}
        {step >= 3 && selectedDoctor && (
          <div className="bg-white border border-lhc-border rounded-2xl p-4 shadow-sm space-y-3">
            <p className="text-xs font-semibold text-lhc-text-muted uppercase tracking-wide">Your Selection</p>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-lhc-primary/10 flex items-center justify-center text-lhc-primary text-xs font-bold flex-shrink-0">
                {getInitials(`${selectedDoctor.first_name} ${selectedDoctor.last_name}`)}
              </div>
              <div>
                <p className="text-sm font-semibold text-lhc-text-main">Dr. {selectedDoctor.first_name} {selectedDoctor.last_name}</p>
                {selectedDoctor.specialty && <p className="text-xs text-lhc-primary">{selectedDoctor.specialty}</p>}
              </div>
            </div>
            {selectedDate && (
              <div className="flex items-center gap-2 text-xs text-lhc-text-muted pt-1 border-t border-lhc-border/60">
                <CalendarDays className="w-3.5 h-3.5 text-lhc-primary/60 flex-shrink-0" />
                {fmtDate(selectedDate, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
              </div>
            )}
            {selectedSlot && (
              <div className="flex items-center gap-2 text-xs text-lhc-text-muted">
                <Clock className="w-3.5 h-3.5 text-lhc-primary/60 flex-shrink-0" />
                <span className="font-semibold text-lhc-primary">{fmt12(selectedSlot.start_time)} – {fmt12(selectedSlot.end_time)}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
