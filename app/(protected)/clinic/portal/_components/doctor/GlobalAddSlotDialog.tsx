'use client'

import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Plus } from 'lucide-react'

interface DoctorOption {
  id: string
  firstName: string
  lastName: string
  services: { id: string; name: string; duration_minutes: number; price: number; is_online: boolean; is_active: boolean }[]
}

interface Props {
  clinicId: string
  doctors: DoctorOption[]
  open: boolean
  onOpenChange: (open: boolean) => void
}

function timeOptions(): string[] {
  const times: string[] = []
  for (let h = 0; h < 24; h++) {
    for (const m of [0, 30]) {
      times.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
    }
  }
  return times
}

const TIME_OPTIONS = timeOptions()

export default function GlobalAddSlotDialog({ clinicId, doctors, open, onOpenChange }: Props) {
  const queryClient = useQueryClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any

  const [form, setForm] = useState({
    doctorId: '',
    serviceId: '',
    date: '',
    startTime: '09:00',
    endTime: '09:30',
    maxBookings: 1,
  })

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setForm({
        doctorId: doctors[0]?.id ?? '',
        serviceId: '',
        date: '',
        startTime: '09:00',
        endTime: '09:30',
        maxBookings: 1,
      })
    }
  }, [open, doctors])

  // Update serviceId when doctor changes
  const selectedDoctor = doctors.find((d) => d.id === form.doctorId)
  const availableServices = selectedDoctor?.services ?? []

  useEffect(() => {
    if (availableServices.length > 0 && !availableServices.some((s) => s.id === form.serviceId)) {
      setForm((f) => ({ ...f, serviceId: availableServices[0].id }))
    }
  }, [form.doctorId, availableServices, form.serviceId])

  const addSlot = useMutation({
    mutationFn: async () => {
      // Overlap check
      const { data: existing } = await supabase
        .from('appointments')
        .select('id, start_time, end_time')
        .eq('doctor_id', form.doctorId)
        .eq('appointment_date', form.date)
        .eq('service_id', form.serviceId)
        .is('deleted_at', null)

      const overlapping = (existing ?? []).filter(
        (s: { start_time: string; end_time: string }) => s.start_time < form.endTime && s.end_time > form.startTime,
      )
      if (overlapping.length > 0) {
        throw new Error('This time slot overlaps with an existing slot for the same service.')
      }

      const { data: inserted, error } = await supabase
        .from('appointments')
        .insert({
          doctor_id: form.doctorId,
          clinic_id: clinicId,
          service_id: form.serviceId,
          appointment_date: form.date,
          start_time: form.startTime,
          end_time: form.endTime,
          status: 'available',
          is_online: false,
          max_bookings: form.maxBookings,
          current_bookings: 0,
          is_emergency_slot: false,
        })
        .select()
        .single()

      if (error) throw error

      await supabase.rpc('log_audit_event', {
        p_action: 'add_slot',
        p_entity_id: inserted.id,
        p_details: { doctor_id: form.doctorId, date: form.date },
      })

      return inserted
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sidebar-doctors', clinicId] })
      queryClient.invalidateQueries({ queryKey: ['doctor-slots', form.doctorId] })
      toast.success('Slot added.')
      onOpenChange(false)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  function handleSubmit() {
    if (!form.doctorId) { toast.error('Select a doctor.'); return }
    if (!form.serviceId) { toast.error('Select a service.'); return }
    if (!form.date) { toast.error('Select a date.'); return }
    if (form.startTime >= form.endTime) { toast.error('Start time must be before end time.'); return }
    const today = new Date().toISOString().split('T')[0]
    if (form.date < today) { toast.error('Date cannot be in the past.'); return }
    addSlot.mutate()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add New Slot
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {/* Doctor */}
          <div className="space-y-1">
            <Label>Doctor</Label>
            <Select value={form.doctorId} onValueChange={(v) => setForm((f) => ({ ...f, doctorId: v }))}>
              <SelectTrigger><SelectValue placeholder="Select doctor" /></SelectTrigger>
              <SelectContent>
                {doctors.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.firstName} {d.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Service */}
          <div className="space-y-1">
            <Label>Service</Label>
            <Select
              value={form.serviceId}
              onValueChange={(v) => setForm((f) => ({ ...f, serviceId: v }))}
              disabled={availableServices.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder={availableServices.length === 0 ? 'No services assigned' : 'Select service'} />
              </SelectTrigger>
              <SelectContent>
                {availableServices.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date */}
          <div className="space-y-1">
            <Label>Date</Label>
            <Input
              type="date"
              value={form.date}
              min={new Date().toISOString().split('T')[0]}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
            />
          </div>

          {/* Time */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label>Start</Label>
              <Select value={form.startTime} onValueChange={(v) => setForm((f) => ({ ...f, startTime: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-48">
                  {TIME_OPTIONS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>End</Label>
              <Select value={form.endTime} onValueChange={(v) => setForm((f) => ({ ...f, endTime: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-48">
                  {TIME_OPTIONS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            disabled={addSlot.isPending || !form.doctorId || !form.serviceId || !form.date}
            onClick={handleSubmit}
            className="bg-[#00A86B] hover:bg-[#009060] text-white"
          >
            Add Slot
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
