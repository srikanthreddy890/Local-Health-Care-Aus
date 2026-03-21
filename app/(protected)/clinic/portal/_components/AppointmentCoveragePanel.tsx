'use client'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useDoctorCoverage } from '@/lib/hooks/useDoctorCoverage'
import { CalendarDays, Loader2, Wifi } from 'lucide-react'

interface Props {
  doctorId: string
  onExtendAppointments: () => void
}

export default function AppointmentCoveragePanel({ doctorId, onExtendAppointments }: Props) {
  const { data: coverage, isLoading } = useDoctorCoverage(doctorId)

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-xs text-lhc-text-muted">
        <Loader2 className="w-3 h-3 animate-spin" />
        Checking coverage…
      </div>
    )
  }

  if (!coverage) return null

  if (coverage.is_api_integrated) {
    return (
      <div className="flex items-center gap-2 text-xs text-lhc-text-muted">
        <Wifi className="w-3 h-3 text-blue-500" />
        External API Scheduling — slots managed externally
      </div>
    )
  }

  const { days_coverage, total_slots, booked_slots } = coverage

  let statusVariant: 'default' | 'secondary' | 'destructive' = 'destructive'
  let statusLabel = 'No Coverage'
  if (days_coverage >= 30) {
    statusVariant = 'default'
    statusLabel = 'Good Coverage'
  } else if (days_coverage >= 15) {
    statusVariant = 'secondary'
    statusLabel = 'Low Coverage'
  } else if (days_coverage > 0) {
    statusVariant = 'destructive'
    statusLabel = 'Critical Coverage'
  }

  const needsExtension = days_coverage < 30
  const extensionDays = 30 - days_coverage

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="flex items-center gap-1.5 text-xs text-lhc-text-muted">
        <CalendarDays className="w-3.5 h-3.5" />
        <span>{days_coverage} day{days_coverage !== 1 ? 's' : ''} coverage</span>
        <span className="opacity-50">·</span>
        <span>{total_slots} slots ({booked_slots} booked)</span>
      </div>

      <Badge variant={statusVariant} className="text-xs">{statusLabel}</Badge>

      {needsExtension && (
        <Button
          variant={days_coverage < 15 ? 'default' : 'outline'}
          size="sm"
          className="h-6 text-xs px-2"
          onClick={onExtendAppointments}
        >
          Extend (+{extensionDays} days)
        </Button>
      )}
    </div>
  )
}
