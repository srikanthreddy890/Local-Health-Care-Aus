'use client'
import { Button } from '@/components/ui/button'
import { ChevronRight, ChevronLeft, Stethoscope } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  clinicId: string
  isOpen: boolean
  onToggle: () => void
  emergencySlotsEnabled: boolean
}

export default function ClinicDoctorSidebar({ clinicId, isOpen, onToggle, emergencySlotsEnabled }: Props) {
  return (
    <>
      {/* Toggle tab fixed to right edge */}
      <button
        onClick={onToggle}
        className="fixed right-0 top-1/2 -translate-y-1/2 z-40 bg-lhc-primary text-white rounded-l-lg px-2 py-4 flex flex-col items-center gap-1 shadow-lg hover:bg-lhc-primary-hover transition-colors"
        aria-label="Toggle doctor sidebar"
      >
        {isOpen ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        <span className="text-[10px] font-semibold writing-mode-vertical [writing-mode:vertical-rl] rotate-180">
          Doctors
        </span>
      </button>

      {/* Sidebar panel */}
      <div
        className={cn(
          'fixed right-0 top-0 h-full w-[420px] max-w-full bg-lhc-surface border-l border-lhc-border shadow-2xl z-30 transition-transform duration-300 overflow-y-auto',
          isOpen ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-lhc-text-main flex items-center gap-2">
              <Stethoscope className="w-5 h-5 text-lhc-primary" />
              Doctor Roster
            </h2>
            <Button variant="ghost" size="icon" onClick={onToggle}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-lhc-text-muted text-sm">
            Quick doctor management panel.
            {emergencySlotsEnabled && (
              <span className="block mt-1 text-xs text-green-600">Emergency slots enabled.</span>
            )}
          </p>
          <p className="text-xs text-lhc-text-muted mt-2 opacity-60">Clinic: {clinicId}</p>
        </div>
      </div>
    </>
  )
}
