'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { CalendarDays, Loader2, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from '@/lib/toast'
import { cn, fmt12 } from '@/lib/utils'
import DateStrip from './DateStrip'

interface Slot {
  id: string
  appointment_date: string
  start_time: string
  end_time: string
  is_emergency_slot?: boolean | null
  max_bookings: number
  current_bookings: number
}

interface Props {
  clinicId: string
  doctorId: string
  serviceId: string
  initialDate?: string
  onSelect: (slotId: string | null) => void
}

export default function SlotSelectStep({ clinicId, doctorId, serviceId, initialDate, onSelect }: Props) {
  const [slots, setSlots] = useState<Slot[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const scrolledRef = useRef(false)

  const fetchSlots = useCallback(async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      // appointments_public view already filters: status='available', deleted_at IS NULL, date >= today
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('appointments_public')
        .select('id, appointment_date, start_time, end_time, is_emergency_slot, max_bookings, current_bookings')
        .eq('clinic_id', clinicId)
        .eq('doctor_id', doctorId)
        .eq('service_id', serviceId)
        .order('appointment_date', { ascending: true })
        .order('start_time', { ascending: true })
        .limit(90)

      if (error) throw error
      // Only show slots that still have availability
      setSlots((data ?? []).filter((s: Slot) => s.current_bookings < s.max_bookings))
    } catch (err) {
      toast({ title: 'Could not load available slots', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [clinicId, doctorId, serviceId])

  useEffect(() => { fetchSlots() }, [fetchSlots])

  // Set initial selected date after slots load
  useEffect(() => {
    if (!loading && slots.length > 0 && !scrolledRef.current) {
      scrolledRef.current = true
      const sortedDts = [...new Set(slots.map((s) => s.appointment_date))].sort()
      if (initialDate && sortedDts.includes(initialDate)) {
        setSelectedDate(initialDate)
      } else if (sortedDts.length > 0) {
        setSelectedDate(sortedDts[0])
      }
    }
  }, [loading, slots, initialDate])

  // Group slots by date
  const slotsByDate: Record<string, Slot[]> = {}
  for (const s of slots) {
    if (!slotsByDate[s.appointment_date]) slotsByDate[s.appointment_date] = []
    slotsByDate[s.appointment_date].push(s)
  }
  const sortedDates = Object.keys(slotsByDate).sort()

  const todayStr = new Date().toISOString().split('T')[0]
  const tomorrowDate = new Date()
  tomorrowDate.setDate(tomorrowDate.getDate() + 1)
  const tomorrowStr = tomorrowDate.toISOString().split('T')[0]

  return (
    <div className="bg-white rounded-2xl border border-lhc-border shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-lhc-border bg-lhc-background/40">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-lhc-primary/10 flex items-center justify-center">
            <CalendarDays className="w-4 h-4 text-lhc-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-lhc-text-main">Pick a Date & Time</h3>
            <p className="text-xs text-lhc-text-muted mt-0.5">Select an available time slot for your appointment</p>
          </div>
        </div>
      </div>

      <div className="p-6">
        {loading ? (
          <div className="flex items-center justify-center py-14 gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-lhc-primary" />
            <span className="text-sm text-lhc-text-muted">Checking availability…</span>
          </div>
        ) : slots.length === 0 ? (
          <div className="flex flex-col items-center py-14 text-center">
            <AlertCircle className="w-9 h-9 text-lhc-text-muted/25 mb-2" />
            <p className="text-sm font-medium text-lhc-text-main">No available slots</p>
            <p className="text-xs text-lhc-text-muted mt-1">This doctor has no upcoming availability for this service. Try another doctor or service.</p>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Date strip navigation */}
            <DateStrip
              dates={sortedDates}
              selectedDate={selectedDate}
              onSelect={setSelectedDate}
            />

            {/* Time slots for selected date */}
            {selectedDate && slotsByDate[selectedDate] ? (
              <div>
                <p className="text-xs font-semibold text-lhc-text-muted uppercase tracking-wider mb-3">
                  Available times for{' '}
                  {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })}
                  {selectedDate === todayStr && ' (Today)'}
                  {selectedDate === tomorrowStr && ' (Tomorrow)'}
                </p>
                <div className="flex flex-wrap gap-2">
                  {slotsByDate[selectedDate].map((slot) => (
                    <button
                      key={slot.id}
                      onClick={() => onSelect(slot.id)}
                      className={cn(
                        'px-5 py-2.5 rounded-xl border text-sm font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lhc-primary',
                        slot.is_emergency_slot
                          ? 'border-red-200 bg-red-50 text-red-600 hover:border-red-400 hover:bg-red-100'
                          : 'border-lhc-border/70 text-lhc-primary bg-lhc-primary/5 hover:border-lhc-primary hover:bg-lhc-primary hover:text-white',
                      )}
                    >
                      {fmt12(slot.start_time)}
                      {slot.is_emergency_slot && (
                        <span className="ml-1.5 text-[9px] font-bold uppercase tracking-wider">Urgent</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            ) : selectedDate ? (
              <p className="text-sm text-lhc-text-muted italic py-4">No slots for this date. Select another date above.</p>
            ) : null}

            {/* Total slot count */}
            <p className="text-xs text-lhc-text-muted">
              {slots.length} slot{slots.length !== 1 ? 's' : ''} available across {sortedDates.length} day{sortedDates.length !== 1 ? 's' : ''}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
