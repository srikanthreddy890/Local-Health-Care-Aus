'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { CalendarDays, Loader2, AlertCircle, Clock } from 'lucide-react'
import { useCustomApiIntegration, type CustomApiSlot } from '@/lib/hooks/useCustomApiIntegration'
import { useBookingContext } from './BookingContext'
import DateStrip from './DateStrip'

interface Props {
  clinicId: string
  configId: string
  doctorId: string
  initialDate: string
  onSelect: (slotId: string | null) => void
}

export default function CustomApiSlotSelectStep({
  clinicId,
  configId,
  doctorId,
  initialDate,
  onSelect,
}: Props) {
  const { getDoctorSlots } = useCustomApiIntegration({ clinicId, configId })
  const { setSlot } = useBookingContext()

  const [slots, setSlots] = useState<CustomApiSlot[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState(initialDate || new Date().toISOString().split('T')[0])

  const fetchSlots = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await getDoctorSlots(doctorId, selectedDate)
      setSlots(result.filter((s) => s.available !== false))
    } catch {
      setError('Could not load available times. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [getDoctorSlots, doctorId, selectedDate])

  useEffect(() => { fetchSlots() }, [fetchSlots])

  // Generate date strip (7 days starting from selected date)
  const dates = useMemo(() => {
    const base = new Date(selectedDate)
    const arr: string[] = []
    for (let i = 0; i < 14; i++) {
      const d = new Date(base)
      d.setDate(base.getDate() + i)
      arr.push(d.toISOString().split('T')[0])
    }
    return arr
  }, [selectedDate])

  function handleSlotClick(slot: CustomApiSlot) {
    const slotId = slot.slot_id || slot.appointment_id || ''
    // Store slot info in context
    setSlot({
      id: slotId,
      appointment_date: selectedDate,
      start_time: slot.start_time,
      end_time: slot.end_time ?? '',
    })
    onSelect(slotId)
  }

  function formatTime(time: string): string {
    if (!time) return ''
    // Handle HH:MM:SS or HH:MM format
    const parts = time.split(':')
    if (parts.length < 2) return time
    const h = parseInt(parts[0], 10)
    const m = parts[1]
    const period = h >= 12 ? 'PM' : 'AM'
    const hour = h % 12 || 12
    return `${hour}:${m} ${period}`
  }

  return (
    <div className="bg-white rounded-2xl border border-lhc-border p-6 shadow-sm space-y-4">
      <div>
        <h2 className="text-lg font-bold text-lhc-text-main">Select Date & Time</h2>
        <p className="text-sm text-lhc-text-muted mt-1">Choose an available appointment slot</p>
      </div>

      {/* Date picker */}
      <DateStrip
        dates={dates}
        selectedDate={selectedDate}
        onSelect={(date) => setSelectedDate(date)}
      />

      {/* Slots */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-lhc-primary mr-2" />
          <span className="text-lhc-text-muted">Loading available times...</span>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center py-12 text-center gap-3">
          <AlertCircle className="w-8 h-8 text-red-400" />
          <p className="text-lhc-text-muted">{error}</p>
          <button onClick={fetchSlots} className="text-lhc-primary text-sm font-medium hover:underline">
            Try Again
          </button>
        </div>
      ) : slots.length === 0 ? (
        <div className="flex flex-col items-center py-12 text-center gap-3">
          <CalendarDays className="w-8 h-8 text-lhc-text-muted/40" />
          <p className="text-lhc-text-muted">No available slots for this date.</p>
          <p className="text-xs text-lhc-text-muted">Try selecting a different date above.</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
          {slots.map((slot, i) => (
            <button
              key={slot.slot_id || slot.appointment_id || i}
              onClick={() => handleSlotClick(slot)}
              className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg border border-lhc-border hover:border-lhc-primary hover:bg-lhc-primary/5 transition-all text-sm font-medium text-lhc-text-main"
            >
              <Clock className="w-3.5 h-3.5 text-lhc-text-muted" />
              {formatTime(slot.start_time)}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
