'use client'

import { useRef, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  dates: string[] // sorted ISO date strings with available slots
  selectedDate: string | null
  onSelect: (date: string) => void
}

export default function DateStrip({ dates, selectedDate, onSelect }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const selectedRef = useRef<HTMLButtonElement>(null)

  // Auto-scroll to selected date
  useEffect(() => {
    if (selectedRef.current && scrollRef.current) {
      const container = scrollRef.current
      const el = selectedRef.current
      const left = el.offsetLeft - container.offsetWidth / 2 + el.offsetWidth / 2
      container.scrollTo({ left: Math.max(0, left), behavior: 'smooth' })
    }
  }, [selectedDate])

  const scroll = (dir: 'left' | 'right') => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: dir === 'left' ? -200 : 200, behavior: 'smooth' })
    }
  }

  const todayStr = new Date().toISOString().split('T')[0]
  const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split('T')[0]

  if (dates.length === 0) return null

  return (
    <div className="relative flex items-center gap-1">
      {/* Left arrow */}
      <button
        onClick={() => scroll('left')}
        className="flex-shrink-0 w-8 h-8 rounded-full border border-lhc-border bg-white hover:bg-lhc-background flex items-center justify-center text-lhc-text-muted hover:text-lhc-text-main transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      {/* Scrollable date buttons */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-x-auto flex gap-1.5 scrollbar-none py-1"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {dates.map((date) => {
          const d = new Date(date + 'T00:00:00')
          const isSelected = selectedDate === date
          const dayLabel = date === todayStr ? 'Today' : date === tomorrowStr ? 'Tomorrow' : null
          const weekday = d.toLocaleDateString('en-AU', { weekday: 'short' })
          const dayNum = d.getDate()
          const month = d.toLocaleDateString('en-AU', { month: 'short' })

          return (
            <button
              key={date}
              ref={isSelected ? selectedRef : undefined}
              onClick={() => onSelect(date)}
              className={cn(
                'flex-shrink-0 flex flex-col items-center justify-center px-3 py-2 rounded-xl text-center transition-all min-w-[60px] border',
                isSelected
                  ? 'bg-lhc-primary text-white border-lhc-primary shadow-sm'
                  : 'bg-white text-lhc-text-muted border-lhc-border hover:border-lhc-primary hover:text-lhc-primary',
              )}
            >
              <span className="text-[10px] font-semibold uppercase tracking-wider">
                {dayLabel ?? weekday}
              </span>
              <span className={cn('text-lg font-bold leading-tight', isSelected ? 'text-white' : 'text-lhc-text-main')}>
                {dayNum}
              </span>
              <span className="text-[10px] font-medium">{month}</span>
            </button>
          )
        })}
      </div>

      {/* Right arrow */}
      <button
        onClick={() => scroll('right')}
        className="flex-shrink-0 w-8 h-8 rounded-full border border-lhc-border bg-white hover:bg-lhc-background flex items-center justify-center text-lhc-text-muted hover:text-lhc-text-main transition-colors"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  )
}
