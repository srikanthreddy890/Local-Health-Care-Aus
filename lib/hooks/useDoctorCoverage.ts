import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

export interface DoctorCoverage {
  days_coverage: number
  total_slots: number
  booked_slots: number
  latest_appointment_date: string | null
  is_api_integrated: boolean
}

export function useDoctorCoverage(doctorId: string | null) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any

  return useQuery({
    queryKey: ['doctor-coverage', doctorId],
    queryFn: async (): Promise<DoctorCoverage> => {
      if (!doctorId) {
        return { days_coverage: 0, total_slots: 0, booked_slots: 0, latest_appointment_date: null, is_api_integrated: false }
      }

      // Check if clinic uses external API
      const { data: doctor } = await supabase
        .from('doctors')
        .select('clinic_id, clinics(centaur_api_enabled, d4w_api_enabled)')
        .eq('id', doctorId)
        .single()

      const clinicData = doctor?.clinics as { centaur_api_enabled?: boolean; d4w_api_enabled?: boolean } | null
      const isApiIntegrated = !!(clinicData?.centaur_api_enabled || clinicData?.d4w_api_enabled)

      if (isApiIntegrated) {
        return { days_coverage: 0, total_slots: 0, booked_slots: 0, latest_appointment_date: null, is_api_integrated: true }
      }

      const today = new Date().toISOString().split('T')[0]

      const { data: slots } = await supabase
        .from('appointments')
        .select('appointment_date, current_bookings, max_bookings')
        .eq('doctor_id', doctorId)
        .is('deleted_at', null)
        .gte('appointment_date', today)
        .order('appointment_date', { ascending: false })

      if (!slots || slots.length === 0) {
        return { days_coverage: 0, total_slots: 0, booked_slots: 0, latest_appointment_date: null, is_api_integrated: false }
      }

      const latestDate = slots[0]?.appointment_date as string | null
      const daysCoverage = latestDate
        ? Math.max(1, Math.ceil((new Date(latestDate).getTime() - new Date(today).getTime()) / (1000 * 60 * 60 * 24)) + 1)
        : 0

      const totalSlots = slots.length
      const bookedSlots = slots.filter(
        (s: { current_bookings: number; max_bookings: number }) => s.current_bookings >= s.max_bookings,
      ).length

      return {
        days_coverage: daysCoverage,
        total_slots: totalSlots,
        booked_slots: bookedSlots,
        latest_appointment_date: latestDate,
        is_api_integrated: false,
      }
    },
    enabled: !!doctorId,
    staleTime: 30_000,
  })
}
