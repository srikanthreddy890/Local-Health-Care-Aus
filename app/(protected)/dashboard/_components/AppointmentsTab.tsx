'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import AppointmentBooking from './appointments/AppointmentBooking'
import DoctorBooking from './appointments/DoctorBooking'
import AppointmentsList from './appointments/AppointmentsList'

interface Props {
  userId: string
}

export default function AppointmentsTab({ userId }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()

  // URL-driven step state — all booking context lives in the URL
  const subTab     = searchParams.get('appt')        ?? 'book'
  const clinicId   = searchParams.get('clinic_id')   ?? null
  const clinicName = searchParams.get('clinic_name') ?? null
  const doctorId   = searchParams.get('doctor_id')   ?? null
  const doctorName = searchParams.get('doctor_name') ?? null
  const slotId     = searchParams.get('slot_id')     ?? null

  // ── URL navigation helpers ─────────────────────────────────────────────────
  // replace: used for within-flow step transitions — no browser history entries,
  // so Back exits the entire booking flow rather than stepping backwards.
  function navigate(updates: Record<string, string | null>) {
    const p = new URLSearchParams(searchParams.toString())
    p.set('tab', 'appointments')
    for (const [k, v] of Object.entries(updates)) {
      if (v === null) p.delete(k)
      else p.set(k, v)
    }
    router.replace(`?${p.toString()}`)
  }

  // push: used only when entering the booking flow from the clinic list —
  // creates one history entry so Back returns to the clinic search.
  function enterBookingFlow(clinicId: string, clinicName: string) {
    const p = new URLSearchParams()
    p.set('tab', 'appointments')
    p.set('appt', 'book')
    p.set('clinic_id', clinicId)
    p.set('clinic_name', clinicName)
    router.push(`?${p.toString()}`)
  }

  const resetToBook = () =>
    navigate({ appt: 'book', clinic_id: null, clinic_name: null, doctor_id: null, doctor_name: null, slot_id: null })

  const resetToBooked = () =>
    navigate({ appt: 'booked', clinic_id: null, clinic_name: null, doctor_id: null, doctor_name: null, slot_id: null })

  const inBookingFlow = subTab === 'book' && !!clinicId

  return (
    <div>
      {/* ── Sub-tab bar ────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 mb-5">
        <div className="bg-lhc-background/50 rounded-xl p-1 inline-flex gap-1 border border-lhc-border">
          <button
            onClick={resetToBook}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-all',
              subTab === 'book'
                ? 'bg-white shadow-sm text-lhc-text-main'
                : 'bg-transparent text-lhc-text-muted hover:text-lhc-text-main',
            )}
          >
            Book Appointment
          </button>
          <button
            onClick={resetToBooked}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-all',
              subTab === 'booked'
                ? 'bg-white shadow-sm text-lhc-text-main'
                : 'bg-transparent text-lhc-text-muted hover:text-lhc-text-main',
            )}
          >
            My Appointments
          </button>
        </div>
      </div>

      {/* ── Breadcrumb (shown when inside the booking flow) ─────────────────── */}
      {inBookingFlow && (
        <nav aria-label="Booking steps" className="flex items-center gap-1.5 text-sm mb-6 flex-wrap bg-white border border-lhc-border rounded-xl px-4 py-3">
          <button
            onClick={resetToBook}
            className="text-lhc-primary hover:underline font-medium"
          >
            Find a Clinic
          </button>

          <ChevronRight className="w-3.5 h-3.5 text-lhc-text-muted/60 flex-shrink-0" />
          <button
            onClick={() => navigate({ doctor_id: null, doctor_name: null, slot_id: null })}
            className={cn(
              'font-medium truncate max-w-[180px]',
              doctorId
                ? 'text-lhc-primary hover:underline'
                : 'text-lhc-text-main cursor-default',
            )}
          >
            {clinicName ?? 'Clinic'}
          </button>

          {doctorId && (
            <>
              <ChevronRight className="w-3.5 h-3.5 text-lhc-text-muted/60 flex-shrink-0" />
              <button
                onClick={() => navigate({ slot_id: null })}
                className={cn(
                  'font-medium truncate max-w-[160px]',
                  slotId
                    ? 'text-lhc-primary hover:underline'
                    : 'text-lhc-text-main cursor-default',
                )}
              >
                {doctorName ?? 'Doctor'}
              </button>
            </>
          )}

          {slotId && (
            <>
              <ChevronRight className="w-3.5 h-3.5 text-lhc-text-muted/60 flex-shrink-0" />
              <span className="font-medium text-lhc-text-main">Confirm</span>
            </>
          )}
        </nav>
      )}

      {/* ── Content ──────────────────────────────────────────────────────────── */}
      {subTab === 'booked' && (
        <AppointmentsList userId={userId} />
      )}

      {subTab === 'book' && !clinicId && (
        <AppointmentBooking
          userId={userId}
          onClinicSelect={(id, name) => enterBookingFlow(id, name)}
        />
      )}

      {subTab === 'book' && clinicId && (
        <DoctorBooking
          userId={userId}
          clinicId={clinicId}
          clinicName={clinicName ?? undefined}
          doctorId={doctorId ?? undefined}
          slotId={slotId ?? undefined}
          onSelectDoctor={(id, name) => navigate({ doctor_id: id, doctor_name: name, slot_id: null })}
          onSelectSlot={(id) => navigate({ slot_id: id ?? null })}
          onBooked={resetToBooked}
        />
      )}
    </div>
  )
}
