import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

export type UnavailabilityType = 'vacation' | 'sick_leave' | 'emergency' | 'personal' | 'other'

export interface UnavailabilityPeriod {
  id: string
  doctor_id: string
  start_date: string
  end_date: string
  reason: string | null
  unavailability_type: UnavailabilityType
  created_by: string | null
  created_at: string
}

export interface AddUnavailabilityData {
  doctorId: string
  startDate: string
  endDate: string
  reason?: string
  unavailabilityType: UnavailabilityType
}

export function useDoctorUnavailability(doctorId: string | null) {
  const queryClient = useQueryClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any

  const unavailabilityQuery = useQuery({
    queryKey: ['doctor-unavailability', doctorId],
    queryFn: async (): Promise<UnavailabilityPeriod[]> => {
      if (!doctorId) return []
      const { data, error } = await supabase
        .from('doctor_unavailability')
        .select('*')
        .eq('doctor_id', doctorId)
        .order('start_date', { ascending: true })
      if (error) throw error
      return data ?? []
    },
    enabled: !!doctorId,
  })

  const addUnavailability = useMutation({
    mutationFn: async (data: AddUnavailabilityData) => {
      // Insert unavailability record
      const { data: record, error: insertError } = await supabase
        .from('doctor_unavailability')
        .insert({
          doctor_id: data.doctorId,
          start_date: data.startDate,
          end_date: data.endDate,
          reason: data.reason ?? null,
          unavailability_type: data.unavailabilityType,
        })
        .select()
        .single()

      if (insertError) throw insertError

      // Soft-delete all unbooked slots in the date range
      const { data: slots } = await supabase
        .from('appointments')
        .select('id, current_bookings')
        .eq('doctor_id', data.doctorId)
        .is('deleted_at', null)
        .gte('appointment_date', data.startDate)
        .lte('appointment_date', data.endDate)

      const unbooked = (slots ?? []).filter((s: { current_bookings: number }) => (s.current_bookings ?? 0) === 0)

      if (unbooked.length > 0) {
        await supabase
          .from('appointments')
          .update({
            deleted_at: new Date().toISOString(),
            deletion_reason: `Doctor unavailable: ${data.unavailabilityType}`,
          })
          .in(
            'id',
            unbooked.map((s: { id: string }) => s.id),
          )
      }

      await supabase.rpc('log_audit_event', {
        p_action: 'add_unavailability',
        p_entity_id: record.id,
        p_details: { doctor_id: data.doctorId, start: data.startDate, end: data.endDate },
      })

      return record
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctor-unavailability', doctorId] })
      queryClient.invalidateQueries({ queryKey: ['doctor-slots', doctorId] })
      toast.success('Unavailability period added and affected slots cleared.')
    },
    onError: () => toast.error('Failed to add unavailability.'),
  })

  const removeUnavailability = useMutation({
    mutationFn: async (unavailabilityId: string) => {
      // Fetch the record to get date range
      const { data: record } = await supabase
        .from('doctor_unavailability')
        .select('start_date, end_date, doctor_id')
        .eq('id', unavailabilityId)
        .single()

      if (!record) throw new Error('Record not found.')

      // Find soft-deleted slots that match the deletion reason pattern
      const { data: deletedSlots } = await supabase
        .from('appointments')
        .select('id, current_bookings')
        .eq('doctor_id', record.doctor_id)
        .not('deleted_at', 'is', null)
        .gte('appointment_date', record.start_date)
        .lte('appointment_date', record.end_date)
        .like('deletion_reason', 'Doctor unavailable%')

      // Restore unbooked slots
      const restoreable = (deletedSlots ?? []).filter(
        (s: { current_bookings: number }) => (s.current_bookings ?? 0) === 0,
      )

      if (restoreable.length > 0) {
        await supabase
          .from('appointments')
          .update({ deleted_at: null, deleted_by: null, deletion_reason: null })
          .in(
            'id',
            restoreable.map((s: { id: string }) => s.id),
          )
      }

      // Delete the unavailability record
      const { error } = await supabase
        .from('doctor_unavailability')
        .delete()
        .eq('id', unavailabilityId)

      if (error) throw error

      return { restored: restoreable.length }
    },
    onSuccess: ({ restored }) => {
      queryClient.invalidateQueries({ queryKey: ['doctor-unavailability', doctorId] })
      queryClient.invalidateQueries({ queryKey: ['doctor-slots', doctorId] })
      toast.success(`Unavailability removed and ${restored} slot(s) restored.`)
    },
    onError: () => toast.error('Failed to remove unavailability.'),
  })

  function checkDateAvailability(date: string): boolean {
    const periods = unavailabilityQuery.data ?? []
    return !periods.some((p) => p.start_date <= date && p.end_date >= date)
  }

  function getUnavailableDates(range: { start: string; end: string }): UnavailabilityPeriod[] {
    const periods = unavailabilityQuery.data ?? []
    return periods.filter((p) => p.start_date <= range.end && p.end_date >= range.start)
  }

  return {
    unavailabilityPeriods: unavailabilityQuery.data ?? [],
    unavailabilityLoading: unavailabilityQuery.isLoading,
    addUnavailability,
    removeUnavailability,
    checkDateAvailability,
    getUnavailableDates,
  }
}
