'use client'

import * as React from 'react'
import { DayPicker } from 'react-day-picker'
import { cn } from '@/lib/utils'

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn('p-3', className)}
      classNames={{
        months: 'flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0',
        month: 'space-y-4',
        month_caption: 'flex justify-center pt-1 relative items-center',
        caption_label: 'text-sm font-medium text-lhc-text-main',
        nav: 'space-x-1 flex items-center',
        button_previous:
          'absolute left-1 h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 inline-flex items-center justify-center rounded-md border border-lhc-border text-lhc-text-muted',
        button_next:
          'absolute right-1 h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 inline-flex items-center justify-center rounded-md border border-lhc-border text-lhc-text-muted',
        month_grid: 'w-full border-collapse space-y-1',
        weekdays: 'flex',
        weekday: 'text-lhc-text-muted rounded-md w-8 font-normal text-[0.8rem]',
        week: 'flex w-full mt-2',
        day: 'relative p-0 text-center text-sm focus-within:relative focus-within:z-20 [&:has([aria-selected])]:bg-lhc-primary/10 [&:has([aria-selected].day-outside)]:bg-lhc-primary/5 [&:has([aria-selected].day-range-end)]:rounded-r-md',
        day_button:
          'h-8 w-8 p-0 font-normal aria-selected:opacity-100 inline-flex items-center justify-center rounded-md text-sm transition-colors hover:bg-lhc-primary/10 hover:text-lhc-text-main focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-lhc-primary disabled:pointer-events-none disabled:opacity-50 aria-selected:bg-lhc-primary aria-selected:text-white aria-selected:hover:bg-lhc-primary/90',
        range_end: 'day-range-end',
        selected: 'bg-lhc-primary text-white hover:bg-lhc-primary/90 focus:bg-lhc-primary focus:text-white',
        today: 'bg-lhc-primary/10 text-lhc-primary font-semibold',
        outside: 'day-outside text-lhc-text-muted opacity-50 aria-selected:bg-lhc-primary/5 aria-selected:text-lhc-text-muted aria-selected:opacity-30',
        disabled: 'text-lhc-text-muted opacity-50',
        range_middle: 'aria-selected:bg-lhc-primary/10 aria-selected:text-lhc-text-main',
        hidden: 'invisible',
        ...classNames,
      }}
      {...props}
    />
  )
}
Calendar.displayName = 'Calendar'

export { Calendar }
