'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { MapPin, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { AUSTRALIAN_LOCATIONS, POPULAR_LOCATIONS, type LocationEntry } from '@/lib/constants/australianLocations'

interface Props {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  /** 'embedded' removes border/rounding for use inside a parent bar */
  variant?: 'default' | 'embedded'
}

export default function LocationAutocomplete({
  value,
  onChange,
  placeholder = 'Suburb or postcode',
  variant = 'default',
}: Props) {
  const isEmbedded = variant === 'embedded'
  const [isOpen, setIsOpen] = useState(false)
  const [dbLocations, setDbLocations] = useState<LocationEntry[]>([])
  const [initialLoaded, setInitialLoaded] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

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

  // Fetch actual clinic locations from DB (to merge with predefined)
  const fetchDbLocations = useCallback(async () => {
    if (initialLoaded) return
    try {
      const supabase = createClient()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any)
        .from('clinics_public')
        .select('city, state, zip_code')
        .limit(200)
      if (data) {
        const seen = new Set<string>()
        const unique: LocationEntry[] = []
        for (const row of data) {
          if (!row.city) continue
          const key = `${row.city}-${row.state}-${row.zip_code}`
          if (!seen.has(key)) {
            seen.add(key)
            unique.push({
              city: row.city,
              state: row.state ?? '',
              zip_code: row.zip_code ?? '',
              display: `${row.city}, ${row.state ?? ''} ${row.zip_code ?? ''}`.trim(),
            })
          }
        }
        setDbLocations(unique)
      }
      setInitialLoaded(true)
    } catch { /* non-critical */ }
  }, [initialLoaded])

  // Combined suggestions: DB locations + all predefined Australian locations, deduplicated
  const allLocations = [...dbLocations, ...AUSTRALIAN_LOCATIONS]
  const seen = new Set<string>()
  const uniqueLocations: LocationEntry[] = []
  for (const loc of allLocations) {
    if (!seen.has(loc.display)) {
      seen.add(loc.display)
      uniqueLocations.push(loc)
    }
  }

  const filteredSuggestions = value.trim()
    ? uniqueLocations.filter((loc) => {
        const term = value.toLowerCase()
        return (
          loc.city.toLowerCase().includes(term) ||
          loc.state.toLowerCase().includes(term) ||
          loc.zip_code.includes(term) ||
          loc.display.toLowerCase().includes(term)
        )
      }).slice(0, 12)
    : POPULAR_LOCATIONS // Show popular capitals on empty focus

  return (
    <div ref={containerRef} className="relative flex-1">
      <div className="relative">
        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-lhc-primary pointer-events-none" />
        {value ? (
          <button
            type="button"
            onClick={() => { onChange(''); setIsOpen(false) }}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-lhc-text-muted hover:text-lhc-text-main"
          >
            <X className="w-4 h-4" />
          </button>
        ) : null}
        <input
          type="text"
          value={value}
          onChange={(e) => { onChange(e.target.value); setIsOpen(true) }}
          onFocus={() => { fetchDbLocations(); setIsOpen(true) }}
          placeholder={placeholder}
          className={isEmbedded
            ? 'w-full h-14 pl-11 pr-10 text-sm font-semibold text-gray-800 placeholder:text-gray-400 focus:outline-none bg-transparent'
            : 'w-full h-12 pl-11 pr-10 border border-lhc-border rounded-xl text-sm text-lhc-text-main placeholder:text-lhc-text-muted focus:outline-none focus:border-lhc-primary transition-colors bg-white'
          }
        />
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-[60] left-0 right-0 mt-1.5 bg-white border border-lhc-border rounded-2xl shadow-2xl overflow-hidden"
          style={{ minWidth: '280px' }}
        >
          {/* Header */}
          <div className="px-4 py-2.5 border-b border-lhc-border bg-lhc-background/30">
            <p className="text-xs font-semibold text-lhc-text-muted">
              {value.trim() ? 'Matching locations' : 'Popular locations'}
            </p>
          </div>

          {/* Suggestions */}
          <div className="max-h-[350px] overflow-y-auto">
            {filteredSuggestions.length > 0 ? (
              filteredSuggestions.map((loc) => (
                <button
                  type="button"
                  key={loc.display}
                  onClick={() => {
                    onChange(loc.zip_code || loc.city)
                    setIsOpen(false)
                  }}
                  className="w-full text-left px-4 py-3.5 hover:bg-lhc-primary/5 transition-colors flex items-center gap-3 border-b border-lhc-border/30 last:border-0"
                >
                  <div className="w-9 h-9 rounded-lg bg-lhc-primary/10 flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-4 h-4 text-lhc-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-lhc-text-main">{loc.city}</p>
                    <p className="text-xs text-lhc-text-muted">{loc.state} {loc.zip_code}</p>
                  </div>
                </button>
              ))
            ) : (
              <p className="text-sm text-lhc-text-muted text-center py-6">No locations match &quot;{value}&quot;</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
