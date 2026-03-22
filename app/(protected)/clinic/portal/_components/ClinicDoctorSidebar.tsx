'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ChevronRight, ChevronLeft, Stethoscope, RefreshCw, ArrowLeft, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import DoctorSlotManager from './doctor/DoctorSlotManager'

interface Props {
  clinicId: string
  isOpen: boolean
  onToggle: () => void
  emergencySlotsEnabled: boolean
}

interface DoctorWithStats {
  id: string
  firstName: string
  lastName: string
  specialty: string | null
  services: { id: string; name: string; duration_minutes: number; price: number; is_online: boolean; is_active: boolean }[]
  totalSlots: number
  availableSlots: number
  todaySlots: number
}

export default function ClinicDoctorSidebar({ clinicId, isOpen, onToggle, emergencySlotsEnabled }: Props) {
  const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(null)
  // Track when we return from detail to trigger a refetch
  const prevSelectedRef = useRef<string | null>(null)

  useEffect(() => {
    if (prevSelectedRef.current !== null && selectedDoctorId === null) {
      // Returned to list — refetch will happen via invalidation
      refetchDoctors()
    }
    prevSelectedRef.current = selectedDoctorId
  }, [selectedDoctorId]) // eslint-disable-line react-hooks/exhaustive-deps

  const today = new Date().toISOString().split('T')[0]
  const futureDate = (() => {
    const d = new Date()
    d.setDate(d.getDate() + 30)
    return d.toISOString().split('T')[0]
  })()

  const { data: doctors, isLoading, refetch: refetchDoctors } = useQuery({
    queryKey: ['sidebar-doctors', clinicId],
    queryFn: async (): Promise<DoctorWithStats[]> => {
      if (!clinicId) return []
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabase = createClient() as any

      const { data: rows } = await supabase
        .from('doctors')
        .select('id, first_name, last_name, specialty')
        .eq('clinic_id', clinicId)
        .eq('is_active', true)
        .order('first_name')

      if (!rows || rows.length === 0) return []

      const doctorIds = rows.map((d: { id: string }) => d.id)

      // Batch-fetch all appointments and services in 2 queries instead of 2N
      const [{ data: allSlots }, { data: allDs }] = await Promise.all([
        supabase
          .from('appointments')
          .select('doctor_id, appointment_date, current_bookings, max_bookings, status')
          .in('doctor_id', doctorIds)
          .is('deleted_at', null)
          .gte('appointment_date', today)
          .lte('appointment_date', futureDate),
        supabase
          .from('doctor_services')
          .select('doctor_id, service_id, services(id, name, duration_minutes, price, is_online, is_active)')
          .in('doctor_id', doctorIds)
          .eq('is_active', true),
      ])

      // Group by doctor_id
      const slotsByDoctor: Record<string, { appointment_date: string; current_bookings: number; max_bookings: number; status: string }[]> = {}
      for (const s of (allSlots ?? []) as { doctor_id: string; appointment_date: string; current_bookings: number; max_bookings: number; status: string }[]) {
        if (!slotsByDoctor[s.doctor_id]) slotsByDoctor[s.doctor_id] = []
        slotsByDoctor[s.doctor_id].push(s)
      }

      const servicesByDoctor: Record<string, unknown[]> = {}
      for (const ds of (allDs ?? []) as { doctor_id: string; services: unknown }[]) {
        if (!servicesByDoctor[ds.doctor_id]) servicesByDoctor[ds.doctor_id] = []
        if (ds.services) servicesByDoctor[ds.doctor_id].push(ds.services)
      }

      return rows.map((d: { id: string; first_name: string; last_name: string; specialty: string | null }) => {
        const doctorSlots = slotsByDoctor[d.id] ?? []
        const totalSlots = doctorSlots.length
        const availableSlots = doctorSlots.filter(
          (s) => s.current_bookings < s.max_bookings && s.status !== 'cancelled',
        ).length
        const todaySlots = doctorSlots.filter((s) => s.appointment_date === today).length

        return {
          id: d.id,
          firstName: d.first_name,
          lastName: d.last_name,
          specialty: d.specialty,
          services: servicesByDoctor[d.id] ?? [],
          totalSlots,
          availableSlots,
          todaySlots,
        }
      })
    },
    enabled: isOpen && !!clinicId,
    staleTime: 30_000,
  })

  const selectedDoctor = doctors?.find((d) => d.id === selectedDoctorId)

  const handleRefetch = useCallback(() => {
    refetchDoctors()
  }, [refetchDoctors])

  return (
    <>
      {/* Toggle tab — fixed to right edge, vertically centred */}
      <button
        onClick={onToggle}
        style={{ right: isOpen ? 420 : 0, transition: 'right 0.3s ease-in-out' }}
        className="fixed top-1/2 -translate-y-1/2 z-40 bg-lhc-primary text-white rounded-l-lg px-2 py-4 flex flex-col items-center gap-1 shadow-lg hover:opacity-90 transition-opacity"
        aria-label="Toggle doctor sidebar"
      >
        {isOpen ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        <span className="text-[10px] font-semibold [writing-mode:vertical-rl] rotate-180">Doctors</span>
      </button>

      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 sm:hidden"
          onClick={onToggle}
          aria-hidden="true"
        />
      )}

      {/* Sidebar panel */}
      <div
        className={cn(
          'fixed right-0 top-0 h-full w-full sm:w-[420px] bg-lhc-surface border-l border-lhc-border shadow-2xl z-50 transition-transform duration-300 flex flex-col',
          isOpen ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        {/* ── List view ───────────────────────────────────────────────── */}
        {!selectedDoctorId && (
          <>
            <div className="flex items-center justify-between p-4 border-b border-lhc-border shrink-0">
              <h2 className="font-bold text-lhc-text-main flex items-center gap-2">
                <Stethoscope className="w-5 h-5 text-lhc-primary" />
                Doctor Roster
              </h2>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={handleRefetch} title="Refresh">
                  <RefreshCw className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={onToggle}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-lhc-primary" />
                </div>
              ) : !doctors || doctors.length === 0 ? (
                <div className="text-center py-10">
                  <Stethoscope className="w-8 h-8 mx-auto text-lhc-text-muted mb-2" />
                  <p className="text-sm text-lhc-text-muted">No doctors yet.</p>
                  <p className="text-xs text-lhc-text-muted mt-1">Go to the Doctors tab to add doctors.</p>
                </div>
              ) : (
                doctors.map((doctor) => (
                  <button
                    key={doctor.id}
                    className="w-full text-left border border-lhc-border rounded-lg p-3 hover:bg-lhc-background transition-colors"
                    onClick={() => setSelectedDoctorId(doctor.id)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-sm text-lhc-text-main truncate">
                          {doctor.firstName} {doctor.lastName}
                        </p>
                        {doctor.specialty && (
                          <p className="text-xs text-lhc-text-muted truncate">{doctor.specialty}</p>
                        )}
                      </div>
                    </div>
                    {/* Stat pills */}
                    <div className="flex gap-2 mt-2 flex-wrap">
                      <Badge variant="secondary" className="text-xs">
                        Today: {doctor.todaySlots}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        Open: {doctor.availableSlots}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        30d: {doctor.totalSlots}
                      </Badge>
                    </div>
                  </button>
                ))
              )}
            </div>
          </>
        )}

        {/* ── Detail view ─────────────────────────────────────────────── */}
        {selectedDoctorId && (
          <>
            <div className="flex items-center gap-2 p-4 border-b border-lhc-border shrink-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedDoctorId(null)}
                title="Back to list"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div className="min-w-0">
                <p className="font-semibold text-sm text-lhc-text-main truncate">
                  {selectedDoctor?.firstName} {selectedDoctor?.lastName}
                </p>
                {selectedDoctor?.specialty && (
                  <p className="text-xs text-lhc-text-muted">{selectedDoctor.specialty}</p>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {selectedDoctor && selectedDoctor.services.length === 0 ? (
                <div className="text-center py-10 text-sm text-lhc-text-muted">
                  <p className="font-medium">No services assigned</p>
                  <p className="text-xs mt-1">Assign at least one service in the Doctors tab.</p>
                </div>
              ) : (
                <DoctorSlotManager
                  doctorId={selectedDoctorId}
                  clinicId={clinicId}
                  emergencySlotsEnabled={emergencySlotsEnabled}
                  services={selectedDoctor?.services ?? []}
                  compact={true}
                />
              )}
            </div>
          </>
        )}
      </div>
    </>
  )
}
