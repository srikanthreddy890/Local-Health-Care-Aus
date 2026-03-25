'use client'

import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Plus, Trash2, Eye, Zap, CalendarX } from 'lucide-react'
import { useDoctorSlots, isEmergencyTime } from '@/lib/hooks/useDoctorSlots'
import { useDoctorUnavailability } from '@/lib/hooks/useDoctorUnavailability'
import type { UnavailabilityType } from '@/lib/hooks/useDoctorUnavailability'

interface Service {
  id: string
  name: string
  duration_minutes: number
  price: number
  is_online: boolean
  is_active: boolean
}

interface Props {
  doctorId: string
  clinicId: string
  date: string
  emergencySlotsEnabled: boolean
  services: Service[]
}

const SERVICE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  'general consultation': { bg: 'bg-[#EFF6FF]', text: 'text-[#1E40AF]', border: 'border-[#BFDBFE]' },
  'root canal': { bg: 'bg-[#FEF3C7]', text: 'text-[#92400E]', border: 'border-[#FCD34D]' },
  'scale & clean': { bg: 'bg-[#ECFDF5]', text: 'text-[#065F46]', border: 'border-[#6EE7B7]' },
  'cosmetic': { bg: 'bg-[#EDE9FE]', text: 'text-[#5B21B6]', border: 'border-[#C4B5FD]' },
}

function getServiceColor(name: string) {
  const key = name.toLowerCase()
  for (const [match, colors] of Object.entries(SERVICE_COLORS)) {
    if (key.includes(match)) return colors
  }
  return { bg: 'bg-[#F3F4F6]', text: 'text-[#6B7280]', border: 'border-[#E5E7EB]' }
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

const UNAVAILABILITY_TYPES: { value: UnavailabilityType; label: string }[] = [
  { value: 'vacation', label: 'Vacation' },
  { value: 'sick_leave', label: 'Sick Leave' },
  { value: 'emergency', label: 'Emergency' },
  { value: 'personal', label: 'Personal' },
  { value: 'other', label: 'Other' },
]

export default function DateDoctorSlotView({ doctorId, clinicId, date, emergencySlotsEnabled, services }: Props) {
  const queryClient = useQueryClient()
  const { slots, slotsLoading, emergencyTimeSlots, deleteSlot, addCustomSlot } = useDoctorSlots(doctorId, { start: date, end: date })
  const { unavailabilityPeriods, addUnavailability } = useDoctorUnavailability(doctorId)

  const [showAddSlot, setShowAddSlot] = useState(false)
  const [showBlockDates, setShowBlockDates] = useState(false)

  const [slotForm, setSlotForm] = useState({
    serviceId: services[0]?.id ?? '',
    startTime: '09:00',
    endTime: '09:30',
  })

  const [blockForm, setBlockForm] = useState({
    startDate: date,
    endDate: date,
    reason: '',
    type: 'vacation' as UnavailabilityType,
  })

  const bookedCount = slots.filter((s) => s.current_bookings > 0).length
  const isDateBlocked = unavailabilityPeriods.some((p) => date >= p.start_date && date <= p.end_date)

  function handleAddSlot() {
    if (!slotForm.serviceId) { toast.error('Select a service.'); return }
    if (slotForm.startTime >= slotForm.endTime) { toast.error('Start time must be before end time.'); return }
    if (isDateBlocked) { toast.error('This date is blocked.'); return }

    addCustomSlot.mutate(
      {
        doctorId,
        clinicId,
        serviceId: slotForm.serviceId,
        appointmentDate: date,
        startTime: slotForm.startTime,
        endTime: slotForm.endTime,
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['sidebar-doctors', clinicId] })
          setShowAddSlot(false)
        },
      },
    )
  }

  function handleBlockDates() {
    if (blockForm.startDate > blockForm.endDate) {
      toast.error('Start date must be before or equal to end date.')
      return
    }
    addUnavailability.mutate(
      {
        doctorId,
        startDate: blockForm.startDate,
        endDate: blockForm.endDate,
        reason: blockForm.reason || undefined,
        unavailabilityType: blockForm.type,
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['sidebar-doctors', clinicId] })
          setShowBlockDates(false)
        },
      },
    )
  }

  return (
    <div className="space-y-4 text-sm">
      {/* Actions row */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-2 flex-wrap">
          <Button
            size="sm"
            disabled={services.length === 0 || isDateBlocked}
            onClick={() => setShowAddSlot(true)}
            className="bg-[#00A86B] hover:bg-[#009060] text-white"
          >
            <Plus className="w-3.5 h-3.5 mr-1" /> Add Slot
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowBlockDates(true)}
            className="border-[#FDE68A] text-[#D97706] bg-[#FFFBEB] hover:bg-[#FEF3C7]"
          >
            <CalendarX className="w-3.5 h-3.5 mr-1" /> Block
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center bg-[#EFF6FF] text-[#1E40AF] border border-[#BFDBFE] text-[10px] px-2 py-[2px] rounded-full">
            {slots.length} slots
          </span>
          <span className="inline-flex items-center bg-[#ECFDF5] text-[#065F46] border border-[#6EE7B7] text-[10px] px-2 py-[2px] rounded-full">
            {bookedCount} booked
          </span>
        </div>
      </div>

      {/* Blocked date warning */}
      {isDateBlocked && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-lg px-3 py-2 text-xs text-destructive font-medium">
          This date is blocked. Remove the block to add slots.
        </div>
      )}

      {/* Slot list */}
      {slotsLoading ? (
        <p className="text-xs text-lhc-text-muted py-4 text-center">Loading...</p>
      ) : slots.length === 0 ? (
        <p className="text-xs text-lhc-text-muted py-4 text-center">No slots for this date.</p>
      ) : (
        <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
          {slots.map((slot) => {
            const isEmergency = isEmergencyTime(slot.start_time, emergencyTimeSlots)
            const isBooked = slot.current_bookings > 0
            const serviceName = slot.service?.name ?? ''
            const serviceColor = getServiceColor(serviceName)

            return (
              <div
                key={slot.id}
                className={cn(
                  'flex items-center justify-between border rounded-[9px] px-3 py-2',
                  isBooked
                    ? 'border-[#A7F3D0] bg-[#F0FDF4]'
                    : 'border-[var(--color-border-secondary,#E5E7EB)]',
                )}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-[13px] font-bold tabular-nums text-lhc-text-main min-w-[90px]">
                    {slot.start_time.slice(0, 5)} &ndash; {slot.end_time.slice(0, 5)}
                  </span>
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-lhc-text-main truncate">
                      {serviceName || 'Slot'}
                    </p>
                    <p className="text-[11px] text-lhc-text-muted truncate">
                      {isBooked
                        ? 'Booked by Patient'
                        : slot.service
                          ? `${slot.service.duration_minutes ?? '—'} min session`
                          : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {isEmergency && (
                    <Badge variant="destructive" className="text-[9px] px-1">Emg</Badge>
                  )}
                  {isBooked ? (
                    <span className="inline-flex items-center bg-[#D1FAE5] text-[#065F46] border border-[#6EE7B7] text-[10px] px-2 py-[1px] rounded-full">
                      Booked
                    </span>
                  ) : serviceName ? (
                    <span className={cn(
                      'inline-flex items-center text-[10px] px-2 py-[1px] rounded-full border',
                      serviceColor.bg, serviceColor.text, serviceColor.border,
                    )}>
                      {serviceName}
                    </span>
                  ) : null}
                  {isBooked ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 px-2 text-[11px] text-[#059669] border-[#A7F3D0]"
                    >
                      <Eye className="w-3 h-3 mr-0.5" /> View
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-destructive"
                      onClick={() => deleteSlot.mutate(
                        { slotId: slot.id },
                        { onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sidebar-doctors', clinicId] }) },
                      )}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Add Slot Dialog (pre-filled date) */}
      <Dialog open={showAddSlot} onOpenChange={setShowAddSlot}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add Slot</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {services.length > 0 && (
              <div className="space-y-1">
                <Label>Service</Label>
                <Select value={slotForm.serviceId} onValueChange={(v) => setSlotForm((f) => ({ ...f, serviceId: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {services.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label>Start</Label>
                <Select value={slotForm.startTime} onValueChange={(v) => setSlotForm((f) => ({ ...f, startTime: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent className="max-h-48">
                    {TIME_OPTIONS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>End</Label>
                <Select value={slotForm.endTime} onValueChange={(v) => setSlotForm((f) => ({ ...f, endTime: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent className="max-h-48">
                    {TIME_OPTIONS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddSlot(false)}>Cancel</Button>
            <Button
              disabled={!slotForm.serviceId || addCustomSlot.isPending}
              onClick={handleAddSlot}
              className="bg-[#00A86B] hover:bg-[#009060] text-white"
            >
              Add Slot
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Block Dates Dialog */}
      <Dialog open={showBlockDates} onOpenChange={setShowBlockDates}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Block Dates</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label>From</Label>
                <Input type="date" value={blockForm.startDate} onChange={(e) => setBlockForm((f) => ({ ...f, startDate: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>To</Label>
                <Input type="date" value={blockForm.endDate} onChange={(e) => setBlockForm((f) => ({ ...f, endDate: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Type</Label>
              <Select value={blockForm.type} onValueChange={(v) => setBlockForm((f) => ({ ...f, type: v as UnavailabilityType }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {UNAVAILABILITY_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Reason (optional)</Label>
              <Input value={blockForm.reason} onChange={(e) => setBlockForm((f) => ({ ...f, reason: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBlockDates(false)}>Cancel</Button>
            <Button
              disabled={!blockForm.startDate || !blockForm.endDate || addUnavailability.isPending}
              onClick={handleBlockDates}
            >
              Block Dates
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
