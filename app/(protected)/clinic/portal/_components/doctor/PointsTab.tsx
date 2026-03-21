'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Gift, Star } from 'lucide-react'
import type { Doctor } from '../DoctorManagement'

const PRESETS = [
  { label: 'Basic', multiplier: 1 },
  { label: 'Premium', multiplier: 1.5 },
  { label: 'Specialty', multiplier: 2 },
  { label: 'VIP', multiplier: 3 },
]

function getBasePoints(duration: number): number {
  if (duration <= 15) return 20
  if (duration <= 30) return 40
  if (duration <= 45) return 60
  if (duration <= 60) return 80
  return 100
}

interface Props {
  doctor: Doctor
  onChange: (patch: Partial<Doctor>) => void
}

export default function PointsTab({ doctor, onChange }: Props) {
  const totalPoints = doctor.services.reduce(
    (sum, svc) => sum + (doctor.pointsConfig[svc.name] ?? 0),
    0,
  )

  function applyPreset(multiplier: number) {
    const updated = { ...doctor.pointsConfig }
    for (const svc of doctor.services) {
      updated[svc.name] = Math.round(getBasePoints(svc.duration_minutes) * multiplier)
    }
    onChange({ pointsConfig: updated })
  }

  function setPoints(serviceName: string, value: string) {
    const pts = parseInt(value, 10)
    onChange({
      pointsConfig: {
        ...doctor.pointsConfig,
        [serviceName]: isNaN(pts) ? 0 : Math.max(0, pts),
      },
    })
  }

  if (doctor.services.length === 0) {
    return (
      <div className="py-10 text-center text-lhc-text-muted text-sm">
        <Gift className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p>Assign services first to configure loyalty points.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <Card>
        <CardContent className="pt-4 pb-3 flex items-center gap-4">
          <Star className="w-5 h-5 text-lhc-primary" />
          <div>
            <p className="text-sm font-medium text-lhc-text-main">{totalPoints} total points</p>
            <p className="text-xs text-lhc-text-muted">{doctor.services.length} service(s)</p>
          </div>
        </CardContent>
      </Card>

      {/* Quick presets */}
      <div>
        <p className="text-sm font-medium text-lhc-text-main mb-2">Quick Presets (apply to all)</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {PRESETS.map((preset) => (
            <Button
              key={preset.label}
              variant="outline"
              size="sm"
              onClick={() => applyPreset(preset.multiplier)}
            >
              {preset.label} ({preset.multiplier}×)
            </Button>
          ))}
        </div>
      </div>

      {/* Per-service inputs */}
      <div className="space-y-3">
        <p className="text-sm font-medium text-lhc-text-main">Per-Service Points</p>
        {doctor.services.map((svc) => {
          const pts = doctor.pointsConfig[svc.name] ?? 0
          const suggested = getBasePoints(svc.duration_minutes)
          return (
            <div key={svc.id} className="flex items-center justify-between gap-3 border border-lhc-border rounded-lg px-3 py-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-lhc-text-main truncate">{svc.name}</p>
                <p className="text-xs text-lhc-text-muted">{svc.duration_minutes}min · Suggested: {suggested}</p>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={0}
                  value={pts}
                  onChange={(e) => setPoints(svc.name, e.target.value)}
                  className="w-20 text-right"
                />
                <Badge variant="secondary" className="text-xs">pts</Badge>
              </div>
            </div>
          )
        })}
      </div>

      {/* Breakdown */}
      <Card>
        <CardContent className="pt-4 pb-3 space-y-1">
          <p className="text-sm font-medium text-lhc-text-main mb-2">Points Breakdown</p>
          {doctor.services.map((svc) => (
            <div key={svc.id} className="flex justify-between text-xs text-lhc-text-muted">
              <span>{svc.name}</span>
              <span>{doctor.pointsConfig[svc.name] ?? 0} pts</span>
            </div>
          ))}
          <div className="flex justify-between text-sm font-semibold text-lhc-text-main border-t border-lhc-border pt-2 mt-2">
            <span>Total</span>
            <span>{totalPoints} pts</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
