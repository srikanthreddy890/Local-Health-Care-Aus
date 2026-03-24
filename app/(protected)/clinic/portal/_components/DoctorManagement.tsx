'use client'

import { useState, useCallback, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Plus, Stethoscope, Trash2, Edit2, Clock, Upload, AlertTriangle, Search, SlidersHorizontal, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import DefaultAvatar from '@/components/DefaultAvatar'
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
  avatar_url: string | null
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
  custom_api_enabled?: boolean
  bulk_import_enabled?: boolean
  api_configurations_safe?: unknown[] | null
  emergency_slots_enabled?: boolean
}

function getInitials(name: string) {
  return name.split(' ').filter(Boolean).map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

function formatDays(days: string[]): string {
  if (days.length === 0) return ''
  const dayAbbrev: Record<string, string> = {
    Monday: 'Mon', Tuesday: 'Tue', Wednesday: 'Wed', Thursday: 'Thu',
    Friday: 'Fri', Saturday: 'Sat', Sunday: 'Sun',
  }
  const ordered = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  const sorted = days.sort((a, b) => ordered.indexOf(a) - ordered.indexOf(b))
  const abbrevs = sorted.map(d => dayAbbrev[d] || d)
  // Compress consecutive days: Mon ~ Sat
  if (abbrevs.length >= 3) {
    return `${abbrevs[0]} ~ ${abbrevs[abbrevs.length - 1]}`
  }
  return abbrevs.join(', ')
}

export default function DoctorManagement({ clinicId }: { clinicId: string | null }) {
  const queryClient = useQueryClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any

  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  // ── Clinic data ───────────────────────────────────────────────────────────
  const { data: clinicData } = useQuery<ClinicData | null>({
    queryKey: ['clinic-mgmt', clinicId],
    queryFn: async () => {
      if (!clinicId) return null
      const { data } = await supabase
        .from('clinics_public')
        .select('clinic_type, sub_type, specialization, centaur_api_enabled, d4w_api_enabled, custom_api_enabled, bulk_import_enabled, api_configurations_safe, emergency_slots_enabled')
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
  const isCustomApi = !!(clinicData?.custom_api_enabled)
  const isApiIntegrated = isCentaur || isCustomApi
  const bulkImportEnabled = !!clinicData?.bulk_import_enabled
  const emergencySlotsEnabled = !!clinicData?.emergency_slots_enabled

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
        const { data } = await supabase.functions.invoke('centaur-integration', {
          body: { action: 'get_doctors', clinic_id: clinicId },
        })
        return (data?.doctors ?? []).map((d: Record<string, unknown>, i: number) => ({
          id: i + 1,
          dbId: d.id as string ?? '',
          name: d.name as string ?? '',
          specialization: d.specialty as string ?? '',
          bio: '',
          avatar_url: (d.avatar_url as string | null) ?? null,
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

      if (!rows || rows.length === 0) return []

      const doctorIds = rows.map((d: Record<string, unknown>) => d.id as string)
      const { data: allDoctorServices } = await supabase
        .from('doctor_services')
        .select('doctor_id, service_id, points_awarded, services(id, name, duration_minutes, price, is_online, is_active)')
        .in('doctor_id', doctorIds)
        .eq('is_active', true)

      const servicesByDoctor: Record<string, Record<string, unknown>[]> = {}
      for (const ds of allDoctorServices ?? []) {
        const did = (ds as Record<string, unknown>).doctor_id as string
        if (!servicesByDoctor[did]) servicesByDoctor[did] = []
        servicesByDoctor[did].push(ds as Record<string, unknown>)
      }

      return rows.map((d: Record<string, unknown>, i: number) => {
        const ds = servicesByDoctor[d.id as string] ?? []

        const services: Service[] = ds.map((row) => {
          const svc = row.services as Service
          return { ...svc, id: svc.id }
        })

        const availability = (d.availability as Doctor['availability']) ?? {
          days: [],
          timeSlots: [],
          slotDuration: 30,
        }

        const pointsConfig: Record<string, number> = {}
        for (const ds_row of ds) {
          const svc = ds_row.services as Service
          if (svc?.name) pointsConfig[svc.name] = ds_row.points_awarded as number ?? 0
        }

        return {
          id: i + 1,
          dbId: d.id as string,
          name: `${d.first_name} ${d.last_name}`.trim(),
          specialization: (d.specialty as string) ?? '',
          bio: (d.bio as string) ?? '',
          avatar_url: (d.avatar_url as string | null) ?? null,
          languages: (d.languages as string[]) ?? [],
          services,
          availability,
          pointsConfig,
        } as Doctor
      })
    },
    enabled: !!clinicId,
  })

  // ── Filtered doctors ────────────────────────────────────────────────────
  const filteredDoctors = useMemo(() => {
    if (!searchQuery.trim()) return doctors
    const q = searchQuery.toLowerCase()
    return doctors.filter(d =>
      d.name.toLowerCase().includes(q) ||
      d.specialization.toLowerCase().includes(q) ||
      d.languages.some(l => l.toLowerCase().includes(q))
    )
  }, [doctors, searchQuery])

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
        avatar_url: null,
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
          avatar_url: doctor.avatar_url,
          languages: doctor.languages,
          availability: doctor.availability,
        })
        .eq('id', doctor.dbId)

      if (updateError) throw updateError

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
      toast.success(`${doctorLabel} saved.`)
    },
    onError: () => toast.error(`Failed to save ${doctorLabel}.`),
  })

  // ── Delete doctor ─────────────────────────────────────────────────────────
  const deleteDoctor = useMutation({
    mutationFn: async (dbId: string) => {
      const today = new Date().toISOString().split('T')[0]
      const { data: bookedSlots } = await supabase
        .from('appointments')
        .select('id, current_bookings')
        .eq('doctor_id', dbId)
        .is('deleted_at', null)
        .gte('appointment_date', today)
        .gt('current_bookings', 0)

      if (bookedSlots && bookedSlots.length > 0) {
        throw new Error(
          `This ${doctorLabel.toLowerCase()} has ${bookedSlots.length} upcoming booked appointment(s). Please cancel or reassign them first.`,
        )
      }

      const { error } = await supabase
        .from('doctors')
        .update({ is_active: false })
        .eq('id', dbId)
      if (error) throw error

      await supabase
        .from('doctor_services')
        .update({ is_active: false })
        .eq('doctor_id', dbId)

      const { data: unbookedSlots } = await supabase
        .from('appointments')
        .select('id')
        .eq('doctor_id', dbId)
        .is('deleted_at', null)
        .gte('appointment_date', today)
        .eq('current_bookings', 0)

      if (unbookedSlots && unbookedSlots.length > 0) {
        await supabase
          .from('appointments')
          .update({
            deleted_at: new Date().toISOString(),
            deletion_reason: `${doctorLabel} removed from clinic`,
          })
          .in('id', unbookedSlots.map((s: { id: string }) => s.id))
      }

      await supabase
        .from('doctor_unavailability')
        .delete()
        .eq('doctor_id', dbId)
        .gte('end_date', today)

      await supabase
        .from('appointment_preferences')
        .update({ is_active: false })
        .eq('doctor_id', dbId)

      await supabase
        .from('patient_doctor_favorites')
        .delete()
        .eq('doctor_id', dbId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clinic-doctors', clinicId] })
      queryClient.invalidateQueries({ queryKey: ['doctor-slots'] })
      queryClient.invalidateQueries({ queryKey: ['doctor-coverage'] })
      toast.success(`${doctorLabel} removed.`)
    },
    onError: (e: Error) => toast.error(e.message || `Failed to remove ${doctorLabel}.`),
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
  async function handleAddCustomService(svc: Service) {
    if (!clinicId) return
    const { error } = await supabase
      .from('services')
      .insert({
        clinic_id: clinicId,
        name: svc.name,
        duration_minutes: svc.duration_minutes,
        price: svc.price,
        is_online: svc.is_online,
        is_active: true,
      })
    if (error) {
      toast.error('Failed to add custom service.')
      return
    }
    queryClient.invalidateQueries({ queryKey: ['clinic-services', clinicId] })
    toast.success('Custom service added.')
  }

  async function handleRemoveCustomService(id: string) {
    const { error } = await supabase
      .from('services')
      .update({ is_active: false })
      .eq('id', id)
    if (error) {
      toast.error('Failed to remove service.')
      return
    }
    queryClient.invalidateQueries({ queryKey: ['clinic-services', clinicId] })
    toast.success('Service removed.')
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
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-lhc-text-main flex items-center gap-2">
            <Stethoscope className="w-5 h-5 text-lhc-primary" />
            {doctorsLabel}
          </h2>
          <p className="text-xs text-lhc-text-muted mt-0.5">
            {doctors.length} {doctors.length === 1 ? doctorLabel.toLowerCase() : doctorsLabel.toLowerCase()} registered at your clinic
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

      {/* DL4 — Search + Filter row */}
      {doctors.length > 0 && (
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
            <Input
              placeholder="Search doctors by name or specialty..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 text-[13px] h-9 rounded-[9px] border-[var(--color-border-secondary,#E5E7EB)]"
            />
          </div>
          <Button variant="outline" size="sm" className="h-9 px-3 rounded-[9px]">
            <SlidersHorizontal className="w-3.5 h-3.5 mr-1.5" />
            Filter
          </Button>
        </div>
      )}

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

      {/* DL4 — Empty state */}
      {doctors.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-[#F0FDF4] flex items-center justify-center mx-auto mb-4">
              <UserPlus className="w-7 h-7 text-[#059669]" />
            </div>
            <p className="text-sm font-semibold text-lhc-text-main">No {doctorsLabel.toLowerCase()} yet</p>
            <p className="text-[13px] text-lhc-text-muted mt-1">Add your first {doctorLabel.toLowerCase()} to start accepting bookings</p>
            {!isApiIntegrated && (
              <Button className="mt-4" onClick={() => addDoctor.mutate()}>
                <Plus className="w-4 h-4 mr-1" />
                Add {doctorLabel}
              </Button>
            )}
          </CardContent>
        </Card>
      ) : filteredDoctors.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-sm text-lhc-text-muted">No {doctorsLabel.toLowerCase()} match your search.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredDoctors.map((doctor) => (
            <Card key={doctor.dbId} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  {/* DL1 — Avatar + info */}
                  <div className="flex items-start gap-3.5 flex-1 min-w-0">
                    {/* Avatar */}
                    <div className="w-[52px] h-[52px] rounded-full shrink-0 overflow-hidden">
                      {doctor.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={doctor.avatar_url} alt={doctor.name} className="w-full h-full object-cover" />
                      ) : (
                        <DefaultAvatar variant="doctor" className="w-full h-full rounded-full" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      {/* Name + specialization */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-[15px] font-bold text-lhc-text-main">Dr. {doctor.name}</h3>
                        {doctor.specialization && (
                          <span className="inline-flex items-center bg-[#EFF6FF] text-[#1E40AF] border border-[#BFDBFE] text-[11px] px-2 py-[1px] rounded-full">
                            {doctor.specialization}
                          </span>
                        )}
                      </div>
                      {/* Tags row */}
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {doctor.services.length > 0 && (
                          <span className="inline-flex items-center bg-[#F3F4F6] text-[#6B7280] text-[11px] px-2 py-[1px] rounded-full">
                            {doctor.services.length} service{doctor.services.length !== 1 ? 's' : ''} assigned
                          </span>
                        )}
                        {doctor.availability.days.length > 0 && (
                          <span className="inline-flex items-center bg-[#F3F4F6] text-[#6B7280] text-[11px] px-2 py-[1px] rounded-full">
                            {formatDays(doctor.availability.days)}
                          </span>
                        )}
                      </div>
                      {/* Languages */}
                      {doctor.languages.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {doctor.languages.map((lang) => (
                            <span key={lang} className="inline-flex items-center bg-white border border-[#E5E7EB] text-[#6B7280] text-[10px] px-1.5 py-[1px] rounded-full">
                              {lang}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* DL3 — Action buttons with tooltips */}
                  {!isApiIntegrated && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => generateSlots.mutate(doctor)}
                        disabled={generateSlots.isPending}
                        title="Manage availability"
                        className="w-[34px] h-[34px] rounded-lg border border-[var(--color-border-secondary,#E5E7EB)] flex items-center justify-center text-[#6B7280] hover:bg-[var(--color-background-secondary,#F9FAFB)] transition-colors"
                      >
                        <Clock className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setEditingDoctor(doctor)}
                        title="Edit"
                        className="w-[34px] h-[34px] rounded-lg border border-[var(--color-border-secondary,#E5E7EB)] flex items-center justify-center text-[#6B7280] hover:bg-[var(--color-background-secondary,#F9FAFB)] transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Remove ${doctor.name}? This will deactivate the ${doctorLabel.toLowerCase()}, cancel all unbooked slots, and remove associated preferences and favorites.`)) deleteDoctor.mutate(doctor.dbId)
                        }}
                        title="Delete"
                        className="w-[34px] h-[34px] rounded-lg border border-[#FCA5A5] flex items-center justify-center text-[#EF4444] hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                {/* DL2 — Coverage panel with slot utilization bar */}
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
          onSave={async (d) => {
            await saveDoctor.mutateAsync(d)
            setEditingDoctor(null)
          }}
          predefinedServices={predefinedServices}
          customServices={[]}
          onAddCustomService={handleAddCustomService}
          onRemoveCustomService={handleRemoveCustomService}
          onUpdateServiceDuration={handleUpdateServiceDuration}
          clinicId={clinicId ?? ''}
          clinicType={clinicType}
          subType={subType}
          emergencySlotsEnabled={emergencySlotsEnabled}
        />
      )}
    </div>
  )
}
