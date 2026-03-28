'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  dates: string[]
  selectedDate: string | null
  onSelect: (date: string) => void
  onPrev?: () => void
  onNext?: () => void
  canGoPrev?: boolean
}

export default function DateStrip({ dates, selectedDate, onSelect, onPrev, onNext, canGoPrev = true }: Props) {
  const todayStr = new Date().toISOString().split('T')[0]
  const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split('T')[0]

  if (dates.length === 0) return null

  return (
    <div className="relative flex items-center gap-1">
      {/* Left arrow */}
      <button
        onClick={onPrev}
        disabled={!canGoPrev}
        className={cn(
          'flex-shrink-0 w-8 h-8 rounded-full border border-lhc-border bg-white flex items-center justify-center transition-colors',
          canGoPrev
            ? 'hover:bg-lhc-background text-lhc-text-muted hover:text-lhc-text-main cursor-pointer'
            : 'text-lhc-border cursor-not-allowed',
        )}
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      {/* Date buttons */}
      <div className="flex-1 flex gap-1.5 justify-center py-1">
        {dates.map((date) => {
          const d = new Date(date + 'T00:00:00')
          const isSelected = selectedDate === date
          const dayLabel = date === todayStr ? 'TODAY' : date === tomorrowStr ? 'TOMORROW' : null
          const weekday = d.toLocaleDateString('en-AU', { weekday: 'short' }).toUpperCase()
          const dayNum = d.getDate()
          const month = d.toLocaleDateString('en-AU', { month: 'short' })

          return (
            <button
              key={date}
              onClick={() => onSelect(date)}
              className={cn(
                'flex-1 flex flex-col items-center justify-center min-w-0 py-2 rounded-xl text-center transition-all border',
                isSelected
                  ? 'bg-lhc-primary text-white border-lhc-primary shadow-sm'
                  : 'bg-white text-lhc-text-muted border-lhc-border hover:border-lhc-primary hover:text-lhc-primary',
              )}
            >
              <span className="text-[10px] font-semibold tracking-wider">
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
        onClick={onNext}
        className="flex-shrink-0 w-8 h-8 rounded-full border border-lhc-border bg-white hover:bg-lhc-background flex items-center justify-center text-lhc-text-muted hover:text-lhc-text-main transition-colors"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  )
}
