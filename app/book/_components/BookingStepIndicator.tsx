'use client'

import { CheckCircle2, Building2, Stethoscope, ClipboardList, CalendarDays, ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'

const STANDARD_STEPS = [
  { n: 1, label: 'Clinic',      icon: Building2 },
  { n: 2, label: 'Doctor',      icon: Stethoscope },
  { n: 3, label: 'Service',     icon: ClipboardList },
  { n: 4, label: 'Date & Time', icon: CalendarDays },
  { n: 5, label: 'Confirm',     icon: ShieldCheck },
]

const CUSTOM_API_STEPS = [
  { n: 1, label: 'Clinic',      icon: Building2 },
  { n: 2, label: 'Doctor',      icon: Stethoscope },
  { n: 3, label: 'Date & Time', icon: CalendarDays },
  { n: 4, label: 'Confirm',     icon: ShieldCheck },
]

interface Props {
  currentStep: number
  isCustomApi?: boolean
}

export default function BookingStepIndicator({ currentStep, isCustomApi }: Props) {
  const STEPS = isCustomApi ? CUSTOM_API_STEPS : STANDARD_STEPS
  return (
    <div className="flex items-center">
      {STEPS.map((s, i) => {
        const done = currentStep > s.n
        const active = currentStep === s.n
        const Icon = done ? CheckCircle2 : s.icon

        return (
          <div key={s.n} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={cn(
                  'w-9 h-9 rounded-full flex items-center justify-center transition-all',
                  done
                    ? 'bg-lhc-primary text-white'
                    : active
                      ? 'bg-lhc-primary text-white ring-4 ring-lhc-primary/20'
                      : 'bg-lhc-border/60 text-lhc-text-muted',
                )}
              >
                <Icon className="w-4 h-4" />
              </div>
              <span
                className={cn(
                  'text-[10px] font-semibold whitespace-nowrap hidden sm:block',
                  active ? 'text-lhc-primary' : done ? 'text-lhc-text-main' : 'text-lhc-text-muted',
                )}
              >
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={cn(
                  'flex-1 h-0.5 mx-1.5 rounded-full transition-all',
                  done ? 'bg-lhc-primary' : 'bg-lhc-border/60',
                  // offset down on sm+ to account for label
                  'sm:mb-5',
                )}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
