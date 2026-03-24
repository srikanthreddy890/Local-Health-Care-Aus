'use client'

import { useState, useEffect, useCallback } from 'react'
import { Stethoscope, Loader2, AlertCircle } from 'lucide-react'
import { useCustomApiIntegration, type CustomApiDoctor } from '@/lib/hooks/useCustomApiIntegration'
import { useBookingContext } from './BookingContext'

interface Props {
  clinicId: string
  configId: string
  onSelect: (doctorId: string) => void
}

export default function CustomApiDoctorSelectStep({ clinicId, configId, onSelect }: Props) {
  const { getDoctors } = useCustomApiIntegration({ clinicId, configId })
  const { setDoctor } = useBookingContext()
  const [doctors, setDoctors] = useState<CustomApiDoctor[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDoctors = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await getDoctors()
      setDoctors(result)
    } catch {
      setError('Could not load doctors from this clinic. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [getDoctors])

  useEffect(() => { fetchDoctors() }, [fetchDoctors])

  function handleSelect(doc: CustomApiDoctor) {
    // Set the doctor in context with adapted fields
    setDoctor({
      id: doc.id,
      first_name: doc.name.split(' ')[0] ?? doc.name,
      last_name: doc.name.split(' ').slice(1).join(' ') ?? '',
      specialty: doc.specialization ?? null,
      avatar_url: null,
    })
    onSelect(doc.id)
  }

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-lhc-border p-8 shadow-sm">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-lhc-primary mr-2" />
          <span className="text-lhc-text-muted">Loading doctors...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl border border-lhc-border p-8 shadow-sm">
        <div className="flex flex-col items-center py-12 text-center gap-3">
          <AlertCircle className="w-8 h-8 text-red-400" />
          <p className="text-lhc-text-muted">{error}</p>
          <button onClick={fetchDoctors} className="text-lhc-primary text-sm font-medium hover:underline">
            Try Again
          </button>
        </div>
      </div>
    )
  }

  if (doctors.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-lhc-border p-8 shadow-sm">
        <div className="flex flex-col items-center py-12 text-center gap-3">
          <Stethoscope className="w-8 h-8 text-lhc-text-muted/40" />
          <p className="text-lhc-text-muted">No doctors available at this clinic.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-lhc-border p-6 shadow-sm space-y-4">
      <div>
        <h2 className="text-lg font-bold text-lhc-text-main">Select a Doctor</h2>
        <p className="text-sm text-lhc-text-muted mt-1">Choose a practitioner for your appointment</p>
      </div>

      <div className="grid gap-3">
        {doctors.map((doc) => (
          <button
            key={doc.id}
            onClick={() => handleSelect(doc)}
            className="flex items-center gap-4 p-4 rounded-xl border border-lhc-border hover:border-lhc-primary/50 hover:shadow-md transition-all text-left w-full"
          >
            <div className="w-12 h-12 rounded-full bg-lhc-primary/10 flex items-center justify-center shrink-0">
              <Stethoscope className="w-5 h-5 text-lhc-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-lhc-text-main">{doc.name}</p>
              {doc.specialization && (
                <p className="text-sm text-lhc-text-muted">{doc.specialization}</p>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
