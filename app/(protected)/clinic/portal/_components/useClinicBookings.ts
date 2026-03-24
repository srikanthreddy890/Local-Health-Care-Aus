'use client'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

export interface UnifiedBooking {
  id: string
  reference: string
  patientName: string
  patientPhone: string | null
  patientEmail: string | null
  patientId?: string
  doctorName: string
  doctorId?: string
  appointmentDate: string
  appointmentTime: string
  status: string
  serviceName: string
  notes: string
  clinicNotes: string
  cancellationReason: string
  createdAt: string
  type: 'standard' | 'centaur' | 'custom_api'
  rawData: Record<string, unknown>
  attendanceStatus: string | null
  servicePerformed: string | null
  pointsEarned: number | null
  shareConsent?: { mobile: boolean; email: boolean }
}

function formatTime12h(time: string | null | undefined): string {
  if (!time) return ''
  const [h, m] = time.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 || 12
  return `${hour}:${String(m).padStart(2, '0')} ${period}`
}

export function useClinicBookings(clinicId: string | null) {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['clinic-bookings-unified', clinicId],
    queryFn: async (): Promise<UnifiedBooking[]> => {
      if (!clinicId) return []
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabase = createClient() as any

      const [
        { data: rawBookings },
        { data: rawCentaur },
        { data: rawCustom },
        { data: doctors },
        { data: centaurMappings },
        { data: customApiDocs },
      ] = await Promise.all([
        supabase
          .from('bookings')
          .select(
            'id, booking_reference, patient_id, patient_first_name, patient_last_name, ' +
            'appointment_date, start_time, status, doctor_name, service_name, ' +
            'patient_notes, clinic_notes, created_at, share_mobile, share_email, ' +
            'patient_mobile, patient_email, attendance_status, loyalty_points_earned, ' +
            'cancellation_reason, appointments!appointment_id(doctor_id)'
          )
          .eq('clinic_id', clinicId)
          .order('created_at', { ascending: false }),

        supabase
          .from('centaur_bookings')
          .select(
            'id, centaur_booking_id, centaur_doctor_id, local_patient_id, appointment_date, appointment_time, ' +
            'patient_first_name, patient_last_name, patient_email, patient_mobile, ' +
            'booking_status, booking_notes, attendance_status, service_performed, ' +
            'points_earned, created_at'
          )
          .eq('clinic_id', clinicId)
          .order('created_at', { ascending: false }),

        supabase
          .from('custom_api_bookings')
          .select(
            'id, external_booking_id, external_doctor_id, patient_id, appointment_date, appointment_time, ' +
            'patient_first_name, patient_last_name, patient_email, patient_mobile, ' +
            'booking_status, booking_notes, attendance_status, service_performed, ' +
            'service_points, service_name, doctor_name, created_at'
          )
          .eq('clinic_id', clinicId)
          .order('created_at', { ascending: false }),

        supabase
          .from('doctors')
          .select('id, first_name, last_name, specialty')
          .eq('clinic_id', clinicId)
          .eq('is_active', true),

        supabase
          .from('centaur_doctor_mapping')
          .select('centaur_doctor_id, local_doctor_id')
          .eq('clinic_id', clinicId),

        supabase
          .from('custom_api_doctors')
          .select('external_doctor_id, doctor_name, local_doctor_id')
          .eq('clinic_id', clinicId),
      ])

      // Build lookup maps
      const doctorMap = new Map<string, { firstName: string; lastName: string }>()
      for (const d of (doctors ?? []) as Record<string, unknown>[]) {
        doctorMap.set(d.id as string, {
          firstName: d.first_name as string,
          lastName: d.last_name as string,
        })
      }

      const centaurDoctorMap = new Map<number, string>() // centaurDoctorId → local_doctor_id
      for (const m of (centaurMappings ?? []) as Record<string, unknown>[]) {
        centaurDoctorMap.set(m.centaur_doctor_id as number, m.local_doctor_id as string)
      }

      const customApiDoctorNameMap = new Map<string, string>() // external_doctor_id → doctor_name
      const customApiLocalDoctorMap = new Map<string, string>() // external_doctor_id → local_doctor_id
      for (const d of (customApiDocs ?? []) as Record<string, unknown>[]) {
        customApiDoctorNameMap.set(d.external_doctor_id as string, d.doctor_name as string)
        if (d.local_doctor_id) {
          customApiLocalDoctorMap.set(d.external_doctor_id as string, d.local_doctor_id as string)
        }
      }

      // Standard bookings
      const standardBookings: UnifiedBooking[] = ((rawBookings ?? []) as Record<string, unknown>[]).map((b) => {
        const appt = b.appointments as { doctor_id?: string } | null
        const doctorId = appt?.doctor_id ?? undefined
        const doctorEntry = doctorId ? doctorMap.get(doctorId) : undefined
        const doctorName = doctorEntry
          ? `${doctorEntry.firstName} ${doctorEntry.lastName}`
          : ((b.doctor_name as string) ?? 'Unknown')

        // Strip PII from rawData
        const { patient_email: _pe, patient_mobile: _pm, appointments: _a, ...safeRaw } = b

        return {
          id: b.id as string,
          reference: (b.booking_reference as string) ?? '',
          patientName: [b.patient_first_name, b.patient_last_name].filter(Boolean).join(' ') || 'Unknown',
          patientPhone: (b.share_mobile as boolean) ? ((b.patient_mobile as string) ?? null) : null,
          patientEmail: (b.share_email as boolean) ? ((b.patient_email as string) ?? null) : null,
          patientId: (b.patient_id as string) ?? undefined,
          doctorName,
          doctorId,
          appointmentDate: (b.appointment_date as string) ?? '',
          appointmentTime: formatTime12h(b.start_time as string),
          status: (b.status as string) ?? '',
          serviceName: (b.service_name as string) ?? '',
          notes: (b.patient_notes as string) ?? '',
          clinicNotes: (b.clinic_notes as string) ?? '',
          cancellationReason: (b.cancellation_reason as string) ?? '',
          createdAt: (b.created_at as string) ?? '',
          type: 'standard',
          rawData: { ...safeRaw, doctor_id: doctorId },
          attendanceStatus: (b.attendance_status as string) ?? null,
          servicePerformed: null,
          pointsEarned: (b.loyalty_points_earned as number) ?? null,
          shareConsent: {
            mobile: (b.share_mobile as boolean) ?? false,
            email: (b.share_email as boolean) ?? false,
          },
        }
      })

      // Centaur bookings
      const centaurBookings: UnifiedBooking[] = ((rawCentaur ?? []) as Record<string, unknown>[]).map((b) => {
        const centaurDoctorId = b.centaur_doctor_id as number
        const localDoctorId = centaurDoctorMap.get(centaurDoctorId)
        const doctorEntry = localDoctorId ? doctorMap.get(localDoctorId) : undefined
        const doctorName = doctorEntry
          ? `${doctorEntry.firstName} ${doctorEntry.lastName}`
          : `Doctor ID: ${centaurDoctorId}`

        // Strip PII from rawData
        const { patient_email: _pe, patient_mobile: _pm, ...safeRaw } = b

        return {
          id: b.id as string,
          reference: `CENTAUR-${b.centaur_booking_id}`,
          patientName: [b.patient_first_name, b.patient_last_name].filter(Boolean).join(' ') || 'Unknown',
          patientPhone: null,
          patientEmail: null,
          patientId: (b.local_patient_id as string) ?? undefined,
          doctorName,
          doctorId: localDoctorId,
          appointmentDate: (b.appointment_date as string) ?? '',
          appointmentTime: formatTime12h(b.appointment_time as string),
          status: (b.booking_status as string) ?? '',
          serviceName: '',
          notes: (b.booking_notes as string) ?? '',
          clinicNotes: (b.booking_notes as string) ?? '',
          cancellationReason: '',
          createdAt: (b.created_at as string) ?? '',
          type: 'centaur',
          rawData: safeRaw,
          attendanceStatus: (b.attendance_status as string) ?? null,
          servicePerformed: (b.service_performed as string) ?? null,
          pointsEarned: (b.points_earned as number) ?? null,
        }
      })

      // Custom API bookings
      const customBookings: UnifiedBooking[] = ((rawCustom ?? []) as Record<string, unknown>[]).map((b) => {
        const externalDoctorId = (b.external_doctor_id as string) ?? ''
        const localDoctorId = customApiLocalDoctorMap.get(externalDoctorId)
        const doctorEntry = localDoctorId ? doctorMap.get(localDoctorId) : undefined
        const doctorName = doctorEntry
          ? `${doctorEntry.firstName} ${doctorEntry.lastName}`
          : (b.doctor_name as string) ||
            customApiDoctorNameMap.get(externalDoctorId) ||
            `Doctor ID: ${externalDoctorId}`

        // Strip PII from rawData
        const { patient_email: _pe, patient_mobile: _pm, ...safeRaw } = b

        return {
          id: b.id as string,
          reference: (b.external_booking_id as string) ?? '',
          patientName: [b.patient_first_name, b.patient_last_name].filter(Boolean).join(' ') || 'Unknown',
          patientPhone: null,
          patientEmail: null,
          patientId: (b.patient_id as string) ?? undefined,
          doctorName,
          doctorId: localDoctorId ?? (externalDoctorId || undefined),
          appointmentDate: (b.appointment_date as string) ?? '',
          appointmentTime: formatTime12h(b.appointment_time as string),
          status: (b.booking_status as string) ?? '',
          serviceName: (b.service_name as string) ?? '',
          notes: (b.booking_notes as string) ?? '',
          clinicNotes: '',
          cancellationReason: '',
          createdAt: (b.created_at as string) ?? '',
          type: 'custom_api',
          rawData: safeRaw,
          attendanceStatus: (b.attendance_status as string) ?? null,
          servicePerformed: (b.service_performed as string) ?? null,
          pointsEarned: (b.service_points as number) ?? null,
        }
      })

      return [...standardBookings, ...centaurBookings, ...customBookings].sort((a, b) =>
        b.createdAt.localeCompare(a.createdAt)
      )
    },
    enabled: !!clinicId,
  })

  // Cache-only update — the DB write is handled by the caller (saveNote in ClinicBookingsList)
  function updateClinicNotes(bookingId: string, notes: string) {
    queryClient.setQueryData(
      ['clinic-bookings-unified', clinicId],
      (old: UnifiedBooking[] | undefined) =>
        old?.map((b) => (b.id === bookingId ? { ...b, clinicNotes: notes } : b))
    )
  }

  return { ...query, updateClinicNotes }
}
