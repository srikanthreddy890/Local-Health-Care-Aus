'use client'

/**
 * BookingFlow — main orchestrator for the public booking funnel.
 *
 * URL-param-driven wizard:
 *   Step 1 (no clinic_id)                              : Search & select a clinic
 *   Step 2 (clinic_id, no doctor_id)                   : Pick a doctor
 *   Step 3 (clinic_id + doctor_id, no service_id)      : Pick a service
 *   Step 4 (clinic_id + doctor_id + service_id, no slot_id) : Pick a date & time
 *   Step 5 (all IDs present + authenticated)           : Confirm booking
 */

import { useCallback, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Building2, Stethoscope, ClipboardList } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { BookingProvider, useBookingContext } from './BookingContext'
import BookingStepIndicator from './BookingStepIndicator'
import BookingSidebar from './BookingSidebar'
import ClinicSearchStep from './ClinicSearchStep'
import DoctorSelectStep from './DoctorSelectStep'
import ServiceSelectStep from './ServiceSelectStep'
import SlotSelectStep from './SlotSelectStep'
import BookingConfirmStep from './BookingConfirmStep'

interface Props {
  initialType: string
  initialPostcode: string
  initialDate: string
  initialService?: string
  clinicId?: string
  doctorId?: string
  serviceId?: string
  slotId?: string
}

export default function BookingFlow(props: Props) {
  return (
    <BookingProvider>
      <BookingFlowInner {...props} />
    </BookingProvider>
  )
}

function BookingFlowInner({
  initialType,
  initialPostcode,
  initialDate,
  initialService,
  clinicId,
  doctorId,
  serviceId,
  slotId,
}: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [userId, setUserId] = useState<string | null>(null)
  const [authChecked, setAuthChecked] = useState(false)

  // Shared booking context — eliminates duplicate fetches
  const { data: bookingData, ensureClinic, ensureDoctor, ensureService, ensureSlot } = useBookingContext()

  // Check auth status on mount
  useEffect(() => {
    createClient()
      .auth.getUser()
      .then(({ data }) => {
        setUserId(data.user?.id ?? null)
        setAuthChecked(true)
      })
  }, [])

  // Load data into shared context (single fetch, used by sidebar + mobile summary)
  useEffect(() => { if (clinicId) ensureClinic(clinicId) }, [clinicId, ensureClinic])
  useEffect(() => { if (doctorId) ensureDoctor(doctorId) }, [doctorId, ensureDoctor])
  useEffect(() => { if (serviceId) ensureService(serviceId) }, [serviceId, ensureService])
  useEffect(() => { if (slotId) ensureSlot(slotId) }, [slotId, ensureSlot])

  // Derive display names from context (no extra queries)
  const clinicName = bookingData.clinic?.name ?? null
  const doctorName = bookingData.doctor ? `Dr. ${bookingData.doctor.first_name} ${bookingData.doctor.last_name}` : null
  const serviceName = bookingData.service?.name ?? null

  // Navigate by updating URL params
  const navigate = useCallback(
    (updates: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams.toString())
      for (const [key, value] of Object.entries(updates)) {
        if (value === undefined) {
          params.delete(key)
        } else {
          params.set(key, value)
        }
      }
      router.push(`/book?${params.toString()}`)
    },
    [router, searchParams],
  )

  // Determine current step
  const step = !clinicId ? 1 : !doctorId ? 2 : !serviceId ? 3 : !slotId ? 4 : 5

  // Auth gate: when slot is selected but user is not authenticated, redirect to auth
  useEffect(() => {
    if (step === 5 && authChecked && !userId) {
      const returnUrl = `/book?${searchParams.toString()}`
      router.push(`/auth?next=${encodeURIComponent(returnUrl)}`)
    }
  }, [step, authChecked, userId, searchParams, router])

  // Selection handlers
  const onSelectClinic = (id: string) => {
    navigate({
      clinic_id: id,
      // Clear downstream selections
      doctor_id: undefined,
      service_id: undefined,
      slot_id: undefined,
    })
  }

  const onSelectDoctor = (id: string) => {
    navigate({
      doctor_id: id,
      // Clear downstream
      service_id: undefined,
      slot_id: undefined,
    })
  }

  const onSelectService = (id: string) => {
    navigate({
      service_id: id,
      slot_id: undefined,
    })
  }

  const onSelectSlot = (id: string | null) => {
    navigate({
      slot_id: id ?? undefined,
    })
  }

  const onBooked = () => {
    router.push('/dashboard?tab=appointments')
  }

  // Go back to a specific step
  const onChangeStep = (targetStep: number) => {
    if (targetStep <= 1) {
      navigate({
        clinic_id: undefined,
        doctor_id: undefined,
        service_id: undefined,
        slot_id: undefined,
      })
    } else if (targetStep <= 2) {
      navigate({
        doctor_id: undefined,
        service_id: undefined,
        slot_id: undefined,
      })
    } else if (targetStep <= 3) {
      navigate({
        service_id: undefined,
        slot_id: undefined,
      })
    } else if (targetStep <= 4) {
      navigate({ slot_id: undefined })
    }
  }

  // If redirecting to auth, show nothing
  if (step === 5 && !authChecked) {
    return (
      <main className="flex-1 bg-lhc-background">
        <div className="container mx-auto max-w-6xl px-4 py-12">
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-lhc-primary border-t-transparent rounded-full animate-spin" />
          </div>
        </div>
      </main>
    )
  }

  if (step === 5 && !userId) {
    return null // Redirecting to auth
  }

  return (
    <main className="flex-1 bg-lhc-background">
      <div className="container mx-auto max-w-6xl px-4 py-6">
        {/* Step indicator */}
        <div className="bg-white rounded-2xl border border-lhc-border px-6 py-5 shadow-sm mb-6">
          <BookingStepIndicator currentStep={step} />
        </div>

        {/* Mobile selections summary — visible only below lg breakpoint */}
        {step >= 2 && (clinicName || doctorName || serviceName) && (
          <div className="lg:hidden bg-white rounded-xl border border-lhc-border px-4 py-3 mb-4 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              {clinicName && (
                <button
                  onClick={() => onChangeStep(1)}
                  className="inline-flex items-center gap-1.5 text-xs font-medium bg-lhc-primary/8 text-lhc-primary border border-lhc-primary/20 rounded-full px-3 py-1"
                >
                  <Building2 className="w-3 h-3" />
                  <span className="max-w-[120px] truncate">{clinicName}</span>
                </button>
              )}
              {doctorName && (
                <button
                  onClick={() => onChangeStep(2)}
                  className="inline-flex items-center gap-1.5 text-xs font-medium bg-lhc-primary/8 text-lhc-primary border border-lhc-primary/20 rounded-full px-3 py-1"
                >
                  <Stethoscope className="w-3 h-3" />
                  <span className="max-w-[120px] truncate">{doctorName}</span>
                </button>
              )}
              {serviceName && (
                <button
                  onClick={() => onChangeStep(3)}
                  className="inline-flex items-center gap-1.5 text-xs font-medium bg-lhc-primary/8 text-lhc-primary border border-lhc-primary/20 rounded-full px-3 py-1"
                >
                  <ClipboardList className="w-3 h-3" />
                  <span className="max-w-[120px] truncate">{serviceName}</span>
                </button>
              )}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Step content */}
          <div className="lg:col-span-2">
            {step === 1 && (
              <ClinicSearchStep
                initialType={initialType}
                initialPostcode={initialPostcode}
                initialService={initialService}
                onSelect={onSelectClinic}
                onSelectDoctor={(cId, dId) => {
                  navigate({
                    clinic_id: cId,
                    doctor_id: dId,
                    service_id: undefined,
                    slot_id: undefined,
                  })
                }}
              />
            )}

            {step === 2 && clinicId && (
              <DoctorSelectStep
                clinicId={clinicId}
                onSelect={onSelectDoctor}
              />
            )}

            {step === 3 && clinicId && doctorId && (
              <ServiceSelectStep
                clinicId={clinicId}
                doctorId={doctorId}
                onSelect={onSelectService}
              />
            )}

            {step === 4 && clinicId && doctorId && serviceId && (
              <SlotSelectStep
                clinicId={clinicId}
                doctorId={doctorId}
                serviceId={serviceId}
                initialDate={initialDate}
                onSelect={onSelectSlot}
              />
            )}

            {step === 5 && clinicId && doctorId && serviceId && slotId && userId && (
              <BookingConfirmStep
                clinicId={clinicId}
                doctorId={doctorId}
                serviceId={serviceId}
                slotId={slotId}
                userId={userId}
                onBooked={onBooked}
                onSlotUnavailable={() => onSelectSlot(null)}
              />
            )}
          </div>

          {/* Right: Sidebar */}
          <div className="hidden lg:block">
            <BookingSidebar
              clinicId={clinicId}
              doctorId={doctorId}
              serviceId={serviceId}
              slotId={slotId}
              currentStep={step}
              onChangeStep={onChangeStep}
            />
          </div>
        </div>
      </div>
    </main>
  )
}
