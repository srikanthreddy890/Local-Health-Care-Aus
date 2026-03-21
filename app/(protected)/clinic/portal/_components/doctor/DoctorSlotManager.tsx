'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'

import { Calendar, Plus, Trash2, AlertTriangle, Zap } from 'lucide-react'
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

  const [slotForm, setSlotForm] = useState({
    serviceId: services[0]?.id ?? '',
    date: '',
    startTime: '09:00',
    endTime: '09:30',
    isOnline: false,
    maxBookings: 1,
  })

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

  const scrollH = compact ? 'h-48' : 'h-72'

  return (
    <div className={cn('space-y-4', compact && 'text-sm')}>
      {/* Actions */}
      <div className="flex gap-2 flex-wrap">
        <Button
          size={compact ? 'sm' : 'default'}
          variant="outline"
          disabled={services.length === 0}
          title={services.length === 0 ? 'Assign services to this doctor first' : undefined}
          onClick={() => setShowAddSlot(true)}
        >
          <Plus className="w-3.5 h-3.5 mr-1" /> Add Slot
        </Button>
        <Button size={compact ? 'sm' : 'default'} variant="outline" onClick={() => setShowAddUnavail(true)}>
          <AlertTriangle className="w-3.5 h-3.5 mr-1" /> Block Dates
        </Button>
        {emergencySlotsEnabled && (
          <Button size={compact ? 'sm' : 'default'} variant="outline" onClick={() => setShowAddEmergency(true)}>
            <Zap className="w-3.5 h-3.5 mr-1" /> Emergency Slot
          </Button>
        )}
      </div>

      {/* Slots list */}
      <Card>
        <CardHeader className={compact ? 'py-2 px-3' : undefined}>
          <CardTitle className={cn('flex items-center gap-2', compact ? 'text-sm' : '')}>
            <Calendar className="w-4 h-4 text-lhc-primary" />
            Upcoming Slots ({slots.length})
          </CardTitle>
        </CardHeader>
        <CardContent className={compact ? 'px-3 pb-3' : undefined}>
          {slotsLoading ? (
            <p className="text-xs text-lhc-text-muted">Loading…</p>
          ) : sortedDates.length === 0 ? (
            <p className="text-xs text-lhc-text-muted">No upcoming slots.</p>
          ) : (
            <div className={`${scrollH} overflow-y-auto`}>
              <div className="space-y-3">
                {sortedDates.map((date) => (
                  <div key={date}>
                    <p className="text-xs font-semibold text-lhc-text-muted mb-1">{date}</p>
                    <div className="space-y-1 pl-2">
                      {groupedSlots[date].map((slot) => {
                        const isEmergency = isEmergencyTime(slot.start_time, emergencyTimeSlots)
                        return (
                          <div
                            key={slot.id}
                            className="flex items-center justify-between border border-lhc-border rounded px-2 py-1"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono">
                                {slot.start_time.slice(0, 5)}–{slot.end_time.slice(0, 5)}
                              </span>
                              {slot.service && (
                                <span className="text-xs text-lhc-text-muted">{slot.service.name}</span>
                              )}
                              {isEmergency && (
                                <Badge variant="destructive" className="text-xs px-1">Emg</Badge>
                              )}
                              {slot.current_bookings > 0 && (
                                <Badge variant="secondary" className="text-xs px-1">
                                  {slot.current_bookings}/{slot.max_bookings} booked
                                </Badge>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-5 w-5 p-0 text-destructive"
                              disabled={slot.current_bookings > 0}
                              onClick={() => deleteSlot.mutate({ slotId: slot.id })}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

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
                    <p className="text-xs font-medium">{p.start_date} → {p.end_date}</p>
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
                  <span className="text-xs">{et.startTime}–{et.endTime} (max {et.maxSlots})</span>
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
