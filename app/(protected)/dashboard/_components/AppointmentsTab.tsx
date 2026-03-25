'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ChevronRight, Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import AppointmentBooking from './appointments/AppointmentBooking'
import DoctorBooking from './appointments/DoctorBooking'
import AppointmentsList from './appointments/AppointmentsList'

interface Props {
  userId: string
}

export default function AppointmentsTab({ userId }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()

  // URL-driven step state
  const subTab     = searchParams.get('appt')        ?? 'book'
  const clinicId   = searchParams.get('clinic_id')   ?? null
  const clinicName = searchParams.get('clinic_name') ?? null
  const doctorId    = searchParams.get('doctor_id')    ?? null
  const doctorName  = searchParams.get('doctor_name')  ?? null
  const serviceId   = searchParams.get('service_id')   ?? null
  const serviceName = searchParams.get('service_name') ?? null
  const slotId      = searchParams.get('slot_id')      ?? null

  function navigate(updates: Record<string, string | null>) {
    const p = new URLSearchParams(searchParams.toString())
    p.set('tab', 'appointments')
    for (const [k, v] of Object.entries(updates)) {
      if (v === null) p.delete(k)
      else p.set(k, v)
    }
    router.replace(`?${p.toString()}`)
  }

  // Check if the selected clinic uses custom API and redirect to /book if so
  const checkCustomApiAndNavigate = useCallback(async (cId: string, cName: string) => {
    try {
      const supabase = createClient()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any)
        .from('clinics_public')
        .select('custom_api_enabled, custom_api_config_id')
        .eq('id', cId)
        .single()

      if (data?.custom_api_enabled && data?.custom_api_config_id) {
        // Custom API clinic — redirect to /book which handles the full custom API flow
        router.push(`/book?clinic_id=${cId}`)
        return
      }
    } catch {
      // Fall through to standard flow on error
    }

    // Standard clinic — use the in-dashboard booking flow
    const p = new URLSearchParams()
    p.set('tab', 'appointments')
    p.set('appt', 'book')
    p.set('clinic_id', cId)
    p.set('clinic_name', cName)
    router.push(`?${p.toString()}`)
  }, [router])

  function enterBookingFlow(clinicId: string, clinicName: string) {
    checkCustomApiAndNavigate(clinicId, clinicName)
  }

  const resetToBook = () =>
    navigate({ appt: 'book', clinic_id: null, clinic_name: null, doctor_id: null, doctor_name: null, service_id: null, service_name: null, slot_id: null })

  const resetToBooked = () =>
    navigate({ appt: 'booked', clinic_id: null, clinic_name: null, doctor_id: null, doctor_name: null, service_id: null, service_name: null, slot_id: null })

  const inBookingFlow = subTab === 'book' && !!clinicId

  return (
    <div>
      {/* ── Page header ────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-xl sm:text-[22px] font-bold text-lhc-text-main">Appointments</h2>
          <p className="text-sm text-lhc-text-muted mt-0.5">
            Manage your bookings and find new clinics
          </p>
        </div>
      </div>

      {/* ── Pill-style sub-tab toggle ──────────────────────────────────────── */}
      <div className="flex items-center gap-3 mb-5">
        <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5 inline-flex gap-0.5">
          <button
            onClick={resetToBook}
            className={cn(
              'px-4 py-1.5 rounded-md text-sm font-medium whitespace-nowrap transition-all duration-200',
              subTab === 'book'
                ? 'bg-white dark:bg-lhc-surface shadow-sm text-lhc-text-main'
                : 'bg-transparent text-lhc-text-muted hover:text-lhc-text-main',
            )}
          >
            Book Appointment
          </button>
          <button
            onClick={resetToBooked}
            className={cn(
              'px-4 py-1.5 rounded-md text-sm font-medium whitespace-nowrap transition-all duration-200',
              subTab === 'booked'
                ? 'bg-white dark:bg-lhc-surface shadow-sm text-lhc-text-main'
                : 'bg-transparent text-lhc-text-muted hover:text-lhc-text-main',
            )}
          >
            My Appointments
          </button>
        </div>
      </div>

      {/* ── Breadcrumb (shown when inside the booking flow) ─────────────────── */}
      {inBookingFlow && (
        <nav aria-label="Booking steps" className="flex items-center gap-1.5 text-sm mb-6 flex-wrap bg-white dark:bg-lhc-surface border border-lhc-border rounded-xl px-4 py-3">
          <button
            onClick={resetToBook}
            className="text-lhc-primary hover:underline font-medium"
          >
            Find a Clinic
          </button>

          <ChevronRight className="w-3.5 h-3.5 text-lhc-text-muted/60 flex-shrink-0" />
          <button
            onClick={() => navigate({ doctor_id: null, doctor_name: null, service_id: null, service_name: null, slot_id: null })}
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
                onClick={() => navigate({ service_id: null, service_name: null, slot_id: null })}
                className={cn(
                  'font-medium truncate max-w-[160px]',
                  serviceId
                    ? 'text-lhc-primary hover:underline'
                    : 'text-lhc-text-main cursor-default',
                )}
              >
                {doctorName ?? 'Doctor'}
              </button>
            </>
          )}

          {serviceId && (
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
                {serviceName ?? 'Service'}
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
          serviceId={serviceId ?? undefined}
          onSelectDoctor={(id, name) => navigate({ doctor_id: id, doctor_name: name, service_id: null, service_name: null, slot_id: null })}
          onSelectService={(id, name) => navigate({ service_id: id, service_name: name, slot_id: null })}
          onSelectSlot={(id) => navigate({ slot_id: id ?? null })}
          onBooked={resetToBooked}
        />
      )}
    </div>
  )
}
