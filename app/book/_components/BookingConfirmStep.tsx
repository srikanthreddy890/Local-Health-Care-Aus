'use client'

import { useState, useEffect, useCallback } from 'react'
import { CheckCircle2, Loader2, User, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from '@/lib/toast'
import { cn, fmt12, fmtDate, getInitials } from '@/lib/utils'

interface ClinicInfo { id: string; name: string }
interface DoctorInfo { id: string; first_name: string; last_name: string; specialty?: string | null }
interface ServiceInfo { id: string; name: string; price?: number | null; duration_minutes?: number | null }
interface SlotInfo { id: string; appointment_date: string; start_time: string; end_time: string; status: string; current_bookings: number; max_bookings: number }
interface FamilyMember { id: string; first_name: string; last_name: string; relationship: string }

interface Props {
  clinicId: string
  doctorId: string
  serviceId: string
  slotId: string
  userId: string
  onBooked: () => void
  onSlotUnavailable: () => void
}

export default function BookingConfirmStep({
  clinicId,
  doctorId,
  serviceId,
  slotId,
  userId,
  onBooked,
  onSlotUnavailable,
}: Props) {
  const [clinic, setClinic] = useState<ClinicInfo | null>(null)
  const [doctor, setDoctor] = useState<DoctorInfo | null>(null)
  const [service, setService] = useState<ServiceInfo | null>(null)
  const [slot, setSlot] = useState<SlotInfo | null>(null)
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([])
  const [selectedFamilyMemberId, setSelectedFamilyMemberId] = useState<string | null>(null)
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [slotUnavailable, setSlotUnavailable] = useState(false)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const [clinicRes, doctorRes, serviceRes, slotRes, familyRes] = await Promise.all([
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any).from('clinics_public').select('id, name').eq('id', clinicId).single(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any).from('doctors_public').select('id, first_name, last_name, specialty').eq('id', doctorId).single(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any).from('services_public').select('id, name, price, duration_minutes').eq('id', serviceId).single(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any).from('appointments_public').select('id, appointment_date, start_time, end_time, status, current_bookings, max_bookings').eq('id', slotId).single(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any).from('family_members').select('id, first_name, last_name, relationship').eq('user_id', userId).eq('is_active', true),
      ])

      if (clinicRes.data) setClinic(clinicRes.data)
      if (doctorRes.data) setDoctor(doctorRes.data)
      if (serviceRes.data) setService(serviceRes.data)
      if (familyRes.data) setFamilyMembers(familyRes.data)

      // Check slot availability
      if (slotRes.data) {
        const s = slotRes.data as SlotInfo
        if (s.status !== 'available' || s.current_bookings >= s.max_bookings) {
          setSlotUnavailable(true)
        } else {
          setSlot(s)
        }
      } else {
        setSlotUnavailable(true)
      }
    } finally {
      setLoading(false)
    }
  }, [clinicId, doctorId, serviceId, slotId, userId])

  useEffect(() => { fetchAll() }, [fetchAll])

  const handleConfirm = async () => {
    if (!slot) return
    setSubmitting(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase.functions.invoke('book-appointment', {
        body: {
          appointment_id: slot.id,
          patient_notes: notes || undefined,
          family_member_id: selectedFamilyMemberId ?? undefined,
        },
      })

      if (error) {
        // Extract the actual error message from the edge function response
        const edgeFnError = (error as any)?.context?.error ?? error.message ?? 'Unknown error'
        if (typeof edgeFnError === 'string' && (edgeFnError.includes('not available') || edgeFnError.includes('not found'))) {
          toast({ title: 'Slot no longer available', description: 'This time was just booked by someone else. Please choose a different slot.', variant: 'destructive' })
          onSlotUnavailable()
          return
        }
        throw new Error(typeof edgeFnError === 'string' ? edgeFnError : 'Booking failed')
      }

      if (data && !data.success) {
        const errMsg = data.error || 'Booking failed'
        if (errMsg.includes('not available') || errMsg.includes('not found')) {
          toast({ title: 'Slot no longer available', description: 'This time was just booked by someone else. Please choose a different slot.', variant: 'destructive' })
          onSlotUnavailable()
          return
        }
        throw new Error(errMsg)
      }

      toast.success('Booking confirmed! You\'ll receive a confirmation email shortly.')
      onBooked()
    } catch (err) {
      toast({ title: 'Booking failed', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-lhc-border shadow-sm p-10">
        <div className="flex items-center justify-center py-10 gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-lhc-primary" />
          <span className="text-sm text-lhc-text-muted">Loading booking details…</span>
        </div>
      </div>
    )
  }

  if (slotUnavailable) {
    return (
      <div className="bg-white rounded-2xl border border-lhc-border shadow-sm overflow-hidden">
        <div className="flex flex-col items-center py-14 text-center px-6">
          <AlertCircle className="w-12 h-12 text-amber-500 mb-3" />
          <h3 className="font-bold text-lhc-text-main text-lg">Slot no longer available</h3>
          <p className="text-sm text-lhc-text-muted mt-2 max-w-md">
            This time slot was just booked by someone else. Please go back and choose a different time.
          </p>
          <button
            onClick={onSlotUnavailable}
            className="mt-6 px-6 py-2.5 bg-lhc-primary hover:bg-lhc-primary-hover text-white font-semibold rounded-xl text-sm transition-colors"
          >
            Choose another time
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Summary card */}
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
              { label: 'Clinic', value: clinic?.name ?? '…' },
              { label: 'Doctor', value: doctor ? `Dr. ${doctor.first_name} ${doctor.last_name}${doctor.specialty ? ` · ${doctor.specialty}` : ''}` : '…' },
              { label: 'Date', value: slot ? fmtDate(slot.appointment_date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '…' },
              { label: 'Time', value: slot ? `${fmt12(slot.start_time)} – ${fmt12(slot.end_time)}` : '…', highlight: true },
              ...(service ? [{ label: 'Service', value: `${service.name}${service.duration_minutes ? ` · ${service.duration_minutes} min` : ''}` }] : []),
              ...(service?.price != null ? [{ label: 'Fee', value: `$${service.price}` }] : []),
            ].map(({ label, value, highlight }) => (
              <div key={label} className="flex items-start justify-between py-3 border-b border-lhc-border/60 last:border-0 gap-4">
                <dt className="text-xs font-semibold text-lhc-text-muted uppercase tracking-wide flex-shrink-0 w-16">{label}</dt>
                <dd className={cn('text-sm text-right', highlight ? 'font-bold text-lhc-primary' : 'font-medium text-lhc-text-main')}>{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      {/* Family member selector */}
      {familyMembers.length > 0 && (
        <div className="bg-white rounded-2xl border border-lhc-border shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-lhc-border bg-lhc-background/40 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-lhc-text-main text-sm">Booking for</h3>
              <p className="text-xs text-lhc-text-muted mt-0.5">Select who this appointment is for</p>
            </div>
          </div>
          <div className="p-4 space-y-2">
            <label
              className={cn(
                'flex items-center gap-3 border-2 rounded-xl p-3.5 cursor-pointer transition-all',
                !selectedFamilyMemberId ? 'border-lhc-primary bg-lhc-primary/5' : 'border-lhc-border hover:border-lhc-primary/40 hover:bg-lhc-background/50',
              )}
            >
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
            {familyMembers.map((member) => (
              <label
                key={member.id}
                className={cn(
                  'flex items-center gap-3 border-2 rounded-xl p-3.5 cursor-pointer transition-all',
                  selectedFamilyMemberId === member.id ? 'border-lhc-primary bg-lhc-primary/5' : 'border-lhc-border hover:border-lhc-primary/40 hover:bg-lhc-background/50',
                )}
              >
                <input
                  type="radio"
                  name="familyMember"
                  checked={selectedFamilyMemberId === member.id}
                  onChange={() => setSelectedFamilyMemberId(member.id)}
                  className="accent-lhc-primary"
                />
                <div>
                  <p className="text-sm font-medium text-lhc-text-main">{member.first_name} {member.last_name}</p>
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
        {submitting ? (
          <><Loader2 className="w-5 h-5 animate-spin" /> Confirming your booking…</>
        ) : (
          <><CheckCircle2 className="w-5 h-5" /> Confirm Booking</>
        )}
      </button>

      <p className="text-center text-xs text-lhc-text-muted pb-2">
        You can cancel free of charge up to 24 hours before your appointment.
      </p>
    </div>
  )
}
