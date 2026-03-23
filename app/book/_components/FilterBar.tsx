'use client'

import { useState, useRef, useEffect } from 'react'
import { Calendar, Clock, Shield, ChevronDown, X, Search } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface Filters {
  date: 'any' | 'today' | 'tomorrow' | 'next7'
  time: 'any' | 'am' | 'pm' | 'afterhours'
  insurance: string | null
}

const DATE_OPTIONS = [
  { value: 'any', label: 'Next available appointment' },
  { value: 'today', label: 'Today' },
  { value: 'tomorrow', label: 'Tomorrow' },
  { value: 'next7', label: 'Next 7 days' },
] as const

const TIME_OPTIONS = [
  { value: 'any', label: 'Any', sub: '' },
  { value: 'am', label: 'AM', sub: '12am – 12pm' },
  { value: 'pm', label: 'PM', sub: '12pm – 6pm' },
  { value: 'afterhours', label: 'Afterhours', sub: '6pm – 12am' },
] as const

const HEALTH_FUNDS = [
  'AHM', 'Allianz Care', 'Australian Unity', 'BUPA', 'CBHS', 'CBHS Corporate Health',
  'CUA Health Limited', 'Defence Health', 'GMHBA', 'GU Health', 'HBF', 'HCF',
  'Health Partners', 'HIF', 'Latrobe', 'Medibank', 'NIB', 'Peoplecare',
  'Phoenix Health', 'QLD Country Health', 'St. Lukes', 'TUH', 'Westfund',
]

interface Props {
  filters: Filters
  onChange: (filters: Filters) => void
}

type PopoverType = 'date' | 'time' | 'insurance' | null

export default function FilterBar({ filters, onChange }: Props) {
  const [openPopover, setOpenPopover] = useState<PopoverType>(null)
  const [insuranceSearch, setInsuranceSearch] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpenPopover(null)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const activeCount =
    (filters.date !== 'any' ? 1 : 0) +
    (filters.time !== 'any' ? 1 : 0) +
    (filters.insurance ? 1 : 0)

  const toggle = (p: PopoverType) => {
    const next = openPopover === p ? null : p
    setOpenPopover(next)
    if (next !== 'insurance') setInsuranceSearch('')
  }

  return (
    <div ref={containerRef} className="flex items-center gap-2 flex-wrap">
      {/* Date filter */}
      <div className="relative">
        <button
          onClick={() => toggle('date')}
          className={cn(
            'inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold border transition-colors',
            filters.date !== 'any'
              ? 'bg-lhc-primary text-white border-lhc-primary'
              : openPopover === 'date'
                ? 'bg-white text-lhc-primary border-lhc-primary'
                : 'bg-white text-lhc-text-muted border-lhc-border hover:border-lhc-primary hover:text-lhc-primary',
          )}
        >
          <Calendar className="w-3.5 h-3.5" />
          Date
          <ChevronDown className="w-3 h-3" />
        </button>

        {openPopover === 'date' && (
          <div className="absolute z-50 left-0 mt-1.5 w-64 bg-white border border-lhc-border rounded-xl shadow-xl p-3 space-y-1">
            <p className="text-xs font-bold text-lhc-text-main px-2 pb-1">Appointment date</p>
            {DATE_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors',
                  filters.date === opt.value ? 'bg-lhc-primary/5' : 'hover:bg-lhc-background',
                )}
              >
                <input
                  type="radio"
                  name="dateFilter"
                  checked={filters.date === opt.value}
                  onChange={() => { onChange({ ...filters, date: opt.value }); setOpenPopover(null) }}
                  className="accent-lhc-primary"
                />
                <span className="text-sm text-lhc-text-main">{opt.label}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Time filter */}
      <div className="relative">
        <button
          onClick={() => toggle('time')}
          className={cn(
            'inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold border transition-colors',
            filters.time !== 'any'
              ? 'bg-lhc-primary text-white border-lhc-primary'
              : openPopover === 'time'
                ? 'bg-white text-lhc-primary border-lhc-primary'
                : 'bg-white text-lhc-text-muted border-lhc-border hover:border-lhc-primary hover:text-lhc-primary',
          )}
        >
          <Clock className="w-3.5 h-3.5" />
          Time
          <ChevronDown className="w-3 h-3" />
        </button>

        {openPopover === 'time' && (
          <div className="absolute z-50 left-0 mt-1.5 w-56 bg-white border border-lhc-border rounded-xl shadow-xl p-3 space-y-1">
            <p className="text-xs font-bold text-lhc-text-main px-2 pb-1">Appointment time</p>
            {TIME_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors',
                  filters.time === opt.value ? 'bg-lhc-primary/5' : 'hover:bg-lhc-background',
                )}
              >
                <input
                  type="radio"
                  name="timeFilter"
                  checked={filters.time === opt.value}
                  onChange={() => { onChange({ ...filters, time: opt.value }); setOpenPopover(null) }}
                  className="accent-lhc-primary"
                />
                <div>
                  <p className="text-sm text-lhc-text-main">{opt.label}</p>
                  {opt.sub && <p className="text-[10px] text-lhc-text-muted">{opt.sub}</p>}
                </div>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Insurance filter */}
      <div className="relative">
        <button
          onClick={() => toggle('insurance')}
          className={cn(
            'inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold border transition-colors',
            filters.insurance
              ? 'bg-lhc-primary text-white border-lhc-primary'
              : openPopover === 'insurance'
                ? 'bg-white text-lhc-primary border-lhc-primary'
                : 'bg-white text-lhc-text-muted border-lhc-border hover:border-lhc-primary hover:text-lhc-primary',
          )}
        >
          <Shield className="w-3.5 h-3.5" />
          Insurance
          <ChevronDown className="w-3 h-3" />
        </button>

        {openPopover === 'insurance' && (
          <div className="absolute z-50 left-0 mt-1.5 w-72 bg-white border border-lhc-border rounded-xl shadow-xl overflow-hidden">
            <div className="p-3 pb-2 space-y-2">
              <p className="text-xs font-bold text-lhc-text-main px-2">Health insurance provider</p>
              <p className="text-[10px] text-lhc-text-muted px-2">Choosing a preferred provider could reduce out-of-pocket costs.</p>
              <div className="relative px-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-lhc-text-muted pointer-events-none" />
                <input
                  type="text"
                  value={insuranceSearch}
                  onChange={(e) => setInsuranceSearch(e.target.value)}
                  placeholder="Search health funds..."
                  className="w-full h-9 pl-8 pr-3 border border-lhc-border rounded-lg text-xs text-lhc-text-main placeholder:text-lhc-text-muted focus:outline-none focus:border-lhc-primary bg-lhc-background"
                />
              </div>
            </div>
            <div className="max-h-[240px] overflow-y-auto px-3 pb-3 space-y-0.5">
              {HEALTH_FUNDS.filter((f) => !insuranceSearch.trim() || f.toLowerCase().includes(insuranceSearch.toLowerCase())).map((fund) => (
                <label
                  key={fund}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors',
                    filters.insurance === fund ? 'bg-lhc-primary/5' : 'hover:bg-lhc-background',
                  )}
                >
                  <input
                    type="radio"
                    name="insuranceFilter"
                    checked={filters.insurance === fund}
                    onChange={() => { onChange({ ...filters, insurance: fund }); setOpenPopover(null) }}
                    className="accent-lhc-primary"
                  />
                  <span className={cn('text-sm', filters.insurance === fund ? 'text-lhc-primary font-medium' : 'text-lhc-text-main')}>{fund}</span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Clear all filters */}
      {activeCount > 0 && (
        <button
          onClick={() => onChange({ date: 'any', time: 'any', insurance: null })}
          className="inline-flex items-center gap-1 px-3 py-2 rounded-full text-xs font-semibold text-lhc-text-muted hover:text-red-500 border border-lhc-border hover:border-red-300 transition-colors"
        >
          <X className="w-3 h-3" />
          Clear ({activeCount})
        </button>
      )}
    </div>
  )
}
