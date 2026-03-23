'use client'

import { useState, useEffect, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'

import { Calendar, Plus, Trash2, AlertTriangle, Zap, CalendarX, Eye } from 'lucide-react'
import { useDoctorSlots, isEmergencyTime } from '@/lib/hooks/useDoctorSlots'
import { useDoctorUnavailability } from '@/lib/hooks/useDoctorUnavailability'
import type { Service } from '../DoctorManagement'
import type { UnavailabilityType } from '@/lib/hooks/useDoctorUnavailability'

interface Props {
  doctorId: string
  clinicId: string
  emergencySlotsEnabled: boolean
  services: Service[]
  compact?: boolean
}

const UNAVAILABILITY_TYPES: { value: UnavailabilityType; label: string }[] = [
  { value: 'vacation', label: 'Vacation' },
  { value: 'sick_leave', label: 'Sick Leave' },
  { value: 'emergency', label: 'Emergency' },
  { value: 'personal', label: 'Personal' },
  { value: 'other', label: 'Other' },
]

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

// SL1 — Human-readable date format
function formatDateHuman(isoDate: string): string {
  const d = new Date(isoDate + 'T00:00:00')
  return d.toLocaleDateString('en-AU', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).toUpperCase()
}

// SL3 — Service type color mapping
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

const DEFAULT_VISIBLE_SLOTS = 7

export default function DoctorSlotManager({
  doctorId,
  clinicId,
  emergencySlotsEnabled,
  services,
  compact = false,
}: Props) {
  const { slots, slotsLoading, emergencyTimeSlots, deleteSlot, addCustomSlot, addEmergencyTimeSlot, removeEmergencyTimeSlot } = useDoctorSlots(doctorId)
  const { unavailabilityPeriods, addUnavailability, removeUnavailability } = useDoctorUnavailability(doctorId)

  const [showAddSlot, setShowAddSlot] = useState(false)
  const [showAddUnavail, setShowAddUnavail] = useState(false)
  const [showAddEmergency, setShowAddEmergency] = useState(false)
  // SL4 — Track expanded date groups
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set())

  const [slotForm, setSlotForm] = useState({
    serviceId: services[0]?.id ?? '',
    date: '',
    startTime: '09:00',
    endTime: '09:30',
    isOnline: false,
    maxBookings: 1,
  })

  useEffect(() => {
    setSlotForm((f) => {
      const currentValid = services.some((s) => s.id === f.serviceId)
      if (!currentValid && services.length > 0) {
        return { ...f, serviceId: services[0].id }
      }
      return f
    })
  }, [services])

  const [unavailForm, setUnavailForm] = useState({
    startDate: '',
    endDate: '',
    reason: '',
    type: 'vacation' as UnavailabilityType,
  })

  const [emergencyForm, setEmergencyForm] = useState({
    startTime: '09:00',
    endTime: '09:30',
    maxSlots: 3,
  })

  const groupedSlots: Record<string, typeof slots> = {}
  for (const slot of slots) {
    if (!groupedSlots[slot.appointment_date]) groupedSlots[slot.appointment_date] = []
    groupedSlots[slot.appointment_date].push(slot)
  }
  const sortedDates = Object.keys(groupedSlots).sort()

  const bookedCount = useMemo(() => slots.filter(s => s.current_bookings > 0).length, [slots])

  const scrollH = compact ? 'h-48' : 'h-[400px]'

  function toggleDateExpansion(date: string) {
    setExpandedDates(prev => {
      const next = new Set(prev)
      if (next.has(date)) {
        next.delete(date)
      } else {
        next.add(date)
      }
      return next
    })
  }

  return (
    <div className={cn('space-y-4', compact && 'text-sm')}>
      {/* SL5 — Actions + stats row */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-2 flex-wrap">
          {/* SL5 — Primary Add Slot button */}
          <Button
            size={compact ? 'sm' : 'default'}
            disabled={services.length === 0}
            title={services.length === 0 ? 'Assign services to this doctor first' : undefined}
            onClick={() => setShowAddSlot(true)}
            className="bg-[#00A86B] hover:bg-[#009060] text-white"
          >
            <Plus className="w-3.5 h-3.5 mr-1" /> Add Slot
          </Button>
          {/* SL5 — Amber ghost Block Dates button */}
          <Button
            size={compact ? 'sm' : 'default'}
            variant="outline"
            onClick={() => setShowAddUnavail(true)}
            className="border-[#FDE68A] text-[#D97706] bg-[#FFFBEB] hover:bg-[#FEF3C7]"
          >
            <CalendarX className="w-3.5 h-3.5 mr-1" /> Block Dates
          </Button>
          {emergencySlotsEnabled && (
            <Button size={compact ? 'sm' : 'default'} variant="outline" onClick={() => setShowAddEmergency(true)}>
              <Zap className="w-3.5 h-3.5 mr-1" /> Emergency Slot
            </Button>
          )}
        </div>
        {/* SL4 — Stats badges */}
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center bg-[#EFF6FF] text-[#1E40AF] border border-[#BFDBFE] text-[10px] px-2 py-[2px] rounded-full">
            {slots.length} upcoming
          </span>
          <span className="inline-flex items-center bg-[#ECFDF5] text-[#065F46] border border-[#6EE7B7] text-[10px] px-2 py-[2px] rounded-full">
            {bookedCount} booked
          </span>
        </div>
      </div>

      {/* Slots list */}
      <div>
        {slotsLoading ? (
          <p className="text-xs text-lhc-text-muted py-4 text-center">Loading...</p>
        ) : sortedDates.length === 0 ? (
          <p className="text-xs text-lhc-text-muted py-4 text-center">No upcoming slots.</p>
        ) : (
          <div className={`${scrollH} overflow-y-auto`}>
            <div className="space-y-4">
              {sortedDates.map((date) => {
                const dateSlots = groupedSlots[date]
                const isExpanded = expandedDates.has(date)
                const visibleSlots = isExpanded ? dateSlots : dateSlots.slice(0, DEFAULT_VISIBLE_SLOTS)
                const hiddenCount = dateSlots.length - DEFAULT_VISIBLE_SLOTS

                return (
                  <div key={date}>
                    {/* SL1 — Human-readable date header */}
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="w-3 h-3 text-[#9CA3AF] shrink-0" />
                      <span className="text-[11px] font-medium text-lhc-text-muted tracking-[0.05em]">
                        {formatDateHuman(date)}
                      </span>
                      <div className="flex-1 h-px bg-[var(--color-border-tertiary,#E5E7EB)]" />
                    </div>
                    <div className="space-y-1.5 pl-1">
                      {visibleSlots.map((slot) => {
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
                              {/* Time */}
                              <span className="text-[13px] font-bold tabular-nums text-lhc-text-main min-w-[90px]">
                                {slot.start_time.slice(0, 5)} &ndash; {slot.end_time.slice(0, 5)}
                              </span>
                              {/* Service info */}
                              <div className="min-w-0">
                                <p className="text-[13px] font-semibold text-lhc-text-main truncate">
                                  {serviceName || 'Slot'}
                                </p>
                                <p className="text-[11px] text-lhc-text-muted truncate">
                                  {isBooked
                                    ? `Booked by Patient`
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
                              {/* SL2/SL3 — Booked or service type pill */}
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
                              {/* Action */}
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
                                  onClick={() => deleteSlot.mutate({ slotId: slot.id })}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                    {/* SL4 — Show more link */}
                    {!isExpanded && hiddenCount > 0 && (
                      <button
                        onClick={() => toggleDateExpansion(date)}
                        className="w-full text-center text-[11px] text-[#00A86B] font-medium mt-1.5 hover:underline"
                      >
                        Show {hiddenCount} more slots for this date &rarr;
                      </button>
                    )}
                    {isExpanded && hiddenCount > 0 && (
                      <button
                        onClick={() => toggleDateExpansion(date)}
                        className="w-full text-center text-[11px] text-lhc-text-muted mt-1.5 hover:underline"
                      >
                        Show less
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Unavailability periods */}
      {unavailabilityPeriods.length > 0 && (
        <Card>
          <CardHeader className={compact ? 'py-2 px-3' : undefined}>
            <CardTitle className={cn('text-destructive', compact ? 'text-sm' : '')}>
              Blocked Dates
            </CardTitle>
          </CardHeader>
          <CardContent className={compact ? 'px-3 pb-3' : undefined}>
            <div className="space-y-2">
              {unavailabilityPeriods.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between border border-destructive/30 bg-destructive/5 rounded px-2 py-1.5"
                >
                  <div>
                    <p className="text-xs font-medium">{p.start_date} &rarr; {p.end_date}</p>
                    <p className="text-xs text-lhc-text-muted capitalize">{p.unavailability_type.replace(/_/g, ' ')}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-destructive"
                    onClick={() => removeUnavailability.mutate(p.id)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Emergency time slots */}
      {emergencySlotsEnabled && emergencyTimeSlots.length > 0 && (
        <Card>
          <CardHeader className={compact ? 'py-2 px-3' : undefined}>
            <CardTitle className={cn('flex items-center gap-2 text-yellow-700', compact ? 'text-sm' : '')}>
              <Zap className="w-4 h-4" /> Emergency Time Windows
            </CardTitle>
          </CardHeader>
          <CardContent className={compact ? 'px-3 pb-3' : undefined}>
            <div className="space-y-1">
              {emergencyTimeSlots.map((et) => (
                <div key={et.startTime} className="flex items-center justify-between border border-yellow-200 bg-yellow-50 rounded px-2 py-1">
                  <span className="text-xs">{et.startTime}&ndash;{et.endTime} (max {et.maxSlots})</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 w-5 p-0 text-destructive"
                    onClick={() => removeEmergencyTimeSlot.mutate({ startTime: et.startTime, endTime: et.endTime })}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add Slot Dialog */}
      <Dialog open={showAddSlot} onOpenChange={setShowAddSlot}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add Custom Slot</DialogTitle></DialogHeader>
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
            <div className="space-y-1">
              <Label>Date</Label>
              <Input type="date" value={slotForm.date} onChange={(e) => setSlotForm((f) => ({ ...f, date: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label>Start</Label>
                <Select value={slotForm.startTime} onValueChange={(v) => setSlotForm((f) => ({ ...f, startTime: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent className="max-h-48">{TIME_OPTIONS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>End</Label>
                <Select value={slotForm.endTime} onValueChange={(v) => setSlotForm((f) => ({ ...f, endTime: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent className="max-h-48">{TIME_OPTIONS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddSlot(false)}>Cancel</Button>
            <Button
              disabled={!slotForm.date || !slotForm.serviceId || addCustomSlot.isPending}
              onClick={() => {
                if (slotForm.startTime >= slotForm.endTime) {
                  toast.error('Start time must be before end time.')
                  return
                }
                const today = new Date().toISOString().split('T')[0]
                if (slotForm.date < today) {
                  toast.error('Date cannot be in the past.')
                  return
                }
                const isBlocked = unavailabilityPeriods.some(
                  (p) => slotForm.date >= p.start_date && slotForm.date <= p.end_date,
                )
                if (isBlocked) {
                  toast.error('This date falls in a blocked period.')
                  return
                }
                addCustomSlot.mutate({
                  doctorId,
                  clinicId,
                  serviceId: slotForm.serviceId,
                  appointmentDate: slotForm.date,
                  startTime: slotForm.startTime,
                  endTime: slotForm.endTime,
                  isOnline: slotForm.isOnline,
                  maxBookings: slotForm.maxBookings,
                })
                setShowAddSlot(false)
              }}
            >
              Add Slot
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Block Dates Dialog */}
      <Dialog open={showAddUnavail} onOpenChange={setShowAddUnavail}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Block Dates</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label>From</Label>
                <Input type="date" value={unavailForm.startDate} onChange={(e) => setUnavailForm((f) => ({ ...f, startDate: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>To</Label>
                <Input type="date" value={unavailForm.endDate} onChange={(e) => setUnavailForm((f) => ({ ...f, endDate: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Type</Label>
              <Select value={unavailForm.type} onValueChange={(v) => setUnavailForm((f) => ({ ...f, type: v as UnavailabilityType }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {UNAVAILABILITY_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Reason (optional)</Label>
              <Input value={unavailForm.reason} onChange={(e) => setUnavailForm((f) => ({ ...f, reason: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddUnavail(false)}>Cancel</Button>
            <Button
              disabled={!unavailForm.startDate || !unavailForm.endDate || addUnavailability.isPending}
              onClick={() => {
                if (unavailForm.startDate > unavailForm.endDate) {
                  toast.error('Start date must be before or equal to end date.')
                  return
                }
                const today = new Date().toISOString().split('T')[0]
                if (unavailForm.endDate < today) {
                  toast.error('Dates cannot be entirely in the past.')
                  return
                }
                addUnavailability.mutate({
                  doctorId,
                  startDate: unavailForm.startDate,
                  endDate: unavailForm.endDate,
                  reason: unavailForm.reason || undefined,
                  unavailabilityType: unavailForm.type,
                })
                setShowAddUnavail(false)
              }}
            >
              Block Dates
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Emergency Slot Dialog */}
      {emergencySlotsEnabled && (
        <Dialog open={showAddEmergency} onOpenChange={setShowAddEmergency}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>Add Emergency Time Window</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label>Start</Label>
                  <Select value={emergencyForm.startTime} onValueChange={(v) => setEmergencyForm((f) => ({ ...f, startTime: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent className="max-h-48">{TIME_OPTIONS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>End</Label>
                  <Select value={emergencyForm.endTime} onValueChange={(v) => setEmergencyForm((f) => ({ ...f, endTime: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent className="max-h-48">{TIME_OPTIONS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <Label>Max Slots</Label>
                <Input type="number" min={1} max={20} value={emergencyForm.maxSlots} onChange={(e) => setEmergencyForm((f) => ({ ...f, maxSlots: parseInt(e.target.value, 10) || 1 }))} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddEmergency(false)}>Cancel</Button>
              <Button
                disabled={addEmergencyTimeSlot.isPending}
                onClick={() => {
                  if (emergencyForm.startTime >= emergencyForm.endTime) {
                    toast.error('Start time must be before end time.')
                    return
                  }
                  addEmergencyTimeSlot.mutate(emergencyForm)
                  setShowAddEmergency(false)
                }}
              >
                Add
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
