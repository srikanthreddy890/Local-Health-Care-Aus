'use client'

import { useState } from 'react'
import { Stethoscope, Shuffle, AlertCircle } from 'lucide-react'
import { useBookingContext, type DoctorSlotEntry } from './BookingContext'
import DefaultAvatar from '@/components/DefaultAvatar'

interface Props {
  clinicId: string
  configId: string
  selectedTime: string
  onSelect: (doctorId: string, realSlotId: string) => void
}

export default function CustomApiDoctorSelectStep({
  clinicId,
  configId,
  selectedTime,
  onSelect,
}: Props) {
  const { data: bookingData, setDoctor, setSlot } = useBookingContext()
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const availableDoctors: DoctorSlotEntry[] = bookingData.availableDoctorsForSlot?.[selectedTime] ?? []

  function formatTime(time: string): string {
    if (!time) return ''
    const parts = time.split(':')
    if (parts.length < 2) return time
    const h = parseInt(parts[0], 10)
    const m = parts[1]
    if (isNaN(h)) return time
    return `${h % 12 || 12}:${m} ${h >= 12 ? 'PM' : 'AM'}`
  }

  function handleDoctorSelect(entry: DoctorSlotEntry) {
    setSelectedId(entry.doctorId)

    // Parse doctor name — strip "Dr" prefix
    let cleanName = entry.doctorName.trim()
    if (cleanName.startsWith('Dr.')) cleanName = cleanName.slice(3).trim()
    else if (cleanName.startsWith('Dr ')) cleanName = cleanName.slice(3).trim()
    const nameParts = cleanName.split(' ')

    setDoctor({
      id: entry.doctorId,
      first_name: nameParts[0] ?? cleanName,
      last_name: nameParts.slice(1).join(' ') ?? '',
      specialty: entry.specialty ?? null,
      avatar_url: entry.avatarUrl ?? null,
    })

    // Replace the temporary time-based slot_id with the real external API slotId
    setSlot({
      id: entry.slotId,
      appointment_date: bookingData.slot?.appointment_date ?? '',
      start_time: selectedTime,
      end_time: bookingData.slot?.end_time ?? '',
    })

    onSelect(entry.doctorId, entry.slotId)
  }

  function handleAnyPractitioner() {
    if (availableDoctors.length === 0) return
    const randomIndex = Math.floor(Math.random() * availableDoctors.length)
    handleDoctorSelect(availableDoctors[randomIndex])
  }

  if (availableDoctors.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-lhc-border p-8 shadow-sm">
        <div className="flex flex-col items-center py-12 text-center gap-3">
          <AlertCircle className="w-8 h-8 text-red-400" />
          <p className="text-lhc-text-muted">No doctors available for this time slot. Please go back and choose a different time.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-lhc-border p-6 shadow-sm space-y-4">
      <div>
        <h2 className="text-lg font-bold text-lhc-text-main">Select a Practitioner</h2>
        <p className="text-sm text-lhc-text-muted mt-1">
          {availableDoctors.length} {availableDoctors.length === 1 ? 'practitioner' : 'practitioners'} available at {formatTime(selectedTime)}
        </p>
      </div>

      <div className="grid gap-3">
        {/* Any Practitioner option */}
        <button
          onClick={handleAnyPractitioner}
          className="flex items-center gap-4 p-4 rounded-xl border-2 border-dashed border-lhc-primary/40 hover:border-lhc-primary hover:bg-lhc-primary/5 transition-all text-left w-full"
        >
          <div className="w-12 h-12 rounded-full bg-lhc-primary/10 flex items-center justify-center shrink-0">
            <Shuffle className="w-5 h-5 text-lhc-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-lhc-primary">Any Practitioner</p>
            <p className="text-sm text-lhc-text-muted">We&apos;ll assign an available practitioner for you</p>
          </div>
        </button>

        {/* Individual doctors */}
        {availableDoctors.map((entry, idx) => {
          const isSelected = selectedId === entry.doctorId
          // Display name — strip "Dr" prefix to avoid "Dr. Dr X"
          let displayName = entry.doctorName.trim()
          if (!displayName.startsWith('Dr')) displayName = `Dr. ${displayName}`

          return (
            <button
              key={entry.doctorId}
              onClick={() => handleDoctorSelect(entry)}
              className={`flex items-center gap-4 p-4 rounded-xl border transition-all text-left w-full ${
                isSelected
                  ? 'border-lhc-primary bg-lhc-primary/5 shadow-md'
                  : 'border-lhc-border hover:border-lhc-primary/50 hover:shadow-md'
              }`}
            >
              <div className="w-12 h-12 rounded-full overflow-hidden shrink-0 shadow-sm">
                {entry.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={entry.avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <DefaultAvatar variant="doctor" className="w-full h-full rounded-full" colorIndex={idx} />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-lhc-text-main">{displayName}</p>
                {entry.specialty && (
                  <p className="text-sm text-lhc-text-muted">{entry.specialty}</p>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
