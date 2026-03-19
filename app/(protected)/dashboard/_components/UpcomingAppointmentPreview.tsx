'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { fmtDate } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Calendar, Clock, Stethoscope, ChevronRight } from 'lucide-react'

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
  const { data: appointment, isLoading } = useQuery({
    queryKey: ['upcoming-appointment', userId],
    queryFn: async (): Promise<UpcomingAppointment | null> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = createClient() as any
      const today = new Date().toISOString().split('T')[0]

      const [{ data: standard }, { data: centaur }, { data: custom }] = await Promise.all([
        // bookings: join clinic name directly to avoid a separate round-trip
        db
          .from('bookings')
          .select('id, status, appointment_date, start_time, clinic_id, doctor_name, service_name, clinics_public!clinic_id(name)')
          .eq('patient_id', userId)
          .gte('appointment_date', today)
          .in('status', ['confirmed', 'pending'])
          .order('appointment_date', { ascending: true })
          .order('start_time', { ascending: true })
          .limit(1),

        // centaur_bookings: patient column is local_patient_id
        db
          .from('centaur_bookings')
          .select('id, booking_status, clinic_id, created_at')
          .eq('local_patient_id', userId)
          .order('created_at', { ascending: false })
          .limit(1),

        // custom_api_bookings
        db
          .from('custom_api_bookings')
          .select('id, booking_status, clinic_id, appointment_date, appointment_time, notes')
          .eq('patient_id', userId)
          .gte('appointment_date', today)
          .eq('booking_status', 'confirmed')
          .order('appointment_date', { ascending: true })
          .limit(1),
      ])

      // Batch-fetch clinic names for centaur/custom (no FK join available)
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

      // Sort by date, then time — show the soonest
      candidates.sort((a, b) => {
        const d = a.date.localeCompare(b.date)
        return d !== 0 ? d : a.time.localeCompare(b.time)
      })

      return candidates[0]
    },
    staleTime: 5 * 60_000,   // 5 min — appointment data changes infrequently
    gcTime: 10 * 60_000,    // keep in cache for 10 min after component unmounts
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

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <p className="font-medium text-sm text-lhc-text-main">{appointment.clinicName}</p>
          <Badge variant={appointment.status === 'confirmed' ? 'success' : 'warning'} className="text-xs">
            {appointment.status}
          </Badge>
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
      </div>
      <Button size="sm" variant="outline" onClick={onViewAll} className="w-full flex items-center gap-1">
        View All <ChevronRight className="w-3 h-3" />
      </Button>
    </div>
  )
}
