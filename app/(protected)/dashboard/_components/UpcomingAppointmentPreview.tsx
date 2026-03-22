'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { fmtDate } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Calendar, Clock, Stethoscope, ChevronRight, RotateCcw, X as XIcon } from 'lucide-react'

interface Props {
  userId: string
  onViewAll: () => void
  onBookNew: () => void
}

interface UpcomingAppointment {
  id: string
  source: 'standard' | 'centaur' | 'custom_api'
  clinicName: string
  doctorName: string
  date: string
  time: string
  serviceName: string
  status: string
}

export default function UpcomingAppointmentPreview({ userId, onViewAll, onBookNew }: Props) {
  const [showTooltip, setShowTooltip] = useState(false)

  const { data: appointment, isLoading } = useQuery({
    queryKey: ['upcoming-appointment', userId],
    queryFn: async (): Promise<UpcomingAppointment | null> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = createClient() as any
      const today = new Date().toISOString().split('T')[0]

      const [{ data: standard }, { data: centaur }, { data: custom }] = await Promise.all([
        db
          .from('bookings')
          .select('id, status, appointment_date, start_time, clinic_id, doctor_name, service_name, clinics_public!clinic_id(name)')
          .eq('patient_id', userId)
          .gte('appointment_date', today)
          .in('status', ['confirmed', 'pending'])
          .order('appointment_date', { ascending: true })
          .order('start_time', { ascending: true })
          .limit(1),

        db
          .from('centaur_bookings')
          .select('id, booking_status, clinic_id, created_at')
          .eq('local_patient_id', userId)
          .order('created_at', { ascending: false })
          .limit(1),

        db
          .from('custom_api_bookings')
          .select('id, booking_status, clinic_id, appointment_date, appointment_time, notes')
          .eq('patient_id', userId)
          .gte('appointment_date', today)
          .eq('booking_status', 'confirmed')
          .order('appointment_date', { ascending: true })
          .limit(1),
      ])

      const extraClinicIds = [centaur?.[0]?.clinic_id, custom?.[0]?.clinic_id].filter(Boolean) as string[]
      const clinicNameMap: Record<string, string> = {}
      if (extraClinicIds.length > 0) {
        const { data: clinics } = await db
          .from('clinics_public')
          .select('id, name')
          .in('id', extraClinicIds)
        if (clinics) {
          for (const c of clinics) clinicNameMap[c.id] = c.name
        }
      }

      const candidates: UpcomingAppointment[] = []

      if (standard?.[0]) {
        const b = standard[0]
        candidates.push({
          id: b.id,
          source: 'standard',
          clinicName: (b.clinics_public as { name: string } | null)?.name ?? 'Unknown Clinic',
          doctorName: b.doctor_name ?? '',
          date: b.appointment_date,
          time: b.start_time ?? '',
          serviceName: b.service_name ?? '',
          status: b.status,
        })
      }

      if (centaur?.[0]) {
        const b = centaur[0]
        candidates.push({
          id: b.id,
          source: 'centaur',
          clinicName: (b.clinic_id && clinicNameMap[b.clinic_id]) || 'Unknown Clinic',
          doctorName: '',
          date: b.created_at?.split('T')[0] ?? today,
          time: '',
          serviceName: '',
          status: b.booking_status ?? 'pending',
        })
      }

      if (custom?.[0]) {
        const b = custom[0]
        candidates.push({
          id: b.id,
          source: 'custom_api',
          clinicName: (b.clinic_id && clinicNameMap[b.clinic_id]) || 'Unknown Clinic',
          doctorName: '',
          date: b.appointment_date ?? today,
          time: b.appointment_time ?? '',
          serviceName: b.notes ?? '',
          status: b.booking_status ?? 'pending',
        })
      }

      if (!candidates.length) return null

      candidates.sort((a, b) => {
        const d = a.date.localeCompare(b.date)
        return d !== 0 ? d : a.time.localeCompare(b.time)
      })

      return candidates[0]
    },
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
  })

  if (isLoading) {
    return (
      <div className="space-y-2 animate-pulse">
        <div className="h-4 bg-lhc-border rounded w-3/4" />
        <div className="h-4 bg-lhc-border rounded w-1/2" />
        <div className="h-4 bg-lhc-border rounded w-2/3" />
      </div>
    )
  }

  if (!appointment) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-lhc-text-muted">No upcoming appointments.</p>
        <Button size="sm" onClick={onBookNew} className="w-full">
          Book Appointment
        </Button>
      </div>
    )
  }

  const formattedDate = fmtDate(appointment.date)
  const isPending = appointment.status === 'pending'

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <p className="font-medium text-sm text-lhc-text-main">{appointment.clinicName}</p>
          {/* Tooltip-enabled status badge */}
          <div className="relative">
            <button
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
              onClick={() => setShowTooltip((v) => !v)}
              className="cursor-default"
            >
              {isPending ? (
                <span className="inline-flex items-center text-xs font-semibold bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-300 px-2 py-0.5 rounded-full">
                  pending
                </span>
              ) : (
                <span className="inline-flex items-center text-xs font-semibold bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-300 px-2 py-0.5 rounded-full">
                  {appointment.status}
                </span>
              )}
            </button>
            {showTooltip && isPending && (
              <div className="absolute right-0 top-full mt-1 w-56 bg-lhc-surface border border-lhc-border rounded-lg shadow-lg p-3 z-20 text-xs text-lhc-text-muted">
                Awaiting clinic confirmation. You&apos;ll be notified once confirmed.
              </div>
            )}
          </div>
        </div>
        {appointment.doctorName && (
          <div className="flex items-center gap-1.5 text-xs text-lhc-text-muted">
            <Stethoscope className="w-3 h-3 shrink-0" />
            <span>{appointment.doctorName}</span>
          </div>
        )}
        <div className="flex items-center gap-1.5 text-xs text-lhc-text-muted">
          <Calendar className="w-3 h-3 shrink-0" />
          <span>{formattedDate}</span>
        </div>
        {appointment.time && (
          <div className="flex items-center gap-1.5 text-xs text-lhc-text-muted">
            <Clock className="w-3 h-3 shrink-0" />
            <span>{appointment.time}</span>
          </div>
        )}
        {appointment.serviceName && (
          <p className="text-xs text-lhc-text-muted truncate">{appointment.serviceName}</p>
        )}

        {/* Inline micro-actions */}
        <div className="flex items-center gap-3 pt-1">
          <button
            onClick={onBookNew}
            className="text-xs font-medium text-lhc-primary hover:text-lhc-primary-hover border border-lhc-primary/30 hover:border-lhc-primary px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1"
          >
            <RotateCcw className="w-3 h-3" />
            Reschedule
          </button>
          <button
            onClick={onViewAll}
            className="text-xs font-medium text-red-500 hover:text-red-600 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>

      <Button size="sm" variant="outline" onClick={onViewAll} className="w-full flex items-center gap-1">
        View All <ChevronRight className="w-3 h-3" />
      </Button>
    </div>
  )
}
