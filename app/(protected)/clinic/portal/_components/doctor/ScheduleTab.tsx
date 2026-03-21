'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'

import { Plus, Trash2, Info } from 'lucide-react'
import type { Doctor, TimeSlot } from '../DoctorManagement'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

const SLOT_DURATIONS = [10, 15, 20, 30, 45, 60, 90, 120]

const RECURRENCE_OPTIONS = [
  { value: 'every_week', label: 'Every week (default)' },
  { value: 'alternate_weeks_1', label: 'Alternate weeks (1st, 3rd, 5th…)' },
  { value: 'alternate_weeks_2', label: 'Alternate weeks (2nd, 4th, 6th…)' },
  { value: 'first_third_week', label: '1st and 3rd week of month' },
  { value: 'second_fourth_week', label: '2nd and 4th week of month' },
]

const NON_STANDARD_PATTERNS = new Set(['alternate_weeks_1', 'alternate_weeks_2', 'first_third_week', 'second_fourth_week'])

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

interface Props {
  doctor: Doctor
  onChange: (patch: Partial<Doctor>) => void
}

export default function ScheduleTab({ doctor, onChange }: Props) {
  const [showSlotDialog, setShowSlotDialog] = useState(false)
  const [slotForm, setSlotForm] = useState({ startTime: '09:00', endTime: '17:00', duration: '30' })

  const recurrenceType = doctor.availability.recurrencePattern?.type ?? 'every_week'
  const isNonStandard = NON_STANDARD_PATTERNS.has(recurrenceType)

  function toggleDay(day: string) {
    const current = doctor.availability.days
    const next = current.includes(day) ? current.filter((d) => d !== day) : [...current, day]
    onChange({ availability: { ...doctor.availability, days: next } })
  }

  function setRecurrence(type: string) {
    onChange({
      availability: {
        ...doctor.availability,
        recurrencePattern: { type },
      },
    })
  }

  function setSlotDuration(val: string) {
    onChange({ availability: { ...doctor.availability, slotDuration: parseInt(val, 10) } })
  }

  function addTimeSlot() {
    const slot: TimeSlot = {
      id: `slot-${Date.now()}`,
      startTime: slotForm.startTime,
      endTime: slotForm.endTime,
      duration: parseInt(slotForm.duration, 10),
      isCustom: true,
    }
    onChange({
      availability: {
        ...doctor.availability,
        timeSlots: [...doctor.availability.timeSlots, slot],
      },
    })
    setShowSlotDialog(false)
  }

  function removeTimeSlot(id: string) {
    onChange({
      availability: {
        ...doctor.availability,
        timeSlots: doctor.availability.timeSlots.filter((s) => s.id !== id),
      },
    })
  }

  return (
    <div className="space-y-6">
      {/* Recurrence pattern */}
      <div className="space-y-2">
        <Label>Recurrence Pattern</Label>
        <Select value={recurrenceType} onValueChange={setRecurrence}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {RECURRENCE_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {isNonStandard && (
          <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800">
            <Info className="h-4 w-4 shrink-0 mt-0.5" />
            <span>Non-standard pattern: slots will only be generated for matching weeks in each month.</span>
          </div>
        )}
      </div>

      {/* Available days */}
      <div className="space-y-2">
        <Label>Available Days</Label>
        <div className="flex flex-wrap gap-2">
          {DAYS.map((day) => {
            const selected = doctor.availability.days.includes(day)
            return (
              <Button
                key={day}
                type="button"
                variant={selected ? 'default' : 'outline'}
                size="sm"
                className="h-8"
                onClick={() => toggleDay(day)}
              >
                {day.slice(0, 3)}
              </Button>
            )
          })}
        </div>
      </div>

      {/* Default slot duration */}
      <div className="space-y-2">
        <Label>Default Slot Duration</Label>
        <Select
          value={String(doctor.availability.slotDuration ?? 30)}
          onValueChange={setSlotDuration}
        >
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            {SLOT_DURATIONS.map((d) => (
              <SelectItem key={d} value={String(d)}>{d} minutes</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Time slots */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Time Slots</Label>
          <Button variant="outline" size="sm" onClick={() => setShowSlotDialog(true)}>
            <Plus className="w-4 h-4 mr-1" />
            Add
          </Button>
        </div>
        {doctor.availability.timeSlots.length === 0 ? (
          <p className="text-xs text-lhc-text-muted">No time slots defined yet.</p>
        ) : (
          <div className="space-y-2">
            {doctor.availability.timeSlots.map((slot) => (
              <div
                key={slot.id}
                className="flex items-center justify-between border border-lhc-border rounded-lg px-3 py-2"
              >
                <span className="text-sm text-lhc-text-main">
                  {slot.startTime} – {slot.endTime} ({slot.duration}min slots)
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-destructive"
                  onClick={() => removeTimeSlot(slot.id)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add slot dialog */}
      <Dialog open={showSlotDialog} onOpenChange={setShowSlotDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add Time Slot</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Start Time</Label>
              <Select value={slotForm.startTime} onValueChange={(v) => setSlotForm((f) => ({ ...f, startTime: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-48 overflow-y-auto">
                  {TIME_OPTIONS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>End Time</Label>
              <Select value={slotForm.endTime} onValueChange={(v) => setSlotForm((f) => ({ ...f, endTime: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-48 overflow-y-auto">
                  {TIME_OPTIONS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Slot Duration</Label>
              <Select value={slotForm.duration} onValueChange={(v) => setSlotForm((f) => ({ ...f, duration: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SLOT_DURATIONS.map((d) => <SelectItem key={d} value={String(d)}>{d} min</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSlotDialog(false)}>Cancel</Button>
            <Button onClick={addTimeSlot}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
