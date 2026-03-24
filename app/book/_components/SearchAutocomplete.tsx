'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import {
  Search, X, Building2, Stethoscope, ClipboardList, Loader2, MapPin,
  MonitorSmartphone, Briefcase, Heart, Brain, Activity, FileCheck,
  Bone, Footprints, Plus, BrainCircuit, Fingerprint, Ear,
  Eye, MessageCircleHeart, Syringe, ShieldCheck, ScanLine,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { CATEGORIES, type Category } from '@/lib/categories'
import DefaultAvatar from '@/components/DefaultAvatar'

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  MonitorSmartphone, Briefcase, Heart, Brain, Activity, FileCheck,
  Bone, Footprints, Plus, BrainCircuit, Fingerprint, Ear,
  Eye, MessageCircleHeart, Syringe, ShieldCheck, ScanLine,
}

type TabType = 'specialities' | 'practices' | 'practitioners'

interface PracticeResult {
  id: string
  name: string
  city?: string | null
  state?: string | null
  zip_code?: string | null
  logo_url?: string | null
  clinic_type?: string | null
}

interface PractitionerResult {
  id: string
  clinic_id: string
  first_name: string
  last_name: string
  specialty?: string | null
  avatar_url?: string | null
  years_experience?: number | null
  consultation_fee?: number | null
  qualifications?: string | null
  clinic_name?: string
}

interface Props {
  /** Called when a clinic/practice is selected */
  onSelectClinic: (clinicId: string) => void
  /** Called when a doctor/practitioner is selected */
  onSelectDoctor: (clinicId: string, doctorId: string) => void
  /** Called when a category is selected */
  onSelectCategory: (slug: string) => void
  placeholder?: string
  /** 'embedded' removes border/rounding for use inside a parent bar */
  variant?: 'default' | 'embedded'
  /** Called when input value changes */
  onInputChange?: (value: string) => void
  /** Pre-fill the input with a value */
  defaultValue?: string
}

export default function SearchAutocomplete({
  onSelectClinic,
  onSelectDoctor,
  onSelectCategory,
  placeholder = 'Search specialities, clinics, or practitioners...',
  variant = 'default',
  onInputChange,
  defaultValue = '',
}: Props) {
  const isEmbedded = variant === 'embedded'
  const cacheRef = useRef<Map<string, { practices: PracticeResult[]; practitioners: PractitionerResult[] }>>(new Map())

  const [inputValue, setInputValue] = useState(defaultValue)
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<TabType>('specialities')
  const [loading, setLoading] = useState(false)
  const [practices, setPractices] = useState<PracticeResult[]>([])
  const [practitioners, setPractitioners] = useState<PractitionerResult[]>([])
  const containerRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Filter categories client-side based on search term
  const filteredCategories = useMemo(() => {
    const term = inputValue.trim().toLowerCase()
    if (!term) return CATEGORIES
    return CATEGORIES.filter((c) => c.label.toLowerCase().includes(term))
  }, [inputValue])

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Fetch practices + practitioners from DB (categories are client-side)
  const fetchData = useCallback(async (term?: string) => {
    const cacheKey = (term ?? '').trim().toLowerCase()
    const cached = cacheRef.current.get(cacheKey)
    if (cached) {
      setPractices(cached.practices)
      setPractitioners(cached.practitioners)
      return
    }

    setLoading(true)
    try {
      const supabase = createClient()
      const hasSearch = term && term.trim().length > 0
      const t = hasSearch ? `%${term.trim()}%` : ''

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let pracQuery = (supabase as any).from('clinics_public').select('id, name, city, state, zip_code, logo_url, clinic_type')
      if (hasSearch) pracQuery = pracQuery.or(`name.ilike.${t},city.ilike.${t},description.ilike.${t}`)
      pracQuery = pracQuery.limit(6)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let docQuery = (supabase as any).from('doctors_public').select('id, clinic_id, first_name, last_name, specialty, avatar_url, years_experience, consultation_fee, qualifications').eq('is_active', true)
      if (hasSearch) docQuery = docQuery.or(`first_name.ilike.${t},last_name.ilike.${t},specialty.ilike.${t}`)
      docQuery = docQuery.limit(6)

      const [pracRes, docRes] = await Promise.all([pracQuery, docQuery])

      // Resolve clinic names for practitioners
      const rawDocs: PractitionerResult[] = docRes.data ?? []
      if (rawDocs.length > 0) {
        const clinicIds = [...new Set(rawDocs.map((d) => d.clinic_id))]
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: clinicNames } = await (supabase as any)
          .from('clinics_public')
          .select('id, name')
          .in('id', clinicIds)
        const nameMap = new Map<string, string>()
        for (const c of (clinicNames ?? [])) nameMap.set(c.id, c.name)
        for (const doc of rawDocs) doc.clinic_name = nameMap.get(doc.clinic_id) ?? undefined
      }

      setPractices(pracRes.data ?? [])
      setPractitioners(rawDocs)

      cacheRef.current.set(cacheKey, { practices: pracRes.data ?? [], practitioners: rawDocs })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchData(inputValue || undefined), 250)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [inputValue, fetchData])

  const totalResults = filteredCategories.length + practices.length + practitioners.length

  const TABS: { key: TabType; label: string; icon: typeof Search; count: number }[] = [
    { key: 'specialities', label: 'Specialities', icon: ClipboardList, count: filteredCategories.length },
    { key: 'practices', label: 'Practices', icon: Building2, count: practices.length },
    { key: 'practitioners', label: 'Practitioners', icon: Stethoscope, count: practitioners.length },
  ]

  // Selection handlers
  const handleSelectCategory = (cat: Category) => {
    setInputValue(cat.label)
    onInputChange?.(cat.label)
    setIsOpen(false)
    onSelectCategory(cat.slug)
  }

  const handleSelectClinic = (clinic: PracticeResult) => {
    setInputValue('')
    setIsOpen(false)
    onSelectClinic(clinic.id)
  }

  const handleSelectDoctor = (doc: PractitionerResult) => {
    setInputValue('')
    setIsOpen(false)
    onSelectDoctor(doc.clinic_id, doc.id)
  }

  return (
    <div ref={containerRef} className="relative flex-1">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-lhc-text-muted pointer-events-none" />
        {inputValue ? (
          <button
            type="button"
            onClick={() => { setInputValue(''); setIsOpen(false) }}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-lhc-text-muted hover:text-lhc-text-main"
          >
            <X className="w-4 h-4" />
          </button>
        ) : loading ? (
          <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-lhc-primary animate-spin" />
        ) : null}
        <input
          type="text"
          value={inputValue}
          onChange={(e) => { setInputValue(e.target.value); onInputChange?.(e.target.value); setIsOpen(true) }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className={isEmbedded
            ? 'w-full h-14 pl-11 pr-10 text-sm font-semibold text-gray-800 placeholder:text-gray-400 focus:outline-none bg-transparent'
            : 'w-full h-12 pl-11 pr-10 border border-lhc-border rounded-xl text-sm text-lhc-text-main placeholder:text-lhc-text-muted focus:outline-none focus:border-lhc-primary transition-colors bg-white'
          }
        />
      </div>

      {/* Dropdown */}
      {isOpen && totalResults > 0 && (
        <div
          className="absolute z-[60] left-0 mt-2 bg-white border border-lhc-border rounded-2xl shadow-2xl overflow-hidden w-[calc(100vw-2rem)] sm:w-[480px] md:w-[560px] max-w-[600px]"
        >
          {/* Tabs */}
          <div className="flex border-b border-lhc-border bg-lhc-background/30">
            {TABS.map((tab) => (
              <button
                type="button"
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 flex items-center justify-center gap-1.5 px-2 sm:px-4 py-3.5 text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap ${
                  activeTab === tab.key
                    ? 'text-lhc-primary border-b-[3px] border-lhc-primary bg-white'
                    : 'text-lhc-text-muted hover:text-lhc-text-main hover:bg-white/50'
                }`}
              >
                <tab.icon className="w-4 h-4 hidden sm:block" />
                {tab.label}
                {tab.count > 0 && (
                  <span className={`text-[10px] sm:text-xs rounded-full px-1.5 sm:px-2 py-0.5 font-bold ${
                    activeTab === tab.key
                      ? 'bg-lhc-primary/10 text-lhc-primary'
                      : 'bg-lhc-background text-lhc-text-muted border border-lhc-border'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Results */}
          <div className="overflow-y-auto max-h-[420px]">
            {activeTab === 'specialities' && (
              filteredCategories.length > 0 ? filteredCategories.map((cat) => {
                const Icon = ICON_MAP[cat.icon]
                return (
                  <button
                    type="button"
                    key={cat.slug}
                    onClick={() => handleSelectCategory(cat)}
                    className="w-full text-left px-5 py-4 hover:bg-lhc-primary/5 transition-colors flex items-center gap-4 border-b border-lhc-border/40 last:border-0"
                  >
                    <div className="w-11 h-11 rounded-xl bg-lhc-primary/10 flex items-center justify-center flex-shrink-0">
                      {Icon && <Icon className="w-5 h-5 text-lhc-primary" />}
                    </div>
                    <p className="text-[15px] font-semibold text-lhc-text-main">{cat.label}</p>
                  </button>
                )
              }) : (
                <p className="text-sm text-lhc-text-muted text-center py-8">No specialities found</p>
              )
            )}

            {activeTab === 'practices' && (
              practices.length > 0 ? practices.map((clinic) => (
                <button
                  type="button"
                  key={clinic.id}
                  onClick={() => handleSelectClinic(clinic)}
                  className="w-full text-left px-5 py-4 hover:bg-lhc-primary/5 transition-colors flex items-center gap-4 border-b border-lhc-border/40 last:border-0"
                >
                  <div className="w-11 h-11 rounded-xl flex-shrink-0 overflow-hidden">
                    {clinic.logo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={clinic.logo_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <DefaultAvatar variant="clinic" className="w-full h-full rounded-xl" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-semibold text-lhc-text-main">{clinic.name}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      {clinic.city && (
                        <span className="flex items-center gap-0.5 text-xs text-lhc-text-muted">
                          <MapPin className="w-3 h-3" />
                          {clinic.city}{clinic.state ? `, ${clinic.state}` : ''} {clinic.zip_code ?? ''}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              )) : (
                <p className="text-sm text-lhc-text-muted text-center py-8">No practices found</p>
              )
            )}

            {activeTab === 'practitioners' && (
              practitioners.length > 0 ? practitioners.map((doc) => (
                <button
                  type="button"
                  key={doc.id}
                  onClick={() => handleSelectDoctor(doc)}
                  className="w-full text-left px-5 py-4 hover:bg-lhc-primary/5 transition-colors flex items-start gap-4 border-b border-lhc-border/40 last:border-0"
                >
                  <div className="w-12 h-12 rounded-full flex-shrink-0 overflow-hidden">
                    {doc.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={doc.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <DefaultAvatar variant="doctor" className="w-full h-full rounded-full" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-semibold text-lhc-text-main">Dr. {doc.first_name} {doc.last_name}</p>
                    {doc.specialty && <p className="text-xs text-lhc-primary font-medium mt-0.5">{doc.specialty}</p>}
                    {doc.clinic_name && (
                      <p className="text-xs text-lhc-text-muted mt-0.5 flex items-center gap-1">
                        <Building2 className="w-3 h-3" />
                        {doc.clinic_name}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-2 mt-1.5">
                      {doc.years_experience != null && (
                        <span className="text-[10px] bg-lhc-background border border-lhc-border text-lhc-text-muted rounded-full px-2 py-0.5">
                          {doc.years_experience} yrs exp
                        </span>
                      )}
                      {doc.consultation_fee != null && (
                        <span className="text-[10px] bg-lhc-primary/8 border border-lhc-primary/20 text-lhc-primary font-semibold rounded-full px-2 py-0.5">
                          ${doc.consultation_fee}
                        </span>
                      )}
                      {doc.qualifications && (
                        <span className="text-[10px] text-lhc-text-muted truncate max-w-[180px]">
                          {typeof doc.qualifications === 'string' ? doc.qualifications : ''}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              )) : (
                <p className="text-sm text-lhc-text-muted text-center py-8">No practitioners found</p>
              )
            )}
          </div>
        </div>
      )}
    </div>
  )
}
