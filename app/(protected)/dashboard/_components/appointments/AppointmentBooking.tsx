'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search, MapPin, Phone, Bell, Star, Building2, ChevronDown, ChevronUp } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from '@/lib/toast'
import { cn, getInitials } from '@/lib/utils'

const TYPE_FILTERS = ['All', 'General Practice', 'Dental', 'Allied Health', 'Specialist', 'Mental Health', 'Physiotherapy']

interface Clinic {
  id: string
  name: string
  logo_url?: string | null
  city?: string | null
  state?: string | null
  address_line1?: string | null
  phone?: string | null
  email?: string | null
  clinic_type?: string | null
  is_verified?: boolean | null
}

interface Props {
  userId: string
  onClinicSelect: (id: string, name: string) => void
}


function ClinicAvatar({ name, logo_url }: { name: string; logo_url?: string | null }) {
  if (logo_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={logo_url} alt={name} className="w-11 h-11 rounded-xl object-cover flex-shrink-0" />
    )
  }
  return (
    <div className="w-11 h-11 rounded-xl bg-lhc-primary/10 flex items-center justify-center text-lhc-primary font-bold text-sm flex-shrink-0">
      {getInitials(name)}
    </div>
  )
}

export default function AppointmentBooking({ userId, onClinicSelect }: Props) {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('All')
  const [clinics, setClinics] = useState<Clinic[]>([])
  const [lastClinic, setLastClinic] = useState<Clinic | null>(null)
  const [browseOpen, setBrowseOpen] = useState(true)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const supabase = createClient()

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: clinicsData, error: clinicsError } = await (supabase as any)
        .from('clinics_public')
        .select('id, name, logo_url, city, state, address_line1, phone, email, clinic_type, is_verified')
        .limit(50)

      if (clinicsError) throw clinicsError
      if (clinicsData) setClinics(clinicsData)

      // Last booking → last clinic (used for "Book Again" card)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: lastBooking } = await (supabase as any)
        .from('bookings')
        .select('clinic_id')
        .eq('patient_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (lastBooking?.clinic_id) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: clinicData } = await (supabase as any)
          .from('clinics_public')
          .select('id, name, logo_url, city, state, address_line1, phone, email, clinic_type, is_verified')
          .eq('id', lastBooking.clinic_id)
          .single()
        if (clinicData) setLastClinic(clinicData)
      }
    } catch (err) {
      toast({
        title: 'Could not load clinics',
        description: err instanceof Error ? err.message : 'Please check your connection and try again.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => { fetchData() }, [fetchData])

  const filtered = clinics.filter((c) => {
    const q = search.toLowerCase()
    const matchesSearch =
      !search ||
      c.name.toLowerCase().includes(q) ||
      (c.city ?? '').toLowerCase().includes(q) ||
      (c.clinic_type ?? '').toLowerCase().includes(q)
    const matchesType =
      typeFilter === 'All' ||
      (c.clinic_type ?? '').toLowerCase().includes(typeFilter.toLowerCase())
    return matchesSearch && matchesType
  })

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* ── Left column ───────────────────────────────────────────────────── */}
      <div className="lg:col-span-2 space-y-5">

        {/* Search + filter */}
        <div className="bg-white rounded-2xl border border-lhc-border p-6 shadow-sm">
          <h2 className="text-xl font-bold text-lhc-text-main mb-1">Find a Clinic</h2>
          <p className="text-sm text-lhc-text-muted mb-4">Search by name, location, or specialty</p>

          <div className="relative mb-4">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-lhc-text-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="e.g. Sydney Dental, GP near me…"
              className="w-full pl-10 pr-4 py-2.5 border border-lhc-border rounded-xl text-sm bg-lhc-background text-lhc-text-main placeholder-lhc-text-muted focus:outline-none focus:ring-2 focus:ring-lhc-primary/30 focus:border-lhc-primary transition"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {TYPE_FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setTypeFilter(f)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-xs font-semibold border transition-all',
                  typeFilter === f
                    ? 'bg-lhc-primary text-white border-lhc-primary'
                    : 'border-lhc-border text-lhc-text-muted hover:border-lhc-primary/60 hover:text-lhc-primary',
                )}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Last visited clinic */}
        {lastClinic && (
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-5">
            <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-3">Book Again</p>
            <div className="flex items-start gap-4">
              <ClinicAvatar name={lastClinic.name} logo_url={lastClinic.logo_url} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                  <p className="font-semibold text-lhc-text-main">{lastClinic.name}</p>
                  {lastClinic.is_verified && (
                    <span className="text-[10px] font-bold bg-lhc-primary/10 text-lhc-primary px-1.5 py-0.5 rounded-full">Verified</span>
                  )}
                </div>
                {lastClinic.clinic_type && (
                  <p className="text-xs text-lhc-text-muted mb-1">{lastClinic.clinic_type}</p>
                )}
                {(lastClinic.city || lastClinic.state) && (
                  <p className="text-sm text-lhc-text-muted flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {[lastClinic.city, lastClinic.state].filter(Boolean).join(', ')}
                  </p>
                )}
                {lastClinic.phone && (
                  <p className="text-sm text-lhc-text-muted flex items-center gap-1 mt-0.5">
                    <Phone className="w-3 h-3" />
                    {lastClinic.phone}
                  </p>
                )}
              </div>
              <button
                onClick={() => onClinicSelect(lastClinic.id, lastClinic.name)}
                className="flex-shrink-0 bg-lhc-primary hover:bg-lhc-primary-hover text-white font-semibold rounded-xl px-4 py-2 text-sm transition-colors"
              >
                Book
              </button>
            </div>
          </div>
        )}

        {/* Clinic list */}
        <div className="bg-white rounded-2xl border border-lhc-border shadow-sm overflow-hidden">
          <button
            onClick={() => setBrowseOpen((v) => !v)}
            className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-lhc-background/50 transition-colors"
          >
            <div>
              <h3 className="font-semibold text-lhc-text-main">Browse Clinics</h3>
              {!loading && (
                <p className="text-xs text-lhc-text-muted mt-0.5">{filtered.length} clinic{filtered.length !== 1 ? 's' : ''} available</p>
              )}
            </div>
            {browseOpen
              ? <ChevronUp className="w-4 h-4 text-lhc-text-muted" />
              : <ChevronDown className="w-4 h-4 text-lhc-text-muted" />
            }
          </button>

          {browseOpen && (
            <div className="divide-y divide-lhc-border/60">
              {loading ? (
                <div className="px-5 py-8 text-center text-sm text-lhc-text-muted">Loading clinics…</div>
              ) : filtered.length === 0 ? (
                <div className="px-5 py-8 text-center">
                  <Building2 className="w-8 h-8 text-lhc-text-muted/30 mx-auto mb-2" />
                  <p className="text-sm text-lhc-text-muted">No clinics match your search.</p>
                </div>
              ) : (
                filtered.map((clinic) => (
                  <div
                    key={clinic.id}
                    className="flex items-center gap-3 px-5 py-3.5 hover:bg-lhc-background/40 transition-colors"
                  >
                    <ClinicAvatar name={clinic.name} logo_url={clinic.logo_url} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="font-medium text-lhc-text-main text-sm">{clinic.name}</p>
                        {clinic.is_verified && (
                          <span className="text-[10px] font-bold bg-lhc-primary/10 text-lhc-primary px-1.5 py-0.5 rounded-full">✓</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-wrap mt-0.5">
                        {clinic.clinic_type && (
                          <span className="text-xs text-lhc-text-muted bg-lhc-background px-2 py-0.5 rounded-full border border-lhc-border">
                            {clinic.clinic_type}
                          </span>
                        )}
                        {(clinic.city || clinic.state) && (
                          <span className="text-xs text-lhc-text-muted flex items-center gap-0.5">
                            <MapPin className="w-3 h-3" />
                            {[clinic.city, clinic.state].filter(Boolean).join(', ')}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => onClinicSelect(clinic.id, clinic.name)}
                      className="flex-shrink-0 bg-lhc-primary hover:bg-lhc-primary-hover text-white font-semibold rounded-xl px-3.5 py-1.5 text-sm transition-colors"
                    >
                      Book
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Right column ─────────────────────────────────────────────────── */}
      <div className="space-y-4">
        <div className="bg-white rounded-2xl border border-lhc-border p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Bell className="w-5 h-5 text-lhc-primary" />
            <h3 className="font-semibold text-lhc-text-main">Appointment Reminders</h3>
          </div>
          <p className="text-sm text-lhc-text-muted mb-4">
            Get notified when your preferred clinic has new availability.
          </p>
          <button
            disabled
            title="Coming soon"
            className="w-full bg-lhc-primary/40 text-white font-semibold rounded-xl px-4 py-2 text-sm cursor-not-allowed"
          >
            + Add Reminder
          </button>
          <div className="mt-5 flex flex-col items-center text-center py-3">
            <Bell className="w-8 h-8 text-lhc-text-muted/30 mb-2" />
            <p className="text-xs text-lhc-text-muted">No reminders set</p>
          </div>
        </div>

        <div className="bg-lhc-primary/5 border border-lhc-primary/20 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <Star className="w-4 h-4 text-lhc-primary" />
            <p className="text-sm font-semibold text-lhc-primary">Earn Loyalty Points</p>
          </div>
          <p className="text-xs text-lhc-text-muted leading-relaxed">
            Every appointment earns you points. Redeem them for discounts on future visits.
          </p>
        </div>
      </div>
    </div>
  )
}
