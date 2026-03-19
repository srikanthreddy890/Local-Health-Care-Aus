'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Search, MapPin, Phone, Globe, Navigation,
  Heart, Star, BadgeCheck, ChevronLeft, Loader2,
  Building2, X, Calendar, Mail,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { getInitials } from '@/lib/utils'
import ClaimProfileDialog from './ClaimProfileDialog'
import { useFavoriteClinics } from '@/lib/hooks/useFavoriteClinics'
import AddToFavoritesDialog from '@/components/AddToFavoritesDialog'

const APIFY_PAGE_SIZE = 100

// ── Type filter config ────────────────────────────────────────────────────────
const TYPE_FILTERS = [
  { value: 'all',          label: 'All Clinics' },
  { value: 'dental',       label: 'Dental' },
  { value: 'gp',           label: 'GP / Medical' },
  { value: 'allied_health',label: 'Allied Health' },
  { value: 'specialist',   label: 'Specialist' },
  { value: 'mental_health',label: 'Mental Health' },
  { value: 'pharmacy',     label: 'Pharmacy' },
]

const TYPE_STYLES: Record<string, { badge: string; initials: string; avatarBg: string }> = {
  dental:        { badge: 'bg-sky-50 text-sky-700 border-sky-200',           initials: 'text-sky-600',     avatarBg: 'bg-sky-50' },
  gp:            { badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', initials: 'text-emerald-600', avatarBg: 'bg-emerald-50' },
  allied_health: { badge: 'bg-violet-50 text-violet-700 border-violet-200',   initials: 'text-violet-600',  avatarBg: 'bg-violet-50' },
  specialist:    { badge: 'bg-amber-50 text-amber-700 border-amber-200',      initials: 'text-amber-600',   avatarBg: 'bg-amber-50' },
  mental_health: { badge: 'bg-pink-50 text-pink-700 border-pink-200',         initials: 'text-pink-600',    avatarBg: 'bg-pink-50' },
  pharmacy:      { badge: 'bg-teal-50 text-teal-700 border-teal-200',         initials: 'text-teal-600',    avatarBg: 'bg-teal-50' },
}

// ── Unified Clinic type ───────────────────────────────────────────────────────
interface Clinic {
  id: string
  name: string
  description?: string | null
  // address — apify uses full `address`, registered uses `address_line1`
  address?: string | null
  address_line1?: string | null
  city?: string | null
  state?: string | null
  zip_code?: string | null
  phone?: string | null
  email?: string | null
  website?: string | null
  logo_url?: string | null      // registered only
  image_url?: string | null     // apify only
  is_verified?: boolean | null
  is_claimed?: boolean | null
  clinic_type?: string | null   // registered only
  specializations?: unknown     // registered: array
  categories?: string[] | null  // apify: array of strings
  rating?: number | null
  reviews_count?: number | null
  google_maps_url?: string | null
  source: 'registered' | 'apify'
}

interface Props {
  initialType: string
  initialPostcode: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function inferClinicType(clinic: Clinic): string {
  // Apify: use categories array first
  const catText = Array.isArray(clinic.categories) ? clinic.categories.join(' ').toLowerCase() : ''
  const nameDesc = [clinic.name ?? '', clinic.description ?? ''].join(' ').toLowerCase()
  const text = catText || nameDesc
  if (text.match(/dent|orthodont/)) return 'dental'
  if (text.match(/physio|chiro|podiat|osteo|speech/)) return 'allied_health'
  if (text.match(/pharmacy|chemist|dispensary/)) return 'pharmacy'
  if (text.match(/mental|psych|counsel|behav/)) return 'mental_health'
  if (text.match(/specialist|cardio|dermato|oncol|orthopaed|neurol|ophth|gynae|urol/)) return 'specialist'
  return 'gp'
}

function getClinicType(clinic: Clinic): string {
  return clinic.clinic_type ?? inferClinicType(clinic)
}

function getSpecs(clinic: Clinic): string[] {
  try {
    // Registered: specializations field
    if (clinic.source === 'registered') {
      const raw = clinic.specializations
      if (Array.isArray(raw)) return raw.map(String).filter(Boolean)
      if (typeof raw === 'string') return raw.split(',').map((s) => s.trim()).filter(Boolean)
    }
    // Apify: categories field
    if (clinic.source === 'apify' && Array.isArray(clinic.categories)) {
      return clinic.categories.map(String).filter(Boolean)
    }
    return []
  } catch { return [] }
}

function getLogoSrc(clinic: Clinic): string | null {
  return clinic.logo_url || clinic.image_url || null
}

function getAddress(clinic: Clinic): string {
  if (clinic.address) return clinic.address
  return [clinic.address_line1, clinic.city, clinic.state].filter(Boolean).join(', ')
}


// ── Skeleton ──────────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-lhc-border overflow-hidden animate-pulse">
      <div className="p-5 space-y-4">
        <div className="flex gap-3">
          <div className="w-12 h-12 bg-gray-200 rounded-xl flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-200 rounded w-3/4" />
            <div className="h-3 bg-gray-100 rounded w-1/3" />
            <div className="flex gap-2">
              <div className="h-5 w-16 bg-gray-100 rounded-full" />
              <div className="h-5 w-20 bg-gray-100 rounded-full" />
            </div>
          </div>
        </div>
        <div className="space-y-1.5">
          <div className="h-3 bg-gray-100 rounded" />
          <div className="h-3 bg-gray-100 rounded w-4/5" />
        </div>
        <div className="space-y-1.5">
          <div className="h-8 bg-gray-100 rounded-lg" />
          <div className="h-8 bg-gray-100 rounded-lg" />
        </div>
        <div className="pt-2 flex gap-2">
          <div className="h-10 bg-gray-100 rounded-xl flex-1" />
          <div className="h-10 bg-lhc-primary/20 rounded-xl flex-1" />
        </div>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function ClinicsDirectory({ initialType, initialPostcode }: Props) {
  const router = useRouter()
  const [clinics, setClinics] = useState<Clinic[]>([])
  const [searchResults, setSearchResults] = useState<Clinic[]>([])
  const [totalClinicsCount, setTotalClinicsCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [searchLoading, setSearchLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [countLoading, setCountLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState(initialPostcode)
  const [typeFilter, setTypeFilter] = useState(initialType || 'all')
  const [apifyOffset, setApifyOffset] = useState(0)
  const [hasMoreApify, setHasMoreApify] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [addingClinic, setAddingClinic] = useState<{ id: string; name: string } | null>(null)
  const [selectedClinicForClaim, setSelectedClinicForClaim] = useState<Clinic | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null))
  }, [])

  const { isFavorite, addFavorite, removeFavorite } = useFavoriteClinics(userId)

  const fetchCounts = useCallback(async () => {
    setCountLoading(true)
    try {
      const supabase = createClient()
      const [{ count: r }, { count: a }] = await Promise.all([
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any).from('clinics_public').select('id', { count: 'exact', head: true }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any).from('apify_clinics_public').select('id', { count: 'exact', head: true }),
      ])
      setTotalClinicsCount((r ?? 0) + (a ?? 0))
    } finally { setCountLoading(false) }
  }, [])

  const fetchClinics = useCallback(async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const [{ data: registered }, { data: apify }] = await Promise.all([
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any).from('clinics_public')
          .select('id,name,description,logo_url,city,state,zip_code,phone,email,website,specializations,is_verified,address_line1,clinic_type')
          .limit(10000),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any).from('apify_clinics_public')
          .select('id,name,description,address,city,state,zip_code,phone,email,website,google_maps_url,rating,reviews_count,categories,image_url,is_claimed')
          .range(0, APIFY_PAGE_SIZE - 1),
      ])
      setClinics([
        ...(registered ?? []).map((c: Record<string, unknown>) => ({ ...c, source: 'registered' as const })),
        ...(apify ?? []).map((c: Record<string, unknown>) => ({ ...c, source: 'apify' as const })),
      ])
      setApifyOffset(APIFY_PAGE_SIZE)
      setHasMoreApify((apify ?? []).length === APIFY_PAGE_SIZE)
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchCounts(); fetchClinics() }, [fetchCounts, fetchClinics])

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!searchTerm.trim()) { setSearchResults([]); return }
    setSearchLoading(true)
    debounceRef.current = setTimeout(async () => {
      try {
        const supabase = createClient()
        const term = `%${searchTerm.trim()}%`
        const regFilter = `name.ilike.${term},city.ilike.${term},zip_code.ilike.${term},description.ilike.${term}`
        const apifyFilter = `name.ilike.${term},city.ilike.${term},zip_code.ilike.${term},address.ilike.${term}`
        const [{ data: r }, { data: a }] = await Promise.all([
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (supabase as any).from('clinics_public')
            .select('id,name,description,logo_url,city,state,zip_code,phone,email,website,specializations,is_verified,address_line1,clinic_type')
            .or(regFilter).limit(50),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (supabase as any).from('apify_clinics_public')
            .select('id,name,description,address,city,state,zip_code,phone,email,website,google_maps_url,rating,reviews_count,categories,image_url,is_claimed')
            .or(apifyFilter).limit(50),
        ])
        setSearchResults([
          ...(r ?? []).map((c: Record<string, unknown>) => ({ ...c, source: 'registered' as const })),
          ...(a ?? []).map((c: Record<string, unknown>) => ({ ...c, source: 'apify' as const })),
        ])
      } finally { setSearchLoading(false) }
    }, 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [searchTerm])

  async function loadMore() {
    setLoadingMore(true)
    try {
      const supabase = createClient()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any).from('apify_clinics_public')
        .select('id,name,description,address,city,state,zip_code,phone,email,website,google_maps_url,rating,reviews_count,categories,image_url,is_claimed')
        .range(apifyOffset, apifyOffset + APIFY_PAGE_SIZE - 1)
      const newClinics = (data ?? []).map((c: Record<string, unknown>) => ({ ...c, source: 'apify' as const }))
      setClinics((prev) => [...prev, ...newClinics])
      setApifyOffset((prev) => prev + APIFY_PAGE_SIZE)
      setHasMoreApify(newClinics.length === APIFY_PAGE_SIZE)
    } finally { setLoadingMore(false) }
  }

  function handleHeartClick(clinicId: string, clinicName: string) {
    if (!userId) { router.push('/auth'); return }
    if (isFavorite(clinicId)) {
      removeFavorite(clinicId)
    } else {
      setAddingClinic({ id: clinicId, name: clinicName })
    }
  }

  const isSearchMode = searchTerm.trim().length > 0
  const baseList = isSearchMode ? searchResults : clinics
  const filteredClinics = baseList.filter((c) => typeFilter === 'all' || getClinicType(c) === typeFilter)

  return (
    <main className="flex-1 bg-lhc-background">
      {/* ── Page header ── */}
      <div className="bg-white border-b border-lhc-border">
        <div className="container mx-auto max-w-7xl px-4 py-5">
          <div className="flex items-start justify-between mb-6">
            <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-lhc-text-muted hover:text-lhc-text-main transition-colors font-medium">
              <ChevronLeft className="w-4 h-4" />
              Back to Home
            </Link>
            <div className="text-right border border-lhc-border rounded-xl px-4 py-2.5 min-w-[110px]">
              <p className="text-[10px] font-bold text-lhc-text-muted uppercase tracking-widest">Total Clinics</p>
              {countLoading
                ? <Loader2 className="w-4 h-4 animate-spin text-lhc-primary mt-1 ml-auto" />
                : <p className="text-2xl font-bold text-lhc-text-main">{totalClinicsCount.toLocaleString()}</p>}
            </div>
          </div>
          <div className="text-center">
            <h1 className="text-3xl sm:text-4xl font-bold text-lhc-text-main mb-2">Find Healthcare Providers</h1>
            <p className="text-lhc-text-muted text-sm">Discover trusted clinics and book appointments with ease</p>
          </div>
        </div>
      </div>

      {/* ── Sticky search + filters ── */}
      <div className="bg-white border-b border-lhc-border sticky top-0 z-20 shadow-sm">
        <div className="container mx-auto max-w-7xl px-4 py-3.5 space-y-3">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-lhc-text-muted pointer-events-none" />
            {searchLoading
              ? <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-lhc-primary animate-spin" />
              : searchTerm
                ? <button onClick={() => setSearchTerm('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-lhc-text-muted hover:text-lhc-text-main">
                    <X className="w-4 h-4" />
                  </button>
                : null
            }
            <input
              type="text"
              placeholder="Search by clinic name, city, zip code, or specialization..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-12 pl-11 pr-10 border border-lhc-border rounded-xl text-sm text-lhc-text-main placeholder:text-lhc-text-muted focus:outline-none focus:border-lhc-primary transition-colors bg-white"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {TYPE_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setTypeFilter(f.value)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors border ${
                  typeFilter === f.value
                    ? 'bg-lhc-primary text-white border-lhc-primary shadow-sm'
                    : 'bg-white text-lhc-text-muted border-lhc-border hover:border-lhc-primary hover:text-lhc-primary'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Results ── */}
      <div className="container mx-auto max-w-7xl px-4 py-7">
        {!loading && !searchLoading && (
          <p className="text-sm text-lhc-text-muted mb-5 font-medium">
            {isSearchMode
              ? `${filteredClinics.length} result${filteredClinics.length !== 1 ? 's' : ''} for "${searchTerm}"`
              : `Showing ${filteredClinics.length.toLocaleString()} clinic${filteredClinics.length !== 1 ? 's' : ''}`}
            {typeFilter !== 'all' && ` · ${TYPE_FILTERS.find(f => f.value === typeFilter)?.label}`}
          </p>
        )}

        {loading || (searchLoading && isSearchMode) ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : filteredClinics.length === 0 ? (
          <div className="text-center py-24 space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-lhc-background border border-lhc-border flex items-center justify-center mx-auto">
              <Building2 className="w-8 h-8 text-lhc-text-muted/50" />
            </div>
            <h3 className="font-bold text-lhc-text-main text-lg">No clinics found</h3>
            <p className="text-sm text-lhc-text-muted">Try a different search term or select another filter.</p>
            {(searchTerm || typeFilter !== 'all') && (
              <button
                onClick={() => { setSearchTerm(''); setTypeFilter('all') }}
                className="text-sm text-lhc-primary font-semibold hover:underline"
              >
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredClinics.map((clinic) => (
              <ClinicCard
                key={`${clinic.source}-${clinic.id}`}
                clinic={clinic}
                isFavorite={isFavorite(clinic.id)}
                onFavorite={() => handleHeartClick(clinic.id, clinic.name)}
                onClaim={() => setSelectedClinicForClaim(clinic)}
              />
            ))}
          </div>
        )}

        {!isSearchMode && hasMoreApify && !loading && (
          <div className="text-center mt-10">
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="bg-white border border-lhc-border hover:border-lhc-primary text-lhc-text-main hover:text-lhc-primary font-semibold px-10 py-3 rounded-xl text-sm transition-colors disabled:opacity-50 inline-flex items-center gap-2"
            >
              {loadingMore && <Loader2 className="w-4 h-4 animate-spin" />}
              {loadingMore ? 'Loading…' : 'Load More Clinics'}
            </button>
          </div>
        )}
      </div>

      {selectedClinicForClaim && (
        <ClaimProfileDialog clinic={selectedClinicForClaim} onClose={() => setSelectedClinicForClaim(null)} />
      )}

      {addingClinic && (
        <AddToFavoritesDialog
          isOpen={!!addingClinic}
          onClose={() => setAddingClinic(null)}
          clinicName={addingClinic.name}
          onSave={async (customName, notes) => {
            await addFavorite(addingClinic.id, customName || undefined, notes || undefined)
            setAddingClinic(null)
            return true
          }}
        />
      )}
    </main>
  )
}

// ── Clinic Card ───────────────────────────────────────────────────────────────
interface CardProps {
  clinic: Clinic
  isFavorite: boolean
  onFavorite: () => void
  onClaim: () => void
}

function ClinicCard({ clinic, isFavorite, onFavorite, onClaim }: CardProps) {
  const router = useRouter()
  const specs = getSpecs(clinic)
  const visibleSpecs = specs.slice(0, 3)
  const extraSpecs = specs.length - 3
  const detailPath = clinic.source === 'registered' ? `/clinic/${clinic.id}` : `/local-clinic/${clinic.id}`
  const address = getAddress(clinic)
  const logoSrc = getLogoSrc(clinic)
  const clinicType = getClinicType(clinic)
  const typeLabel = TYPE_FILTERS.find(f => f.value === clinicType)?.label ?? 'Clinic'
  const style = TYPE_STYLES[clinicType] ?? TYPE_STYLES['gp']
  const cityState = [clinic.city, clinic.state].filter(Boolean).join(', ')
  const rating = clinic.rating ? Number(clinic.rating) : null

  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-lhc-border shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col">


      {/* ── Card header ── */}
      <div className="px-5 pt-4 pb-0">
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <div className={`w-12 h-12 rounded-xl flex-shrink-0 overflow-hidden border border-lhc-border/60 ${style.avatarBg} flex items-center justify-center`}>
            {logoSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoSrc} alt={clinic.name} className="w-full h-full object-cover" />
            ) : (
              <span className={`text-sm font-extrabold ${style.initials}`}>{getInitials(clinic.name)}</span>
            )}
          </div>

          {/* Name, location, badges */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="font-extrabold text-lhc-text-main text-[14.5px] leading-snug line-clamp-1">{clinic.name}</h3>
                  {clinic.is_verified && <BadgeCheck className="w-3.5 h-3.5 text-lhc-primary flex-shrink-0" />}
                </div>
                {cityState && (
                  <div className="flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3 text-lhc-primary flex-shrink-0" />
                    <span className="text-[11px] text-lhc-text-muted">{cityState}</span>
                  </div>
                )}
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); onFavorite() }}
                className="flex-shrink-0 text-lhc-text-muted hover:text-red-500 transition-colors mt-0.5"
              >
                <Heart className={`w-4 h-4 ${isFavorite ? 'fill-red-500 text-red-500' : ''}`} />
              </button>
            </div>

            {/* Type + rating row */}
            <div className="flex items-center gap-2 mt-2">
              <span className={`text-[10px] font-bold uppercase tracking-wider border px-2 py-0.5 rounded-full ${style.badge}`}>
                {typeLabel}
              </span>
              {rating && rating > 0 && (
                <div className="flex items-center gap-1 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                  <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                  <span className="text-[11px] font-bold text-amber-700">{rating.toFixed(1)}</span>
                  {clinic.reviews_count ? <span className="text-[10px] text-amber-600/70 ml-0.5">({clinic.reviews_count})</span> : null}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="px-5 pt-3 flex flex-col flex-1">
        {/* Description */}
        {clinic.description && (
          <p className="text-[11.5px] text-lhc-text-muted leading-relaxed line-clamp-2 mb-3">
            {clinic.description}
          </p>
        )}

        {/* Contact info pills */}
        <div className="space-y-1.5">
          {address && (
            <div className="flex items-start gap-2 rounded-lg bg-lhc-background px-3 py-2">
              <MapPin className="w-3.5 h-3.5 text-lhc-primary flex-shrink-0 mt-0.5" />
              <span className="text-[11px] text-lhc-text-muted line-clamp-1 leading-snug">{address}</span>
            </div>
          )}
          {clinic.phone && (
            <div className="flex items-center gap-2 rounded-lg bg-lhc-background px-3 py-2">
              <Phone className="w-3.5 h-3.5 text-lhc-primary flex-shrink-0" />
              <a href={`tel:${clinic.phone}`} className="text-[11px] text-lhc-text-muted hover:text-lhc-primary transition-colors" onClick={e => e.stopPropagation()}>
                {clinic.phone}
              </a>
            </div>
          )}
          {clinic.email && (
            <div className="flex items-center gap-2 rounded-lg bg-lhc-background px-3 py-2">
              <Mail className="w-3.5 h-3.5 text-lhc-primary flex-shrink-0" />
              <a href={`mailto:${clinic.email}`} className="text-[11px] text-lhc-text-muted hover:text-lhc-primary transition-colors truncate" onClick={e => e.stopPropagation()}>
                {clinic.email}
              </a>
            </div>
          )}
        </div>

        {/* Spec tags */}
        {visibleSpecs.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {visibleSpecs.map((s) => (
              <span key={s} className="text-[10px] font-medium text-lhc-text-muted bg-white border border-lhc-border px-2.5 py-0.5 rounded-full">{s}</span>
            ))}
            {extraSpecs > 0 && (
              <span className="text-[10px] font-bold text-lhc-primary bg-lhc-primary/5 border border-lhc-primary/20 px-2.5 py-0.5 rounded-full">+{extraSpecs} more</span>
            )}
          </div>
        )}

        {/* Push footer to bottom */}
        <div className="flex-1 min-h-3" />

        {/* ── CTAs ── */}
        <div className="pt-4 pb-5 border-t border-lhc-border/50 mt-4 space-y-2">
          <div className="flex gap-2">
            <button
              onClick={() => router.push(detailPath)}
              className="flex-1 h-10 border-2 border-lhc-border hover:border-lhc-primary text-lhc-text-main hover:text-lhc-primary text-xs font-bold rounded-xl transition-all"
            >
              View Details
            </button>
            <button
              onClick={() => {
                if (clinic.source === 'registered') {
                  const p = new URLSearchParams()
                  p.set('tab', 'appointments')
                  p.set('appt', 'book')
                  p.set('clinic_id', clinic.id)
                  p.set('clinic_name', clinic.name)
                  router.push(`/dashboard?${p.toString()}`)
                } else {
                  router.push(detailPath)
                }
              }}
              className="flex-1 h-10 bg-lhc-primary hover:bg-lhc-primary-hover text-white text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 shadow-sm"
            >
              <Calendar className="w-3.5 h-3.5" />
              Book Now
            </button>
          </div>

          {/* Tertiary links */}
          {(clinic.google_maps_url || clinic.website || (clinic.source === 'apify' && !clinic.is_claimed)) && (
            <div className="flex items-center justify-center gap-2 flex-wrap">
              {clinic.google_maps_url && (
                <a href={clinic.google_maps_url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                  className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-lhc-text-muted hover:text-lhc-primary border border-lhc-border hover:border-lhc-primary bg-white hover:bg-lhc-primary/5 px-3 py-1.5 rounded-lg transition-all">
                  <Navigation className="w-3 h-3" /> Directions
                </a>
              )}
              {clinic.website && (
                <a href={clinic.website} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                  className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-lhc-text-muted hover:text-lhc-primary border border-lhc-border hover:border-lhc-primary bg-white hover:bg-lhc-primary/5 px-3 py-1.5 rounded-lg transition-all">
                  <Globe className="w-3 h-3" /> Website
                </a>
              )}
              {clinic.source === 'apify' && !clinic.is_claimed && (
                <button onClick={(e) => { e.stopPropagation(); onClaim() }}
                  className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-lhc-text-muted hover:text-lhc-primary border border-lhc-border hover:border-lhc-primary bg-white hover:bg-lhc-primary/5 px-3 py-1.5 rounded-lg transition-all">
                  <BadgeCheck className="w-3 h-3" /> Claim Profile
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
