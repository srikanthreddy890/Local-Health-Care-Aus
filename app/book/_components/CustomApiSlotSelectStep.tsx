'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { CalendarDays, Loader2, AlertCircle, Clock, Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useCustomApiIntegration } from '@/lib/hooks/useCustomApiIntegration'
import { useBookingContext } from './BookingContext'
import DateStrip from './DateStrip'

interface Props {
  clinicId: string
  configId: string
  initialDate: string
  onSelect: (slotId: string | null) => void
}

export default function CustomApiSlotSelectStep({
  clinicId,
  configId,
  initialDate,
  onSelect,
}: Props) {
  const { getAllDoctorSlots } = useCustomApiIntegration({ clinicId, configId })
  const { data: bookingData, setSlot, setAvailableDoctorsForSlot, setSelectedTimeSlot } = useBookingContext()

  const [times, setTimes] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState({ completed: 0, total: 0 })
  const [selectedDate, setSelectedDate] = useState(initialDate || new Date().toISOString().split('T')[0])
  const mountedRef = useRef(true)
  const fetchIdRef = useRef(0)
  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false } }, [])

  const fetchAllSlots = useCallback(async (date: string) => {
    // Increment fetch ID so stale responses from previous dates are ignored
    const currentFetchId = ++fetchIdRef.current
    setLoading(true)
    setError(null)
    setTimes([])
    setProgress({ completed: 0, total: 0 })
    try {
      // Get all active doctors for this clinic from local DB
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabase = createClient() as any
      const { data: dbDoctors } = await supabase
        .from('custom_api_doctors')
        .select('external_doctor_id, doctor_name, specialty, avatar_url')
        .eq('clinic_id', clinicId)
        .eq('is_active', true)
        .order('doctor_name')

      if (fetchIdRef.current !== currentFetchId) return // stale
      if (!dbDoctors || dbDoctors.length === 0) {
        setError('No doctors available at this clinic.')
        return
      }

      const doctors = dbDoctors.map((d: { external_doctor_id: string; doctor_name: string; specialty: string | null; avatar_url: string | null }) => ({
        id: d.external_doctor_id,
        name: d.doctor_name,
        specialty: d.specialty,
        avatarUrl: d.avatar_url,
      }))

      setProgress({ completed: 0, total: doctors.length })

      const result = await getAllDoctorSlots(
        doctors,
        date,
        (completed, total) => {
          if (mountedRef.current && fetchIdRef.current === currentFetchId) {
            setProgress({ completed, total })
          }
        },
      )

      if (!mountedRef.current || fetchIdRef.current !== currentFetchId) return // stale
      setTimes(result.times)
      setAvailableDoctorsForSlot(result.doctorsByTime)
    } catch {
      if (fetchIdRef.current === currentFetchId) {
        setError('Could not load available times. Please try again.')
      }
    } finally {
      if (fetchIdRef.current === currentFetchId) {
        setLoading(false)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clinicId, configId, getAllDoctorSlots, setAvailableDoctorsForSlot])

  // Fetch when selectedDate changes
  useEffect(() => { fetchAllSlots(selectedDate) }, [selectedDate, fetchAllSlots])

  // Date navigation
  const today = useMemo(() => new Date().toISOString().split('T')[0], [])
  const [windowStart, setWindowStart] = useState(today)

  const dates = useMemo(() => {
    const base = new Date(windowStart + 'T00:00:00')
    const arr: string[] = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(base)
      d.setDate(base.getDate() + i)
      arr.push(d.toISOString().split('T')[0])
    }
    return arr
  }, [windowStart])

  const shiftWindow = useCallback((dir: 'prev' | 'next') => {
    setWindowStart((prev) => {
      const base = new Date(prev + 'T00:00:00')
      base.setDate(base.getDate() + (dir === 'prev' ? -7 : 7))
      if (base.toISOString().split('T')[0] < today) return today
      return base.toISOString().split('T')[0]
    })
  }, [today])

  function handleSlotClick(time: string) {
    setSelectedTimeSlot(time)
    setSlot({
      id: `time_${time}`, // temporary — replaced with real slotId when doctor is chosen
      appointment_date: selectedDate,
      start_time: time,
      end_time: '',
    })
    onSelect(`time_${time}`)
  }

  function formatTime(time: string): string {
    if (!time) return ''
    let timePart = time
    if (time.includes(' ')) {
      timePart = time.split(' ')[1] ?? time
    }
    const parts = timePart.split(':')
    if (parts.length < 2) return time
    const h = parseInt(parts[0], 10)
    const m = parts[1]
    if (isNaN(h)) return time
    const period = h >= 12 ? 'PM' : 'AM'
    const hour = h % 12 || 12
    return `${hour}:${m} ${period}`
  }

  return (
    <div className="bg-white rounded-2xl border border-lhc-border p-6 shadow-sm space-y-4">
      <div>
        <h2 className="text-lg font-bold text-lhc-text-main">Select Date & Time</h2>
        <p className="text-sm text-lhc-text-muted mt-1">Choose an available appointment slot across all practitioners</p>
      </div>

      {/* Date picker */}
      <DateStrip
        dates={dates}
        selectedDate={selectedDate}
        onSelect={(date) => setSelectedDate(date)}
        onPrev={() => shiftWindow('prev')}
        onNext={() => shiftWindow('next')}
        canGoPrev={windowStart > today}
      />

      {/* Slots */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-lhc-primary" />
          <span className="text-lhc-text-muted text-sm">
            {progress.total > 0
              ? `Loading availability... (${progress.completed}/${progress.total} practitioners)`
              : 'Loading availability...'}
          </span>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center py-12 text-center gap-3">
          <AlertCircle className="w-8 h-8 text-red-400" />
          <p className="text-lhc-text-muted">{error}</p>
          <button onClick={() => fetchAllSlots(selectedDate)} className="text-lhc-primary text-sm font-medium hover:underline">
            Try Again
          </button>
        </div>
      ) : times.length === 0 ? (
        <div className="flex flex-col items-center py-12 text-center gap-3">
          <CalendarDays className="w-8 h-8 text-lhc-text-muted/40" />
          <p className="text-lhc-text-muted">No available slots for this date.</p>
          <p className="text-xs text-lhc-text-muted">Try selecting a different date above.</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
          {times.map((time) => {
            const doctorCount = bookingData.availableDoctorsForSlot?.[time]?.length ?? 0
            return (
              <button
                key={time}
                onClick={() => handleSlotClick(time)}
                className="flex flex-col items-center justify-center gap-1 px-3 py-3 rounded-lg border border-lhc-border hover:border-lhc-primary hover:bg-lhc-primary/5 transition-all text-sm font-medium text-lhc-text-main"
              >
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-lhc-text-muted" />
                  {formatTime(time)}
                </div>
                {doctorCount > 0 && (
                  <span className="flex items-center gap-1 text-[10px] text-lhc-text-muted">
                    <Users className="w-3 h-3" />
                    {doctorCount} {doctorCount === 1 ? 'doctor' : 'doctors'}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
