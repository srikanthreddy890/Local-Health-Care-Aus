'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Building2, Loader2, ClipboardList, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from '@/lib/toast'
import ClinicResultCard from './ClinicResultCard'
import SearchAutocomplete from './SearchAutocomplete'
import LocationAutocomplete from './LocationAutocomplete'
import FilterBar, { type Filters } from './FilterBar'

const PAGE_SIZE = 20

const TYPE_FILTERS = [
  { value: 'all',           label: 'All Clinics' },
  { value: 'dental',        label: 'Dental' },
  { value: 'gp',            label: 'GP / Medical' },
  { value: 'allied_health', label: 'Allied Health' },
  { value: 'specialist',    label: 'Specialist' },
  { value: 'mental_health', label: 'Mental Health' },
  { value: 'pharmacy',      label: 'Pharmacy' },
]

// ── Enriched clinic from RPC ────────────────────────────────────────────────
interface EnrichedClinic {
  id: string
  name: string
  description?: string | null
  logo_url?: string | null
  city?: string | null
  state?: string | null
  zip_code?: string | null
  address_line1?: string | null
  is_verified?: boolean | null
  clinic_type?: string | null
  specializations?: unknown
  operating_hours_detailed?: unknown
  health_funds_accepted?: unknown
  doctor_count: number
  doctor_avatars: { id: string; first_name: string; last_name: string; avatar_url?: string | null; specialty?: string | null }[]
  next_slot_date?: string | null
  next_slot_time?: string | null
  has_telehealth: boolean
}

interface ServiceFilter {
  id: string
  name: string
  clinicIds: string[]
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-lhc-border overflow-hidden animate-pulse p-6">
      <div className="flex gap-5">
        <div className="flex-1 space-y-3">
          <div className="h-5 bg-gray-200 rounded w-2/3" />
          <div className="h-3.5 bg-gray-100 rounded w-1/2" />
          <div className="h-3 bg-gray-100 rounded w-1/3" />
          <div className="flex gap-1 -space-x-2">
            {[1, 2, 3].map((i) => <div key={i} className="w-9 h-9 bg-gray-200 rounded-full border-2 border-white" />)}
          </div>
          <div className="h-4 bg-gray-100 rounded w-2/5" />
        </div>
        <div className="hidden sm:block w-24 h-24 bg-gray-200 rounded-xl flex-shrink-0" />
      </div>
    </div>
  )
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface Props {
  initialType: string
  initialPostcode: string
  initialService?: string
  onSelect: (clinicId: string) => void
  onSelectDoctor?: (clinicId: string, doctorId: string) => void
  onSelectServiceFromSearch?: (serviceId: string, serviceName: string, clinicId: string) => void
}

export default function ClinicSearchStep({ initialType, initialPostcode, initialService, onSelect, onSelectDoctor, onSelectServiceFromSearch }: Props) {
  const [clinics, setClinics] = useState<EnrichedClinic[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [locationTerm, setLocationTerm] = useState(initialPostcode)
  const [filters, setFilters] = useState<Filters>({ date: 'any', time: 'any', insurance: null })
  const [serviceFilter, setServiceFilter] = useState<ServiceFilter | null>(null)

  const mapInitialType = (t: string) => {
    const lower = t.toLowerCase()
    if (lower.includes('dental')) return 'dental'
    if (lower.includes('general') || lower.includes('gp')) return 'gp'
    if (lower.includes('physio') || lower.includes('allied')) return 'allied_health'
    if (lower.includes('mental')) return 'mental_health'
    if (lower.includes('specialist')) return 'specialist'
    if (lower.includes('pharmacy')) return 'pharmacy'
    return 'all'
  }

  const [typeFilter, setTypeFilter] = useState(initialType ? mapInitialType(initialType) : 'all')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const offsetRef = useRef(0)

  // ── Fetch clinics via RPC (single query with all enrichment) ────────────
  const fetchClinics = useCallback(async (search: string | null, type: string, offset: number, append: boolean) => {
    if (offset === 0) setLoading(true)
    else setLoadingMore(true)

    try {
      const supabase = createClient()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any).rpc('get_clinics_enriched', {
        p_search: search || null,
        p_clinic_type: type === 'all' ? null : type,
        p_limit: PAGE_SIZE,
        p_offset: offset,
      })
      if (error) throw error

      const results = (data ?? []) as unknown as EnrichedClinic[]
      if (append) {
        setClinics((prev) => [...prev, ...results])
      } else {
        setClinics(results)
      }
      setHasMore(results.length === PAGE_SIZE)
      offsetRef.current = offset + results.length
    } catch (err) {
      toast({ title: 'Could not load clinics', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' })
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [])

  // Initial load
  useEffect(() => {
    offsetRef.current = 0
    fetchClinics(locationTerm.trim() || null, typeFilter, 0, false)
  }, [fetchClinics, typeFilter]) // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced location search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      offsetRef.current = 0
      fetchClinics(locationTerm.trim() || null, typeFilter, 0, false)
    }, 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [locationTerm, fetchClinics, typeFilter])

  const loadMore = () => {
    fetchClinics(locationTerm.trim() || null, typeFilter, offsetRef.current, true)
  }

  // Pre-populate service filter from URL param
  useEffect(() => {
    if (!initialService) return
    const supabase = createClient()
    ;(async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any)
        .from('services_public')
        .select('id, clinic_id')
        .ilike('name', initialService)
      if (data && data.length > 0) {
        const clinicIds = [...new Set(data.map((r: { clinic_id: string }) => r.clinic_id))] as string[]
        setServiceFilter({ id: data[0].id, name: initialService, clinicIds })
      } else {
        // No exact match — still show as a label filter (won't restrict clinics)
        setServiceFilter({ id: '', name: initialService, clinicIds: [] })
      }
    })()
  }, [initialService])

  // Handle service selection from autocomplete
  const handleServiceSelected = useCallback(async (serviceId: string, serviceName: string, clinicId: string) => {
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from('services_public')
      .select('clinic_id')
      .ilike('name', serviceName)
    const clinicIds = data ? [...new Set(data.map((r: { clinic_id: string }) => r.clinic_id))] as string[] : [clinicId]
    setServiceFilter({ id: serviceId, name: serviceName, clinicIds })
    onSelectServiceFromSearch?.(serviceId, serviceName, clinicId)
  }, [onSelectServiceFromSearch])

  // Apply client-side filters (service, date/time)
  const filteredClinics = clinics.filter((c) => {
    if (serviceFilter && serviceFilter.clinicIds.length > 0 && !serviceFilter.clinicIds.includes(c.id)) return false

    if (filters.date !== 'any' || filters.time !== 'any') {
      if (!c.next_slot_date || !c.next_slot_time) return false
      const today = new Date().toISOString().split('T')[0]
      const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0]
      const next7 = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]

      if (filters.date === 'today' && c.next_slot_date !== today) return false
      if (filters.date === 'tomorrow' && c.next_slot_date !== tomorrow) return false
      if (filters.date === 'next7' && c.next_slot_date > next7) return false

      if (filters.time === 'am' && c.next_slot_time >= '12:00') return false
      if (filters.time === 'pm' && (c.next_slot_time < '12:00' || c.next_slot_time >= '18:00')) return false
      if (filters.time === 'afterhours' && c.next_slot_time < '18:00') return false
    }

    return true
  })

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-lhc-border shadow-sm">
        <div className="px-6 py-4 border-b border-lhc-border bg-lhc-background/40 rounded-t-2xl">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-lhc-primary/10 flex items-center justify-center">
              <Building2 className="w-4 h-4 text-lhc-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-lhc-text-main">Choose a Clinic</h3>
              <p className="text-xs text-lhc-text-muted mt-0.5">Select a registered clinic to book an appointment</p>
            </div>
          </div>
        </div>

        <div className="px-5 py-4 space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <SearchAutocomplete
              onSelectClinic={onSelect}
              onSelectDoctor={(clinicId, doctorId) => onSelectDoctor?.(clinicId, doctorId)}
              onSelectService={(id, name, clinicId) => handleServiceSelected(id, name, clinicId)}
              placeholder="Search services, clinics, or practitioners..."
              defaultValue={initialService}
            />
            <LocationAutocomplete
              value={locationTerm}
              onChange={setLocationTerm}
              placeholder="Suburb or postcode"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {TYPE_FILTERS.map((f) => (
              <button
                type="button"
                key={f.value}
                onClick={() => setTypeFilter(f.value)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                  typeFilter === f.value
                    ? 'bg-lhc-primary text-white border-lhc-primary shadow-sm'
                    : 'bg-white text-lhc-text-muted border-lhc-border hover:border-lhc-primary hover:text-lhc-primary'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {serviceFilter && (
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 bg-lhc-primary/10 text-lhc-primary border border-lhc-primary/20 rounded-full px-3.5 py-1.5 text-xs font-semibold">
                <ClipboardList className="w-3.5 h-3.5" />
                Service: {serviceFilter.name}
                <button type="button" onClick={() => setServiceFilter(null)} className="ml-1 hover:bg-lhc-primary/20 rounded-full p-0.5">
                  <X className="w-3 h-3" />
                </button>
              </span>
            </div>
          )}

          <FilterBar filters={filters} onChange={setFilters} />
        </div>
      </div>

      {/* Results count */}
      {!loading && (
        <p className="text-sm text-lhc-text-muted font-medium px-1">
          {filteredClinics.length} clinic{filteredClinics.length !== 1 ? 's' : ''}
          {typeFilter !== 'all' && ` · ${TYPE_FILTERS.find((f) => f.value === typeFilter)?.label}`}
          {locationTerm.trim() && ` near "${locationTerm}"`}
        </p>
      )}

      {/* Clinic list */}
      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : filteredClinics.length === 0 ? (
        <div className="text-center py-16 space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-lhc-background border border-lhc-border flex items-center justify-center mx-auto">
            <Building2 className="w-8 h-8 text-lhc-text-muted/50" />
          </div>
          <h3 className="font-bold text-lhc-text-main text-lg">No clinics found</h3>
          <p className="text-sm text-lhc-text-muted">Try a different search term or filter.</p>
          {(locationTerm || typeFilter !== 'all' || serviceFilter) && (
            <button
              type="button"
              onClick={() => { setLocationTerm(''); setTypeFilter('all'); setServiceFilter(null) }}
              className="text-sm text-lhc-primary font-semibold hover:underline"
            >
              Clear all filters
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {filteredClinics.map((clinic) => (
              <ClinicResultCard
                key={clinic.id}
                clinic={clinic}
                doctors={clinic.doctor_avatars ?? []}
                nextSlot={clinic.next_slot_date && clinic.next_slot_time ? { appointment_date: clinic.next_slot_date, start_time: clinic.next_slot_time } : null}
                hasTelehealth={clinic.has_telehealth}
                onSelect={() => onSelect(clinic.id)}
              />
            ))}
          </div>

          {/* Load more */}
          {hasMore && (
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={loadMore}
                disabled={loadingMore}
                className="bg-white border border-lhc-border hover:border-lhc-primary text-lhc-text-main hover:text-lhc-primary font-semibold px-8 py-2.5 rounded-xl text-sm transition-colors disabled:opacity-50 inline-flex items-center gap-2"
              >
                {loadingMore && <Loader2 className="w-4 h-4 animate-spin" />}
                {loadingMore ? 'Loading…' : 'Load More Clinics'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
