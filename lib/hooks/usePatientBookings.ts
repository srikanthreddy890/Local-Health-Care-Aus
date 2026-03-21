'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

export interface NormalizedBooking {
  id: string
  source: 'standard' | 'centaur' | 'custom_api'
  clinicId: string | null
  clinicName: string | null
  doctorName: string | null
  serviceName: string | null
  appointmentDate: string | null
  startTime: string | null
  status: string | null
  bookingReference: string | null
  createdAt: string | null
}

export function usePatientBookings(patientId: string | null) {
  return useQuery<NormalizedBooking[]>({
    queryKey: ['admin-patient-bookings', patientId],
    queryFn: async () => {
      if (!patientId) return []
      const supabase = createClient()

      const [standard, centaur, custom] = await Promise.all([
        supabase
          .from('bookings')
          .select('id, clinic_id, doctor_name, service_name, appointment_date, start_time, status, booking_reference, created_at')
          .eq('patient_id', patientId)
          .order('appointment_date', { ascending: false }),
        supabase
          .from('centaur_bookings')
          .select('id, clinic_id, appointment_date, appointment_time, booking_status, created_at, service_performed')
          .eq('local_patient_id', patientId)
          .order('appointment_date', { ascending: false }),
        supabase
          .from('custom_api_bookings')
          .select('id, clinic_id, doctor_name, service_name, appointment_date, appointment_time, booking_status, external_booking_id, created_at')
          .eq('patient_id', patientId)
          .order('appointment_date', { ascending: false }),
      ])

      const results: NormalizedBooking[] = []

      for (const b of standard.data ?? []) {
        results.push({
          id: b.id,
          source: 'standard',
          clinicId: b.clinic_id,
          clinicName: null,
          doctorName: b.doctor_name,
          serviceName: b.service_name,
          appointmentDate: b.appointment_date,
          startTime: b.start_time,
          status: b.status,
          bookingReference: b.booking_reference,
          createdAt: b.created_at,
        })
      }

      for (const b of centaur.data ?? []) {
        results.push({
          id: b.id,
          source: 'centaur',
          clinicId: b.clinic_id,
          clinicName: null,
          doctorName: null,
          serviceName: b.service_performed,
          appointmentDate: b.appointment_date,
          startTime: b.appointment_time,
          status: b.booking_status,
          bookingReference: null,
          createdAt: b.created_at,
        })
      }

      for (const b of custom.data ?? []) {
        results.push({
          id: b.id,
          source: 'custom_api',
          clinicId: b.clinic_id,
          clinicName: null,
          doctorName: b.doctor_name,
          serviceName: b.service_name,
          appointmentDate: b.appointment_date,
          startTime: b.appointment_time,
          status: b.booking_status,
          bookingReference: b.external_booking_id,
          createdAt: b.created_at,
        })
      }

      results.sort((a, b) => {
        const da = a.appointmentDate ?? ''
        const db = b.appointmentDate ?? ''
        return db.localeCompare(da)
      })

      return results
    },
    enabled: !!patientId,
  })
}
