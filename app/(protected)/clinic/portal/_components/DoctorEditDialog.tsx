'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { isPharmacy } from '@/lib/utils/specializations'
import type { Doctor, Service } from './DoctorManagement'
import BasicInfoTab from './doctor/BasicInfoTab'
import ServicesTab from './doctor/ServicesTab'
import ScheduleTab from './doctor/ScheduleTab'
import PointsTab from './doctor/PointsTab'
import DoctorSlotManager from './doctor/DoctorSlotManager'

interface Props {
  doctor: Doctor
  isOpen: boolean
  onClose: () => void
  onSave: (doctor: Doctor) => void
  predefinedServices: Service[]
  customServices: Service[]
  onAddCustomService: (svc: Service) => void
  onRemoveCustomService: (id: string) => void
  onUpdateServiceDuration: (serviceId: string, newDuration: number) => void
  clinicId: string
  clinicType: string
  subType: string
  emergencySlotsEnabled: boolean
}

export default function DoctorEditDialog({
  doctor,
  isOpen,
  onClose,
  onSave,
  predefinedServices,
  customServices,
  onAddCustomService,
  onRemoveCustomService,
  onUpdateServiceDuration,
  clinicId,
  clinicType,
  subType,
  emergencySlotsEnabled,
}: Props) {
  const [local, setLocal] = useState<Doctor>({ ...doctor })
  const [saving, setSaving] = useState(false)

  const clinicIsPharmacy = isPharmacy({ clinic_type: clinicType, sub_type: subType })

  function update(patch: Partial<Doctor>) {
    setLocal((prev) => ({ ...prev, ...patch }))
  }

  async function handleSave() {
    if (!local.name.trim()) {
      toast.error('Name is required.')
      return
    }
    if (!local.specialization.trim()) {
      toast.error(`${clinicIsPharmacy ? 'Role' : 'Specialization'} is required.`)
      return
    }
    // Validate points for each service
    for (const svc of local.services) {
      if (!clinicIsPharmacy && (local.pointsConfig[svc.name] ?? 0) <= 0) {
        toast.error(`Set points for "${svc.name}".`)
        return
      }
    }
    setSaving(true)
    try {
      onSave(local)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit {clinicIsPharmacy ? 'Pharmacist' : 'Doctor'}: {local.name}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="basic">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="services">Services</TabsTrigger>
            <TabsTrigger value="schedule">Schedule</TabsTrigger>
            {!clinicIsPharmacy && <TabsTrigger value="points">Points</TabsTrigger>}
            <TabsTrigger value="slots">Slots</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="mt-4">
            <BasicInfoTab
              doctor={local}
              onChange={update}
              clinicType={clinicType}
              subType={subType}
            />
          </TabsContent>

          <TabsContent value="services" className="mt-4">
            <ServicesTab
              doctor={local}
              onChange={update}
              predefinedServices={predefinedServices}
              customServices={customServices}
              onAddCustomService={onAddCustomService}
              onRemoveCustomService={onRemoveCustomService}
              onUpdateServiceDuration={onUpdateServiceDuration}
              clinicType={clinicType}
              subType={subType}
            />
          </TabsContent>

          <TabsContent value="schedule" className="mt-4">
            <ScheduleTab doctor={local} onChange={update} />
          </TabsContent>

          {!clinicIsPharmacy && (
            <TabsContent value="points" className="mt-4">
              <PointsTab doctor={local} onChange={update} />
            </TabsContent>
          )}

          <TabsContent value="slots" className="mt-4">
            {local.dbId && clinicId ? (
              <DoctorSlotManager
                doctorId={local.dbId}
                clinicId={clinicId}
                emergencySlotsEnabled={emergencySlotsEnabled}
                services={local.services}
                compact={false}
              />
            ) : (
              <div className="py-8 text-center text-lhc-text-muted text-sm">
                <p className="font-medium">Not Available</p>
                <p className="text-xs mt-1">Doctors synced from external systems cannot be managed here.</p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
