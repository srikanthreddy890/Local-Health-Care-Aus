'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search, MapPin, Phone, Bell, Star, Building2, ChevronDown, ChevronUp, Heart, CheckCircle, Clock, Loader2, Trash2, SlidersHorizontal } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useFavoriteClinics } from '@/lib/hooks/useFavoriteClinics'
import { useAppointmentPreferences } from '@/lib/hooks/useAppointmentPreferences'
import PreferredAppointmentForm from '../preferences/PreferredAppointmentForm'
import { toast } from '@/lib/toast'
import { cn, getInitials } from '@/lib/utils'
import { useQuery } from '@tanstack/react-query'
import { pointsToAud } from '@/lib/constants/loyalty'

const TYPE_FILTERS = ['All', 'General Practice', 'Dental', 'Allied Health', 'Specialist', 'Mental Health', 'Physiotherapy']

interface Clinic {
  id: string
  name: string
  logo_url?: string | null
  city?: string | null
  state?: string | null
  address_line1?: string | null
  address_line2?: string | null
  zip_code?: string | null
  phone?: string | null
  email?: string | null
  clinic_type?: string | null
  sub_type?: string | null
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
  const [lastBookingDate, setLastBookingDate] = useState<string | null>(null)
  const [browseOpen, setBrowseOpen] = useState(true)
  const [loading, setLoading] = useState(true)
  const [showFilters, setShowFilters] = useState(false)
  const { isFavorite, toggleFavorite } = useFavoriteClinics(userId)
  const { preferences, createPreference, deletePreference } = useAppointmentPreferences(userId)
  const [showReminderForm, setShowReminderForm] = useState(false)
  const [deletingReminderId, setDeletingReminderId] = useState<string | null>(null)

  // Fetch loyalty points for the personalized widget
  const { data: loyaltyPoints } = useQuery({
    queryKey: ['loyalty-points-mini', userId],
    queryFn: async () => {
      const supabase = createClient()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any)
        .from('loyalty_accounts')
        .select('total_points')
        .eq('user_id', userId)
        .maybeSingle()
      return (data?.total_points ?? 0) as number
    },
  })

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const supabase = createClient()

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: clinicsData, error: clinicsError } = await (supabase as any)
        .from('clinics_public')
        .select('id, name, logo_url, city, state, address_line1, address_line2, zip_code, phone, email, clinic_type, sub_type, is_verified')
        .limit(50)

      if (clinicsError) throw clinicsError
      if (clinicsData) setClinics(clinicsData)

      // Last booking
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: lastBooking } = await (supabase as any)
        .from('bookings')
        .select('clinic_id, created_at')
        .eq('patient_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (lastBooking?.clinic_id) {
        if (lastBooking.created_at) {
          setLastBookingDate(new Date(lastBooking.created_at).toLocaleDateString('en-AU', {
            day: 'numeric', month: 'short', year: 'numeric',
          }))
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: clinicData } = await (supabase as any)
          .from('clinics_public')
          .select('id, name, logo_url, city, state, address_line1, address_line2, zip_code, phone, email, clinic_type, sub_type, is_verified')
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

  const matchesClinicSearch = (c: Clinic, q: string) =>
    !q ||
    c.name.toLowerCase().includes(q) ||
    (c.city ?? '').toLowerCase().includes(q) ||
    (c.state ?? '').toLowerCase().includes(q) ||
    (c.address_line1 ?? '').toLowerCase().includes(q) ||
    (c.address_line2 ?? '').toLowerCase().includes(q) ||
    (c.zip_code ?? '').toLowerCase().includes(q) ||
    (c.phone ?? '').toLowerCase().includes(q) ||
    (c.email ?? '').toLowerCase().includes(q) ||
    (c.clinic_type ?? '').toLowerCase().includes(q) ||
    (c.sub_type ?? '').toLowerCase().includes(q)

  const matchesClinicType = (c: Clinic, filter: string) =>
    filter === 'All' ||
    (c.clinic_type ?? '').toLowerCase().includes(filter.toLowerCase())

  const filtered = clinics.filter((c) => {
    return matchesClinicSearch(c, search.toLowerCase()) && matchesClinicType(c, typeFilter)
  })

  const nextMilestone = 50
  const pointsNeeded = Math.max(0, nextMilestone - (loyaltyPoints ?? 0))
  const progressPct = Math.min(100, ((loyaltyPoints ?? 0) / nextMilestone) * 100)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* ── Left column ───────────────────────────────────────────────────── */}
      <div className="lg:col-span-2 space-y-5">

        {/* Search + filter — unified module */}
        <div className="bg-white dark:bg-lhc-surface rounded-2xl border border-lhc-border p-6 shadow-sm">
          <h2 className="text-xl font-bold text-lhc-text-main mb-1">Find a Clinic</h2>
          <p className="text-sm text-lhc-text-muted mb-4">Search by name, location, or specialty</p>

          <div className="flex gap-2 mb-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-lhc-text-muted" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="e.g. Sydney Dental, GP near me..."
                className="w-full pl-10 pr-4 py-2.5 border border-lhc-border rounded-xl text-sm bg-lhc-background text-lhc-text-main placeholder-lhc-text-muted focus:outline-none focus:ring-2 focus:ring-lhc-primary/30 focus:border-lhc-primary transition"
              />
            </div>
            <button
              onClick={() => setShowFilters((v) => !v)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2.5 border rounded-xl text-sm font-medium transition-colors',
                showFilters
                  ? 'border-lhc-primary text-lhc-primary bg-lhc-primary/5'
                  : 'border-lhc-border text-lhc-text-muted hover:border-lhc-primary/60 hover:text-lhc-primary',
              )}
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span className="hidden sm:inline">Filters</span>
            </button>
          </div>

          {/* Category pills — attached to search */}
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

          {/* Expanded filter panel */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-lhc-border grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-medium text-lhc-text-muted block mb-1.5">Location</label>
                <input
                  type="text"
                  placeholder="Suburb or postcode"
                  className="w-full px-3 py-2 border border-lhc-border rounded-lg text-sm bg-lhc-background text-lhc-text-main placeholder-lhc-text-muted focus:outline-none focus:ring-2 focus:ring-lhc-primary/30"
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-lhc-text-muted block mb-1.5">Availability</label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border border-lhc-border rounded-lg text-sm bg-lhc-background text-lhc-text-main focus:outline-none focus:ring-2 focus:ring-lhc-primary/30"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-lhc-text-muted block mb-1.5">Clinic Status</label>
                <select className="w-full px-3 py-2 border border-lhc-border rounded-lg text-sm bg-lhc-background text-lhc-text-main focus:outline-none focus:ring-2 focus:ring-lhc-primary/30">
                  <option>All clinics</option>
                  <option>Verified only</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Last visited clinic — enhanced "Book Again" card */}
        {lastClinic && matchesClinicSearch(lastClinic, search.toLowerCase()) && matchesClinicType(lastClinic, typeFilter) && (
          <div className="bg-green-50/80 dark:bg-green-950/20 border border-green-200 dark:border-green-800 border-l-4 border-l-lhc-primary rounded-2xl p-5">
            <p className="text-xs font-semibold text-green-700 dark:text-green-400 uppercase tracking-wide mb-3">Book Again</p>
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
                {lastBookingDate && (
                  <p className="text-xs text-lhc-text-muted mb-1">Last visited: {lastBookingDate}</p>
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
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => toggleFavorite(lastClinic.id)}
                  className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors cursor-pointer"
                  title={isFavorite(lastClinic.id) ? 'Remove from favorites' : 'Add to favorites'}
                >
                  <Heart className={`w-5 h-5 transition-colors ${isFavorite(lastClinic.id) ? 'fill-red-500 text-red-500' : 'text-lhc-text-muted hover:text-red-400'}`} />
                </button>
                <button
                  onClick={() => onClinicSelect(lastClinic.id, lastClinic.name)}
                  className="bg-lhc-primary hover:bg-lhc-primary-hover text-white font-semibold rounded-xl px-4 py-2 text-sm transition-colors"
                >
                  Book
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Clinic list — enhanced rows */}
        <div className="bg-white dark:bg-lhc-surface rounded-2xl border border-lhc-border shadow-sm overflow-hidden">
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
                <div className="px-5 py-8 text-center text-sm text-lhc-text-muted">Loading clinics...</div>
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
                          <span className="text-[10px] font-bold bg-lhc-primary/10 text-lhc-primary px-1.5 py-0.5 rounded-full">&#x2713;</span>
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
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => toggleFavorite(clinic.id)}
                        className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors cursor-pointer"
                        title={isFavorite(clinic.id) ? 'Remove from favorites' : 'Add to favorites'}
                      >
                        <Heart className={`w-4 h-4 transition-colors ${isFavorite(clinic.id) ? 'fill-red-500 text-red-500' : 'text-lhc-text-muted hover:text-red-400'}`} />
                      </button>
                      <button
                        onClick={() => onClinicSelect(clinic.id, clinic.name)}
                        className="bg-lhc-primary hover:bg-lhc-primary-hover text-white font-semibold rounded-xl px-3.5 py-1.5 text-sm transition-colors"
                      >
                        Book
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Right column ─────────────────────────────────────────────────── */}
      <div className="space-y-4">
        {/* Appointment Reminders — redesigned empty state */}
        <div className="bg-white dark:bg-lhc-surface rounded-2xl border border-lhc-border p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-lhc-primary" />
              <h3 className="font-semibold text-lhc-text-main">Appointment Reminders</h3>
            </div>
          </div>

          {preferences.length === 0 ? (
            <div className="text-center py-4 space-y-3">
              <div className="relative inline-flex">
                <Bell className="w-10 h-10 text-teal-400 animate-[bell-rock_1s_ease-in-out]" />
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-teal-500" />
                </span>
              </div>
              <div>
                <p className="text-sm font-semibold text-lhc-text-main">Stay ahead of your health</p>
                <p className="text-xs text-lhc-text-muted mt-1">Get notified when your preferred clinic has new slots.</p>
              </div>
              <button
                onClick={() => setShowReminderForm(true)}
                className="w-full bg-lhc-primary text-white font-semibold rounded-xl px-4 py-2.5 text-sm hover:bg-lhc-primary/90 transition-colors"
              >
                + Add Reminder
              </button>
            </div>
          ) : (
            <>
              <p className="text-sm text-lhc-text-muted mb-4">
                Get notified when your preferred clinic has new availability.
              </p>
              <button
                onClick={() => setShowReminderForm(true)}
                className="w-full bg-lhc-primary text-white font-semibold rounded-xl px-4 py-2 text-sm hover:bg-lhc-primary/90 transition-colors mb-4"
              >
                + Add Reminder
              </button>
              <div className="space-y-3">
                {preferences.map((pref) => (
                  <div key={pref.id} className="border border-lhc-border rounded-lg p-3 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-lhc-text-main truncate">
                        {pref.clinic?.name ?? 'Clinic'}
                      </p>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {pref.status === 'notified' ? (
                          <span className="flex items-center gap-1 text-[10px] font-semibold text-green-600 bg-green-50 dark:bg-green-950/20 rounded-full px-2 py-0.5">
                            <CheckCircle className="w-3 h-3" /> Found
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-[10px] font-semibold text-lhc-primary bg-lhc-primary/10 rounded-full px-2 py-0.5">
                            <Clock className="w-3 h-3" /> Waiting
                          </span>
                        )}
                        <button
                          onClick={async () => {
                            setDeletingReminderId(pref.id)
                            await deletePreference(pref.id)
                            setDeletingReminderId(null)
                          }}
                          disabled={deletingReminderId === pref.id}
                          className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 rounded transition-colors"
                        >
                          {deletingReminderId === pref.id
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : <Trash2 className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-lhc-text-muted">
                      {pref.preferred_date} at {pref.preferred_time}
                    </p>
                    {pref.doctor && (
                      <p className="text-xs text-lhc-text-muted">{pref.doctor.full_name}</p>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <PreferredAppointmentForm
          open={showReminderForm}
          onOpenChange={setShowReminderForm}
          onSubmit={createPreference}
        />

        {/* Personalized loyalty progress widget */}
        <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <Star className="w-4 h-4 text-lhc-primary" />
            <p className="text-sm font-semibold text-lhc-primary">Your Rewards</p>
          </div>
          <p className="text-xs text-lhc-text-muted leading-relaxed mb-3">
            {(loyaltyPoints ?? 0) > 0
              ? `You have ${loyaltyPoints} pts — ${pointsNeeded > 0 ? `book ${Math.ceil(pointsNeeded / 10)} more appointment${Math.ceil(pointsNeeded / 10) !== 1 ? 's' : ''} to earn $${pointsToAud(nextMilestone)} AUD off.` : `you can redeem $${pointsToAud(loyaltyPoints ?? 0)} AUD!`}`
              : 'Every appointment earns you points. Redeem them for discounts on future visits.'
            }
          </p>
          {(loyaltyPoints ?? 0) > 0 && (
            <div className="w-full h-1.5 bg-green-200 dark:bg-green-900 rounded-full overflow-hidden mb-2">
              <div
                className="h-full bg-lhc-primary rounded-full transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
