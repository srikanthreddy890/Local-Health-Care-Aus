'use client'

import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Plus, Stethoscope, Trash2, Edit2, Zap, Upload, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { isPharmacy } from '@/lib/utils/specializations'
import DoctorEditDialog from './DoctorEditDialog'
import AppointmentCoveragePanel from './AppointmentCoveragePanel'

export interface Service {
  id: string
  name: string
  duration_minutes: number
  price: number
  is_online: boolean
  is_active: boolean
  default_points?: number
}

export interface TimeSlot {
  id: string
  startTime: string
  endTime: string
  duration: number
  isCustom: boolean
}

export interface Doctor {
  id: number
  dbId: string
  name: string
  specialization: string
  bio: string
  languages: string[]
  services: Service[]
  availability: {
    days: string[]
    timeSlots: TimeSlot[]
    slotDuration: number
    recurrencePattern?: { type: string; weekOffset?: number }
  }
  pointsConfig: Record<string, number>
}

interface ClinicData {
  clinic_type?: string | null
  sub_type?: string | null
  specialization?: string | null
  centaur_api_enabled?: boolean
  d4w_api_enabled?: boolean
  bulk_import_enabled?: boolean
  api_configurations_safe?: unknown[] | null
}

export default function DoctorManagement({ clinicId }: { clinicId: string | null }) {
  const queryClient = useQueryClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any

  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null)
  const [customServices, setCustomServices] = useState<Service[]>([])

  // ── Clinic data ───────────────────────────────────────────────────────────
  const { data: clinicData } = useQuery<ClinicData | null>({
    queryKey: ['clinic-mgmt', clinicId],
    queryFn: async () => {
      if (!clinicId) return null
      const { data } = await supabase
        .from('clinics_public')
        .select('clinic_type, sub_type, specialization, centaur_api_enabled, d4w_api_enabled, bulk_import_enabled, api_configurations_safe')
        .eq('id', clinicId)
        .single()
      return data
    },
    enabled: !!clinicId,
  })

  const clinicType = clinicData?.clinic_type ?? ''
  const subType = clinicData?.sub_type ?? ''
  const clinicIsPharmacy = isPharmacy(clinicData)
  const isCentaur = !!(clinicData?.centaur_api_enabled || clinicData?.d4w_api_enabled)
  const isCustomApi = !!(clinicData?.api_configurations_safe && (clinicData.api_configurations_safe as unknown[]).length > 0)
  const isApiIntegrated = isCentaur || isCustomApi
  const bulkImportEnabled = !!clinicData?.bulk_import_enabled

  const doctorLabel = clinicIsPharmacy ? 'Pharmacist' : 'Doctor'
  const doctorsLabel = clinicIsPharmacy ? 'Pharmacists' : 'Doctors'

  // ── Predefined services ───────────────────────────────────────────────────
  const { data: predefinedServices = [] } = useQuery<Service[]>({
    queryKey: ['clinic-services', clinicId],
    queryFn: async () => {
      if (!clinicId) return []
      const { data } = await supabase
        .from('services')
        .select('*')
        .eq('clinic_id', clinicId)
        .eq('is_active', true)
        .order('name')
      return data ?? []
    },
    enabled: !!clinicId,
  })

  // ── Ensure default services exist ─────────────────────────────────────────
  const ensureDefaultServices = useCallback(async () => {
    if (!clinicId) return
    // Fresh DB count — do not read from React Query state which may not be loaded yet
    const { count } = await supabase
      .from('services')
      .select('id', { count: 'exact', head: true })
      .eq('clinic_id', clinicId)
      .eq('is_active', true)
    if (count && count > 0) return
    const rpcName =
      clinicType === 'dental'
        ? 'create_predefined_services_for_clinic'
        : 'create_predefined_gp_services_for_clinic'
    await supabase.rpc(rpcName, { p_clinic_id: clinicId })
    queryClient.invalidateQueries({ queryKey: ['clinic-services', clinicId] })
  }, [clinicId, clinicType, queryClient, supabase])

  // ── Doctors fetch ─────────────────────────────────────────────────────────
  const { data: doctors = [], isLoading } = useQuery<Doctor[]>({
    queryKey: ['clinic-doctors', clinicId],
    queryFn: async () => {
      if (!clinicId) return []

      await ensureDefaultServices()

      if (isCentaur) {
        // Read-only from edge function
        const { data } = await supabase.functions.invoke('centaur-integration', {
          body: { action: 'get_doctors', clinic_id: clinicId },
        })
        return (data?.doctors ?? []).map((d: Record<string, unknown>, i: number) => ({
          id: i + 1,
          dbId: d.id as string ?? '',
          name: d.name as string ?? '',
          specialization: d.specialty as string ?? '',
          bio: '',
          languages: [],
          services: [],
          availability: { days: [], timeSlots: [], slotDuration: 30 },
          pointsConfig: {},
        }))
      }

      const { data: rows } = await supabase
        .from('doctors')
        .select('*')
        .eq('clinic_id', clinicId)
        .eq('is_active', true)
        .order('first_name')

      if (!rows) return []

      // Fetch services for each doctor
      const withServices = await Promise.all(
        rows.map(async (d: Record<string, unknown>, i: number) => {
          const { data: ds } = await supabase
            .from('doctor_services')
            .select('service_id, points_awarded, services(id, name, duration_minutes, price, is_online, is_active)')
            .eq('doctor_id', d.id)
            .eq('is_active', true)

          const services: Service[] = (ds ?? []).map((row: Record<string, unknown>) => {
            const svc = row.services as Service
            return { ...svc, id: svc.id }
          })

          const availability = (d.availability as Doctor['availability']) ?? {
            days: [],
            timeSlots: [],
            slotDuration: 30,
          }

          const pointsConfig: Record<string, number> = {}
          for (const ds_row of ds ?? []) {
            const svc = (ds_row as Record<string, unknown>).services as Service
            if (svc?.name) pointsConfig[svc.name] = (ds_row as Record<string, unknown>).points_awarded as number ?? 0
          }

          return {
            id: i + 1,
            dbId: d.id as string,
            name: `${d.first_name} ${d.last_name}`.trim(),
            specialization: (d.specialty as string) ?? '',
            bio: (d.bio as string) ?? '',
            languages: (d.languages as string[]) ?? [],
            services,
            availability,
            pointsConfig,
          } as Doctor
        }),
      )

      return withServices
    },
    enabled: !!clinicId,
  })

  // ── Add doctor ────────────────────────────────────────────────────────────
  const addDoctor = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from('doctors')
        .insert({
          clinic_id: clinicId,
          first_name: 'New',
          last_name: doctorLabel,
          specialty: '',
          bio: '',
          languages: [],
          is_active: true,
          availability: { days: [], timeSlots: [], slotDuration: 30 },
        })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['clinic-doctors', clinicId] })
      const newDoc: Doctor = {
        id: doctors.length + 1,
        dbId: data.id,
        name: `New ${doctorLabel}`,
        specialization: '',
        bio: '',
        languages: [],
        services: [],
        availability: { days: [], timeSlots: [], slotDuration: 30 },
        pointsConfig: {},
      }
      setEditingDoctor(newDoc)
    },
    onError: () => toast.error(`Failed to add ${doctorLabel}.`),
  })

  // ── Save doctor ───────────────────────────────────────────────────────────
  const saveDoctor = useMutation({
    mutationFn: async (doctor: Doctor) => {
      // Update doctor row
      const nameParts = doctor.name.trim().split(' ')
      const firstName = nameParts.slice(0, -1).join(' ') || nameParts[0]
      const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : ''

      const { error: updateError } = await supabase
        .from('doctors')
        .update({
          first_name: firstName,
          last_name: lastName,
          specialty: doctor.specialization,
          bio: doctor.bio,
          languages: doctor.languages,
          availability: doctor.availability,
        })
        .eq('id', doctor.dbId)

      if (updateError) throw updateError

      // Replace doctor_services
      await supabase.from('doctor_services').delete().eq('doctor_id', doctor.dbId)

      if (doctor.services.length > 0) {
        const inserts = doctor.services.map((svc) => ({
          doctor_id: doctor.dbId,
          service_id: svc.id,
          points_awarded: doctor.pointsConfig[svc.name] ?? 0,
          is_active: true,
        }))
        const { error: svcError } = await supabase.from('doctor_services').insert(inserts)
        if (svcError) throw svcError
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clinic-doctors', clinicId] })
      setEditingDoctor(null)
      toast.success(`${doctorLabel} saved.`)
    },
    onError: () => toast.error(`Failed to save ${doctorLabel}.`),
  })

  // ── Delete doctor ─────────────────────────────────────────────────────────
  const deleteDoctor = useMutation({
    mutationFn: async (dbId: string) => {
      const { error } = await supabase.from('doctors').delete().eq('id', dbId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clinic-doctors', clinicId] })
      toast.success(`${doctorLabel} deleted.`)
    },
    onError: () => toast.error(`Failed to delete ${doctorLabel}.`),
  })

  // ── Generate appointment slots ────────────────────────────────────────────
  const generateSlots = useMutation({
    mutationFn: async (doctor: Doctor) => {
      const { data } = await supabase.functions.invoke('auto-generate-appointments', {
        body: { doctorId: doctor.dbId },
      })
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['doctor-coverage'] })
      if (data?.slots_generated > 0) {
        toast.success(`Generated ${data.slots_generated} appointment slot(s).`)
      } else {
        const reason = data?.reason ?? 'unknown'
        const messages: Record<string, string> = {
          sufficient_coverage: 'Already has 30+ days of coverage.',
          no_services: 'No services assigned — assign services first.',
          recent_generation: 'Slots were recently generated.',
        }
        toast.info(messages[reason] ?? `No slots generated (${reason}).`)
      }
    },
    onError: () => toast.error('Failed to generate slots.'),
  })

  // ── Custom service handlers ───────────────────────────────────────────────
  function handleAddCustomService(svc: Service) {
    setCustomServices((prev) => [...prev, svc])
  }

  function handleRemoveCustomService(id: string) {
    setCustomServices((prev) => prev.filter((s) => s.id !== id))
  }

  function handleUpdateServiceDuration(serviceId: string, newDuration: number) {
    queryClient.setQueryData<Service[]>(['clinic-services', clinicId], (old) =>
      (old ?? []).map((s) => (s.id === serviceId ? { ...s, duration_minutes: newDuration } : s)),
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 bg-lhc-border rounded-lg animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-lhc-text-main flex items-center gap-2">
            <Stethoscope className="w-5 h-5 text-lhc-primary" />
            {doctorsLabel}
          </h2>
          <p className="text-sm text-lhc-text-muted mt-0.5">
            {doctors.length} {doctors.length === 1 ? doctorLabel : doctorsLabel}
            {isApiIntegrated && (
              <span className="ml-2 text-xs text-yellow-600">(Read-only — managed via external integration)</span>
            )}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {bulkImportEnabled && !isApiIntegrated && (
            <Button variant="outline" size="sm" onClick={() => toast.info('Bulk import coming soon.')}>
              <Upload className="w-4 h-4 mr-1" />
              Bulk Import
            </Button>
          )}
          {!isApiIntegrated && (
            <Button size="sm" onClick={() => addDoctor.mutate()}>
              <Plus className="w-4 h-4 mr-1" />
              Add {doctorLabel}
            </Button>
          )}
        </div>
      </div>

      {/* Read-only notice for API clinics */}
      {isApiIntegrated && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-4 pb-3 flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5 shrink-0" />
            <p className="text-sm text-yellow-800">
              This clinic uses an external scheduling system. {doctorsLabel} are managed there and synced here in read-only mode.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Doctor list */}
      {doctors.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Stethoscope className="w-10 h-10 text-lhc-text-muted mx-auto mb-3" />
            <p className="text-lhc-text-muted">No {doctorsLabel.toLowerCase()} yet.</p>
            {!isApiIntegrated && (
              <Button className="mt-4" onClick={() => addDoctor.mutate()}>
                <Plus className="w-4 h-4 mr-1" />
                Add {doctorLabel}
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {doctors.map((doctor) => (
            <Card key={doctor.dbId} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-lhc-text-main">{doctor.name}</h3>
                      {doctor.specialization && (
                        <Badge variant="secondary">{doctor.specialization}</Badge>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-2 text-xs text-lhc-text-muted">
                      {doctor.services.length > 0 && (
                        <span>{doctor.services.length} service{doctor.services.length !== 1 ? 's' : ''}</span>
                      )}
                      {doctor.availability.days.length > 0 && (
                        <span>{doctor.availability.days.join(', ')}</span>
                      )}
                      {doctor.languages.length > 0 && (
                        <span>{doctor.languages.join(', ')}</span>
                      )}
                    </div>
                  </div>

                  {!isApiIntegrated && (
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => generateSlots.mutate(doctor)}
                        disabled={generateSlots.isPending}
                        title="Generate appointment slots"
                      >
                        <Zap className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingDoctor(doctor)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => {
                          if (confirm(`Delete ${doctor.name}?`)) deleteDoctor.mutate(doctor.dbId)
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>

                {/* Coverage panel */}
                {doctor.dbId && (
                  <div className="mt-3 pt-3 border-t border-lhc-border">
                    <AppointmentCoveragePanel
                      doctorId={doctor.dbId}
                      onExtendAppointments={() => generateSlots.mutate(doctor)}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit dialog */}
      {editingDoctor && (
        <DoctorEditDialog
          doctor={editingDoctor}
          isOpen={!!editingDoctor}
          onClose={() => setEditingDoctor(null)}
          onSave={(d) => saveDoctor.mutate(d)}
          predefinedServices={predefinedServices}
          customServices={customServices}
          onAddCustomService={handleAddCustomService}
          onRemoveCustomService={handleRemoveCustomService}
          onUpdateServiceDuration={handleUpdateServiceDuration}
          clinicId={clinicId ?? ''}
          clinicType={clinicType}
          subType={subType}
          emergencySlotsEnabled={false}
        />
      )}
    </div>
  )
}
