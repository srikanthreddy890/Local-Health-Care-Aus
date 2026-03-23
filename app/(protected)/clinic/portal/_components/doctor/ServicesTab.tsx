'use client'

import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Plus, Pencil, Trash2, Check, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { isPharmacy } from '@/lib/utils/specializations'
import type { Doctor, Service } from '../DoctorManagement'

const PHARMACY_SERVICES: Service[] = [
  { id: 'rx-dispensing', name: 'Prescription Dispensing', duration_minutes: 10, price: 0, is_online: false, is_active: true },
  { id: 'rx-review', name: 'Medication Review', duration_minutes: 30, price: 0, is_online: false, is_active: true },
  { id: 'vaccine', name: 'Vaccination', duration_minutes: 15, price: 0, is_online: false, is_active: true },
  { id: 'health-check', name: 'Health Check', duration_minutes: 20, price: 0, is_online: false, is_active: true },
]

function getDefaultPoints(duration: number): number {
  if (duration <= 15) return 20
  if (duration <= 30) return 40
  if (duration <= 45) return 60
  if (duration <= 60) return 80
  return 100
}

interface Props {
  doctor: Doctor
  onChange: (patch: Partial<Doctor>) => void
  predefinedServices: Service[]
  customServices: Service[]
  onAddCustomService: (svc: Service) => void
  onRemoveCustomService: (id: string) => void
  onUpdateServiceDuration: (serviceId: string, newDuration: number) => void
  clinicType: string
  subType: string
}

export default function ServicesTab({
  doctor,
  onChange,
  predefinedServices,
  customServices,
  onAddCustomService,
  onRemoveCustomService,
  onUpdateServiceDuration,
  clinicType,
  subType,
}: Props) {
  const clinicIsPharmacy = isPharmacy({ clinic_type: clinicType, sub_type: subType })
  const [showCustomDialog, setShowCustomDialog] = useState(false)
  const [showDurationDialog, setShowDurationDialog] = useState(false)
  const [editingService, setEditingService] = useState<Service | null>(null)
  const [newDuration, setNewDuration] = useState('')
  const [customForm, setCustomForm] = useState({ name: '', duration: '30', category: '' })
  const [filterQuery, setFilterQuery] = useState('')

  const allServices: Service[] = clinicIsPharmacy
    ? PHARMACY_SERVICES
    : [
        ...predefinedServices,
        ...customServices.filter((cs) => !predefinedServices.find((ps) => ps.id === cs.id)),
      ]

  // SV2 — Disambiguate duplicate names by appending duration
  const nameCount = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const svc of allServices) {
      counts[svc.name] = (counts[svc.name] || 0) + 1
    }
    return counts
  }, [allServices])

  function getDisplayName(svc: Service): string {
    if ((nameCount[svc.name] ?? 0) > 1) {
      return `${svc.name} (${svc.duration_minutes} min)`
    }
    return svc.name
  }

  // SV3 — Filter services
  const filteredServices = useMemo(() => {
    if (!filterQuery.trim()) return allServices
    const q = filterQuery.toLowerCase()
    return allServices.filter(s => s.name.toLowerCase().includes(q))
  }, [allServices, filterQuery])

  const assignedIds = new Set(doctor.services.map((s) => s.id))

  function toggleService(svc: Service) {
    if (assignedIds.has(svc.id)) {
      const services = doctor.services.filter((s) => s.id !== svc.id)
      const pointsConfig = { ...doctor.pointsConfig }
      delete pointsConfig[svc.name]
      onChange({ services, pointsConfig })
    } else {
      const services = [...doctor.services, svc]
      const pointsConfig = {
        ...doctor.pointsConfig,
        [svc.name]: getDefaultPoints(svc.duration_minutes),
      }
      onChange({ services, pointsConfig })
    }
  }

  function openDurationEdit(svc: Service) {
    setEditingService(svc)
    setNewDuration(String(svc.duration_minutes))
    setShowDurationDialog(true)
  }

  function saveDuration() {
    if (!editingService) return
    const dur = parseInt(newDuration, 10)
    if (isNaN(dur) || dur <= 0) return

    const oldDefault = getDefaultPoints(editingService.duration_minutes)
    const newDefault = getDefaultPoints(dur)

    onUpdateServiceDuration(editingService.id, dur)

    if ((doctor.pointsConfig[editingService.name] ?? 0) === oldDefault) {
      onChange({ pointsConfig: { ...doctor.pointsConfig, [editingService.name]: newDefault } })
    }

    setShowDurationDialog(false)
    setEditingService(null)
  }

  function handleAddCustom() {
    const name = customForm.name.trim()
    if (!name) return

    const exists = allServices.some((s) => s.name.toLowerCase() === name.toLowerCase())
    if (exists) return

    const svc: Service = {
      id: `custom-${Date.now()}`,
      name,
      duration_minutes: parseInt(customForm.duration, 10) || 30,
      price: 0,
      is_online: false,
      is_active: true,
    }

    onAddCustomService(svc)
    setShowCustomDialog(false)
    setCustomForm({ name: '', duration: '30', category: '' })
  }

  const totalPoints = doctor.services.reduce(
    (sum, svc) => sum + (doctor.pointsConfig[svc.name] ?? 0),
    0,
  )

  return (
    <div className="space-y-4">
      {/* SV3 — Header with search filter */}
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-lhc-text-muted shrink-0">
          Select services for Dr. {doctor.name.split(' ')[0]}
        </p>
        <div className="relative w-[180px]">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#9CA3AF]" />
          <Input
            placeholder="Filter services..."
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            className="pl-7 text-[11px] h-7 rounded-[7px] bg-[var(--color-background-secondary,#F9FAFB)]"
          />
        </div>
      </div>

      {/* Service list */}
      <div className="space-y-2">
        {filteredServices.length === 0 ? (
          <p className="text-xs text-lhc-text-muted text-center py-4">No services match your search</p>
        ) : (
          filteredServices.map((svc) => {
            const assigned = assignedIds.has(svc.id)
            const isCustom = svc.id.startsWith('custom-')
            const points = doctor.pointsConfig[svc.name] ?? getDefaultPoints(svc.duration_minutes)

            return (
              <div
                key={svc.id}
                className={cn(
                  'flex items-center justify-between border rounded-lg px-3 py-2.5 cursor-pointer transition-colors',
                  assigned ? 'border-[#00A86B] bg-[#00A86B]/5' : 'border-[var(--color-border-secondary,#E5E7EB)] hover:bg-[#F9FAFB]',
                )}
                onClick={() => toggleService(svc)}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={cn(
                      'w-[18px] h-[18px] rounded border flex items-center justify-center shrink-0',
                      assigned ? 'bg-[#00A86B] border-[#00A86B]' : 'border-[var(--color-border-secondary,#E5E7EB)]',
                    )}
                  >
                    {assigned && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <span className={cn('text-sm', assigned ? 'text-[#00A86B] font-medium' : 'text-lhc-text-main')}>
                    {getDisplayName(svc)}
                  </span>
                  {isCustom && <Badge variant="secondary" className="text-[9px] px-1">Custom</Badge>}
                </div>

                <div className="flex items-center gap-2">
                  {/* Duration pill */}
                  <span className="inline-flex items-center bg-[#F3F4F6] text-[#6B7280] text-[10px] px-2 py-[1px] rounded-full">
                    {svc.duration_minutes} min
                  </span>
                  {/* SV1 — Points badge */}
                  {!clinicIsPharmacy && (
                    <span className={cn(
                      'inline-flex items-center text-[10px] px-2 py-[1px] rounded-full border',
                      assigned
                        ? 'bg-[#ECFDF5] text-[#065F46] border-[#6EE7B7]'
                        : 'bg-[#FFFBEB] text-[#92400E] border-[#FDE68A]',
                    )}>
                      {points} pts
                    </span>
                  )}
                  {!isCustom && !clinicIsPharmacy && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={(e) => {
                        e.stopPropagation()
                        openDurationEdit(svc)
                      }}
                    >
                      <Pencil className="w-3 h-3" />
                    </Button>
                  )}
                  {isCustom && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-destructive"
                      onClick={(e) => {
                        e.stopPropagation()
                        onRemoveCustomService(svc.id)
                      }}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* SV4 — Dashed add custom service button */}
      <button
        onClick={() => setShowCustomDialog(true)}
        className="flex items-center gap-1.5 border-[1.5px] border-dashed border-[var(--color-border-secondary,#E5E7EB)] text-[#00A86B] bg-transparent text-[12px] px-3.5 py-2 rounded-lg w-fit hover:bg-[#F0FDF4] hover:border-[#6EE7B7] transition-colors"
      >
        <Plus className="w-3.5 h-3.5" />
        Add Custom Service
      </button>

      {/* SV5 — Footer summary */}
      {!clinicIsPharmacy && doctor.services.length > 0 && (
        <div className="flex items-center justify-between border-t border-[var(--color-border-tertiary,#E5E7EB)] pt-3 bg-[var(--color-background-secondary,transparent)]">
          <span className="text-xs text-lhc-text-muted">
            {doctor.services.length} services assigned
          </span>
          <span
            className="inline-flex items-center bg-[#ECFDF5] text-[#065F46] border border-[#6EE7B7] text-[11px] px-2.5 py-[3px] rounded-full cursor-help"
            title="Total points a patient earns by booking all assigned services once."
          >
            {totalPoints} pts total
          </span>
        </div>
      )}

      {/* Duration edit dialog */}
      <Dialog open={showDurationDialog} onOpenChange={setShowDurationDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit Duration — {editingService?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Duration (minutes)</Label>
            <Input
              type="number"
              min={5}
              step={5}
              value={newDuration}
              onChange={(e) => setNewDuration(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDurationDialog(false)}>Cancel</Button>
            <Button onClick={saveDuration}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add custom service dialog */}
      <Dialog open={showCustomDialog} onOpenChange={setShowCustomDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Custom Service</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Service Name</Label>
              <Input
                value={customForm.name}
                onChange={(e) => setCustomForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Comprehensive Eye Test"
              />
            </div>
            <div className="space-y-1">
              <Label>Duration (minutes)</Label>
              <Select
                value={customForm.duration}
                onValueChange={(v) => setCustomForm((f) => ({ ...f, duration: v }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[10, 15, 20, 30, 45, 60, 90, 120].map((d) => (
                    <SelectItem key={d} value={String(d)}>{d} min</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCustomDialog(false)}>Cancel</Button>
            <Button onClick={handleAddCustom} disabled={!customForm.name.trim()}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
