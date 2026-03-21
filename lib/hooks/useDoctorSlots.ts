import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

export interface Slot {
  id: string
  doctor_id: string
  clinic_id: string
  service_id: string | null
  appointment_date: string
  start_time: string
  end_time: string
  status: string
  is_online: boolean
  max_bookings: number
  current_bookings: number
  is_emergency_slot: boolean
  deleted_at: string | null
  deleted_by: string | null
  deletion_reason: string | null
  created_at: string
  clinic?: { name: string } | null
  service?: { name: string; duration_minutes: number; price: number } | null
}

export interface EmergencyTimeSlot {
  startTime: string
  endTime: string
  maxSlots: number
}

export interface AddSlotData {
  doctorId: string
  clinicId: string
  serviceId: string
  appointmentDate: string
  startTime: string
  endTime: string
  isOnline?: boolean
  maxBookings?: number
  isEmergencySlot?: boolean
}

function normalizeTime(t: string): string {
  return t.slice(0, 5) // "HH:mm:ss" → "HH:mm"
}

export function isEmergencyTime(slotStartTime: string, emergencyTimes: EmergencyTimeSlot[]): boolean {
  const normalized = normalizeTime(slotStartTime)
  return emergencyTimes.some((et) => normalizeTime(et.startTime) === normalized)
}

export function useDoctorSlots(doctorId: string | null, dateRange?: { start: string; end: string }) {
  const queryClient = useQueryClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any

  const today = new Date().toISOString().split('T')[0]
  const endDate =
    dateRange?.end ??
    (() => {
      const d = new Date()
      d.setDate(d.getDate() + 30)
      return d.toISOString().split('T')[0]
    })()
  const startDate = dateRange?.start ?? today

  const slotsQuery = useQuery({
    queryKey: ['doctor-slots', doctorId, startDate, endDate],
    queryFn: async (): Promise<Slot[]> => {
      if (!doctorId) return []
      const { data, error } = await supabase
        .from('appointments')
        .select('*, clinic:clinics(name), service:services(name, duration_minutes, price)')
        .eq('doctor_id', doctorId)
        .is('deleted_at', null)
        .gte('appointment_date', startDate)
        .lte('appointment_date', endDate)
        .order('appointment_date', { ascending: true })
        .order('start_time', { ascending: true })
      if (error) throw error
      return data ?? []
    },
    enabled: !!doctorId,
  })

  const emergencyQuery = useQuery({
    queryKey: ['doctor-emergency-slots', doctorId],
    queryFn: async (): Promise<EmergencyTimeSlot[]> => {
      if (!doctorId) return []
      const { data, error } = await supabase
        .from('doctors')
        .select('emergency_time_slots')
        .eq('id', doctorId)
        .single()
      if (error) throw error
      return (data?.emergency_time_slots as EmergencyTimeSlot[]) ?? []
    },
    enabled: !!doctorId,
  })

  const deleteSlot = useMutation({
    mutationFn: async ({ slotId, reason }: { slotId: string; reason?: string }) => {
      const { data: slot } = await supabase
        .from('appointments')
        .select('current_bookings')
        .eq('id', slotId)
        .single()

      if ((slot?.current_bookings ?? 0) > 0) {
        throw new Error('Cannot delete a slot that has bookings.')
      }

      const { error } = await supabase
        .from('appointments')
        .update({
          deleted_at: new Date().toISOString(),
          deletion_reason: reason ?? 'Manually deleted',
        })
        .eq('id', slotId)

      if (error) throw error

      await supabase.rpc('log_audit_event', {
        p_action: 'delete_slot',
        p_entity_id: slotId,
        p_details: { reason: reason ?? 'Manually deleted' },
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctor-slots', doctorId] })
      toast.success('Slot deleted.')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const deleteDateSlots = useMutation({
    mutationFn: async ({ date, reason }: { date: string; reason?: string }) => {
      const { data: slots } = await supabase
        .from('appointments')
        .select('id, current_bookings')
        .eq('doctor_id', doctorId)
        .eq('appointment_date', date)
        .is('deleted_at', null)

      const unbooked = (slots ?? []).filter((s: Slot) => (s.current_bookings ?? 0) === 0)
      const skipped = (slots ?? []).length - unbooked.length

      if (unbooked.length > 0) {
        const ids = unbooked.map((s: Slot) => s.id)
        await supabase
          .from('appointments')
          .update({
            deleted_at: new Date().toISOString(),
            deletion_reason: reason ?? 'Date cleared',
          })
          .in('id', ids)
      }

      return { deleted: unbooked.length, skipped }
    },
    onSuccess: ({ deleted, skipped }) => {
      queryClient.invalidateQueries({ queryKey: ['doctor-slots', doctorId] })
      toast.success(`Deleted ${deleted} slot(s).${skipped > 0 ? ` ${skipped} booked slot(s) skipped.` : ''}`)
    },
    onError: () => toast.error('Failed to delete slots.'),
  })

  const addCustomSlot = useMutation({
    mutationFn: async (data: AddSlotData) => {
      // Service-scoped overlap check
      const { data: existing } = await supabase
        .from('appointments')
        .select('id, start_time, end_time')
        .eq('doctor_id', data.doctorId)
        .eq('appointment_date', data.appointmentDate)
        .eq('service_id', data.serviceId)
        .is('deleted_at', null)

      const overlapping = (existing ?? []).filter((s: Slot) => {
        return s.start_time < data.endTime && s.end_time > data.startTime
      })

      if (overlapping.length > 0) {
        throw new Error('This time slot overlaps with an existing slot for the same service.')
      }

      const { data: inserted, error } = await supabase
        .from('appointments')
        .insert({
          doctor_id: data.doctorId,
          clinic_id: data.clinicId,
          service_id: data.serviceId,
          appointment_date: data.appointmentDate,
          start_time: data.startTime,
          end_time: data.endTime,
          status: 'available',
          is_online: data.isOnline ?? false,
          max_bookings: data.maxBookings ?? 1,
          current_bookings: 0,
          is_emergency_slot: data.isEmergencySlot ?? false,
        })
        .select()
        .single()

      if (error) throw error

      await supabase.rpc('log_audit_event', {
        p_action: 'add_slot',
        p_entity_id: inserted.id,
        p_details: { doctor_id: data.doctorId, date: data.appointmentDate },
      })

      return inserted
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctor-slots', doctorId] })
      toast.success('Slot added.')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const addEmergencyTimeSlot = useMutation({
    mutationFn: async ({
      startTime,
      endTime,
      maxSlots,
    }: {
      startTime: string
      endTime: string
      maxSlots: number
    }) => {
      const current: EmergencyTimeSlot[] = emergencyQuery.data ?? []
      const MAX_EMERGENCY_SLOTS = 10

      if (current.length >= MAX_EMERGENCY_SLOTS) {
        throw new Error(`Maximum of ${MAX_EMERGENCY_SLOTS} emergency time windows allowed.`)
      }

      const duplicate = current.some(
        (s) => normalizeTime(s.startTime) === normalizeTime(startTime),
      )
      if (duplicate) throw new Error('An emergency slot with this start time already exists.')

      const updated = [...current, { startTime, endTime, maxSlots }]

      const { error } = await supabase
        .from('doctors')
        .update({ emergency_time_slots: updated })
        .eq('id', doctorId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctor-emergency-slots', doctorId] })
      toast.success('Emergency time slot added.')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const removeEmergencyTimeSlot = useMutation({
    mutationFn: async ({ startTime }: { startTime: string; endTime: string }) => {
      const current: EmergencyTimeSlot[] = emergencyQuery.data ?? []
      const updated = current.filter(
        (s) => normalizeTime(s.startTime) !== normalizeTime(startTime),
      )

      const { error } = await supabase
        .from('doctors')
        .update({ emergency_time_slots: updated })
        .eq('id', doctorId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctor-emergency-slots', doctorId] })
      toast.success('Emergency slot removed.')
    },
    onError: () => toast.error('Failed to remove emergency slot.'),
  })

  return {
    slots: slotsQuery.data ?? [],
    slotsLoading: slotsQuery.isLoading,
    emergencyTimeSlots: emergencyQuery.data ?? [],
    deleteSlot,
    deleteDateSlots,
    addCustomSlot,
    addEmergencyTimeSlot,
    removeEmergencyTimeSlot,
    refetchSlots: slotsQuery.refetch,
  }
}
