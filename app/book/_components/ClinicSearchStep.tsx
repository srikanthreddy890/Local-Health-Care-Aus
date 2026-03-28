'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Building2, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from '@/lib/toast'
import { CATEGORIES, getCategoryBySlug } from '@/lib/categories'
import ClinicResultCard from './ClinicResultCard'
import SearchAutocomplete from './SearchAutocomplete'
import LocationAutocomplete from './LocationAutocomplete'
import FilterBar, { type Filters } from './FilterBar'

const PAGE_SIZE = 20

const CATEGORY_FILTERS = [
  { value: 'all', label: 'All Clinics' },
  ...CATEGORIES.map((c) => ({ value: c.slug, label: c.label })),
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
  custom_api_enabled?: boolean
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
  initialCategory: string
  initialPostcode: string
  onSelect: (clinicId: string) => void
  onSelectDoctor?: (clinicId: string, doctorId: string) => void
}

export default function ClinicSearchStep({ initialType, initialCategory, initialPostcode, onSelect, onSelectDoctor }: Props) {
  const [clinics, setClinics] = useState<EnrichedClinic[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [locationTerm, setLocationTerm] = useState(initialPostcode)
  const [filters, setFilters] = useState<Filters>({ date: 'any', time: 'any', insurance: null })

  // Resolve initial category: prefer ?category= param, fall back to legacy ?type= param
  const resolveInitialCategory = () => {
    if (initialCategory) {
      const match = CATEGORIES.find((c) => c.slug === initialCategory)
      if (match) return match.slug
    }
    if (initialType) {
      const lower = initialType.toLowerCase()
      if (lower.includes('dental')) return 'dentistry'
      if (lower.includes('general') || lower.includes('gp')) return 'general-practice'
      if (lower.includes('physio') || lower.includes('allied')) return 'physiotherapy'
      if (lower.includes('mental')) return 'mental-health'
      if (lower.includes('specialist')) return 'skin-cancer'
    }
    return 'all'
  }

  const initialCategorySlug = resolveInitialCategory()
  const [categoryFilter, setCategoryFilter] = useState(initialCategorySlug)

  // Resolve the label for the initial category so the search field shows it
  const initialCategoryLabel = initialCategorySlug !== 'all'
    ? (getCategoryBySlug(initialCategorySlug)?.label ?? '')
    : ''
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const offsetRef = useRef(0)

  // ── Fetch clinics via RPC (single query with all enrichment) ────────────
  const fetchClinics = useCallback(async (search: string | null, catSlug: string, offset: number, append: boolean) => {
    if (offset === 0) setLoading(true)
    else setLoadingMore(true)

    // Map category slug → clinic_type for the RPC
    const cat = getCategoryBySlug(catSlug)
    const clinicType = catSlug === 'all' ? null : (cat?.clinicType ?? null)

    try {
      const supabase = createClient()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any).rpc('get_clinics_enriched', {
        p_search: search || null,
        p_clinic_type: clinicType,
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
    fetchClinics(locationTerm.trim() || null, categoryFilter, 0, false)
  }, [fetchClinics, categoryFilter]) // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced location search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      offsetRef.current = 0
      fetchClinics(locationTerm.trim() || null, categoryFilter, 0, false)
    }, 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [locationTerm, fetchClinics, categoryFilter])

  const loadMore = () => {
    fetchClinics(locationTerm.trim() || null, categoryFilter, offsetRef.current, true)
  }

  // Handle category selection from autocomplete dropdown
  const handleSelectCategory = useCallback((slug: string) => {
    setCategoryFilter(slug)
  }, [])

  // Apply client-side filters (date/time)
  const filteredClinics = clinics.filter((c) => {
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
              onSelectCategory={handleSelectCategory}
              placeholder="Search specialities, clinics, or practitioners..."
              defaultValue={initialCategoryLabel}
            />
            <LocationAutocomplete
              value={locationTerm}
              onChange={setLocationTerm}
              placeholder="Suburb or postcode"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {CATEGORY_FILTERS.map((f) => (
              <button
                type="button"
                key={f.value}
                onClick={() => setCategoryFilter(f.value)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors border whitespace-nowrap flex-shrink-0 ${
                  categoryFilter === f.value
                    ? 'bg-lhc-primary text-white border-lhc-primary shadow-sm'
                    : 'bg-white text-lhc-text-muted border-lhc-border hover:border-lhc-primary hover:text-lhc-primary'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <FilterBar filters={filters} onChange={setFilters} />
        </div>
      </div>

      {/* Results count */}
      {!loading && (
        <p className="text-sm text-lhc-text-muted font-medium px-1">
          {filteredClinics.length} clinic{filteredClinics.length !== 1 ? 's' : ''}
          {categoryFilter !== 'all' && ` · ${CATEGORY_FILTERS.find((f) => f.value === categoryFilter)?.label}`}
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
          {(locationTerm || categoryFilter !== 'all') && (
            <button
              type="button"
              onClick={() => { setLocationTerm(''); setCategoryFilter('all') }}
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
                isCustomApi={!!clinic.custom_api_enabled}
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
