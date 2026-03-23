'use client'

import { useState, useEffect, useCallback } from 'react'
import { Stethoscope, Loader2, AlertCircle, Calendar, Search } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from '@/lib/toast'
import { getInitials, fmt12, fmtDate } from '@/lib/utils'

interface Doctor {
  id: string
  first_name: string
  last_name: string
  specialty?: string | null
  bio?: string | null
  avatar_url?: string | null
  consultation_fee?: number | null
  years_experience?: number | null
  next_slot_date?: string | null
  next_slot_time?: string | null
  slots_next_7_days?: number
}

interface Props {
  clinicId: string
  onSelect: (doctorId: string) => void
}

export default function DoctorSelectStep({ clinicId, onSelect }: Props) {
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [loading, setLoading] = useState(true)

  const fetchDoctors = useCallback(async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      // Single RPC returns doctors + next available slot + 7-day count
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any).rpc('get_doctors_with_availability', {
        p_clinic_id: clinicId,
      })
      if (error) throw error
      setDoctors((data ?? []) as unknown as Doctor[])
    } catch (err) {
      toast({ title: 'Could not load doctors', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [clinicId])

  useEffect(() => { fetchDoctors() }, [fetchDoctors])

  return (
    <div className="bg-white rounded-2xl border border-lhc-border shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-lhc-border bg-lhc-background/40">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-lhc-primary/10 flex items-center justify-center">
            <Stethoscope className="w-4 h-4 text-lhc-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-lhc-text-main">Select a Doctor</h3>
            <p className="text-xs text-lhc-text-muted mt-0.5">Choose a practitioner for your appointment</p>
          </div>
        </div>
      </div>

      <div className="p-5">
        {loading ? (
          <div className="flex items-center justify-center py-14 gap-2 text-lhc-text-muted">
            <Loader2 className="w-5 h-5 animate-spin text-lhc-primary" />
            <span className="text-sm">Loading doctors…</span>
          </div>
        ) : doctors.length === 0 ? (
          <div className="flex flex-col items-center py-14 text-center">
            <AlertCircle className="w-10 h-10 text-lhc-text-muted/25 mb-3" />
            <p className="font-medium text-lhc-text-main text-sm">No doctors listed</p>
            <p className="text-xs text-lhc-text-muted mt-1">This clinic hasn&apos;t added doctor profiles yet.</p>
          </div>
        ) : (
          <DoctorList doctors={doctors} onSelect={onSelect} />
        )}
      </div>
    </div>
  )
}

function DoctorList({ doctors, onSelect }: { doctors: Doctor[]; onSelect: (id: string) => void }) {
  const [search, setSearch] = useState('')
  const filtered = search.trim()
    ? doctors.filter((d) => {
        const term = search.toLowerCase()
        return (
          d.first_name.toLowerCase().includes(term) ||
          d.last_name.toLowerCase().includes(term) ||
          (d.specialty?.toLowerCase().includes(term) ?? false)
        )
      })
    : doctors

  return (
    <div className="space-y-3">
      {doctors.length >= 4 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-lhc-text-muted pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or specialty..."
            className="w-full h-10 pl-9 pr-4 border border-lhc-border rounded-lg text-sm text-lhc-text-main placeholder:text-lhc-text-muted focus:outline-none focus:border-lhc-primary transition-colors bg-lhc-background"
          />
        </div>
      )}

      {filtered.length === 0 ? (
        <p className="text-sm text-lhc-text-muted text-center py-6">No doctors match &quot;{search}&quot;</p>
      ) : (
        filtered.map((doc) => (
          <button
            type="button"
            key={doc.id}
            onClick={() => onSelect(doc.id)}
            className="w-full group text-left rounded-2xl border-2 border-lhc-border hover:border-lhc-primary bg-lhc-background/30 hover:bg-white p-4 sm:p-5 transition-all duration-150 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lhc-primary"
          >
            <div className="flex items-start gap-4">
              {doc.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={doc.avatar_url} alt="" className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />
              ) : (
                <div className="w-14 h-14 rounded-xl bg-lhc-primary/10 group-hover:bg-lhc-primary/15 flex items-center justify-center text-lhc-primary font-bold text-lg flex-shrink-0 transition-colors">
                  {getInitials(`${doc.first_name} ${doc.last_name}`)}
                </div>
              )}

              <div className="flex-1 min-w-0">
                <p className="font-bold text-lhc-text-main text-[15px] leading-tight">
                  Dr. {doc.first_name} {doc.last_name}
                </p>
                {doc.specialty && (
                  <p className="text-xs text-lhc-primary font-medium mt-0.5">{doc.specialty}</p>
                )}

                <div className="flex flex-wrap gap-1.5 mt-2">
                  {doc.years_experience != null && (
                    <span className="text-[11px] bg-lhc-background border border-lhc-border text-lhc-text-muted rounded-full px-2 py-0.5">
                      {doc.years_experience} yrs exp
                    </span>
                  )}
                  {doc.consultation_fee != null && (
                    <span className="text-[11px] bg-lhc-primary/8 border border-lhc-primary/20 text-lhc-primary font-semibold rounded-full px-2 py-0.5">
                      ${doc.consultation_fee}
                    </span>
                  )}
                  {(doc.slots_next_7_days ?? 0) > 0 && (
                    <span className="text-[11px] bg-green-50 border border-green-200 text-green-700 font-semibold rounded-full px-2 py-0.5">
                      {doc.slots_next_7_days} slots this week
                    </span>
                  )}
                </div>

                {doc.bio && (
                  <p className="text-xs text-lhc-text-muted mt-2 line-clamp-2 leading-relaxed">{doc.bio}</p>
                )}

                <div className="mt-3 pt-3 border-t border-lhc-border/60 flex items-center justify-between gap-2">
                  {doc.next_slot_date && doc.next_slot_time ? (
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-lhc-primary" />
                      <span className="text-xs text-lhc-text-muted">Next available:</span>
                      <span className="text-xs font-bold text-lhc-primary">
                        {fmtDate(doc.next_slot_date, { weekday: 'short', day: 'numeric', month: 'short' })}, {fmt12(doc.next_slot_time)}
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-lhc-text-muted italic">No online availability</span>
                  )}
                  <span className="text-xs font-bold text-lhc-primary group-hover:underline flex-shrink-0">Select →</span>
                </div>
              </div>
            </div>
          </button>
        ))
      )}
    </div>
  )
}
