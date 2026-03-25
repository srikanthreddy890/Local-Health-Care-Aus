'use client'

import { useState, useCallback, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  ChevronRight, ChevronLeft, Calendar, RefreshCw, ArrowLeft,
  Loader2, Plus, Stethoscope, Users,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import DateDoctorSlotView from './doctor/DateDoctorSlotView'
import GlobalAddSlotDialog from './doctor/GlobalAddSlotDialog'

interface Props {
  clinicId: string
  isOpen: boolean
  onToggle: () => void
  emergencySlotsEnabled: boolean
}

interface DoctorInfo {
  id: string
  firstName: string
  lastName: string
  specialty: string | null
  services: { id: string; name: string; duration_minutes: number; price: number; is_online: boolean; is_active: boolean }[]
}

interface SlotRow {
  doctor_id: string
  appointment_date: string
  current_bookings: number
  max_bookings: number
  status: string
}

interface DateSummary {
  date: string
  doctorCount: number
  totalSlots: number
  availableSlots: number
  bookedSlots: number
}

interface DoctorDateSummary {
  doctorId: string
  firstName: string
  lastName: string
  specialty: string | null
  totalSlots: number
  availableSlots: number
  bookedSlots: number
  services: DoctorInfo['services']
}

type SidebarView =
  | { kind: 'dates' }
  | { kind: 'doctors'; date: string }
  | { kind: 'slots'; date: string; doctorId: string }

function formatDateHuman(isoDate: string): string {
  const d = new Date(isoDate + 'T00:00:00')
  return d.toLocaleDateString('en-AU', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).toUpperCase()
}

function formatDateShort(isoDate: string): string {
  const d = new Date(isoDate + 'T00:00:00')
  return d.toLocaleDateString('en-AU', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

function isToday(isoDate: string): boolean {
  return isoDate === new Date().toISOString().split('T')[0]
}

export default function ClinicDoctorSidebar({ clinicId, isOpen, onToggle, emergencySlotsEnabled }: Props) {
  const [view, setView] = useState<SidebarView>({ kind: 'dates' })
  const [showGlobalAdd, setShowGlobalAdd] = useState(false)

  const today = new Date().toISOString().split('T')[0]
  const futureDate = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() + 30)
    return d.toISOString().split('T')[0]
  }, [])

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['sidebar-doctors', clinicId],
    queryFn: async () => {
      if (!clinicId) return { doctors: [], slots: [] }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabase = createClient() as any

      const { data: rows } = await supabase
        .from('doctors')
        .select('id, first_name, last_name, specialty')
        .eq('clinic_id', clinicId)
        .eq('is_active', true)
        .order('first_name')

      if (!rows || rows.length === 0) return { doctors: [], slots: [] }

      const doctorIds = rows.map((d: { id: string }) => d.id)

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

      const servicesByDoctor: Record<string, DoctorInfo['services']> = {}
      for (const ds of (allDs ?? []) as { doctor_id: string; services: DoctorInfo['services'][number] }[]) {
        if (!servicesByDoctor[ds.doctor_id]) servicesByDoctor[ds.doctor_id] = []
        if (ds.services) servicesByDoctor[ds.doctor_id].push(ds.services)
      }

      const doctors: DoctorInfo[] = rows.map((d: { id: string; first_name: string; last_name: string; specialty: string | null }) => ({
        id: d.id,
        firstName: d.first_name,
        lastName: d.last_name,
        specialty: d.specialty,
        services: servicesByDoctor[d.id] ?? [],
      }))

      return {
        doctors,
        slots: (allSlots ?? []) as SlotRow[],
      }
    },
    enabled: isOpen && !!clinicId,
    staleTime: 30_000,
  })

  const doctors = data?.doctors ?? []
  const allSlots = data?.slots ?? []

  // Derive date summaries
  const dateSummaries: DateSummary[] = useMemo(() => {
    const byDate: Record<string, SlotRow[]> = {}
    for (const s of allSlots) {
      if (!byDate[s.appointment_date]) byDate[s.appointment_date] = []
      byDate[s.appointment_date].push(s)
    }
    return Object.entries(byDate)
      .map(([date, slots]) => {
        const uniqueDoctors = new Set(slots.map((s) => s.doctor_id))
        const available = slots.filter((s) => s.current_bookings < s.max_bookings && s.status !== 'cancelled')
        const booked = slots.filter((s) => s.current_bookings > 0)
        return {
          date,
          doctorCount: uniqueDoctors.size,
          totalSlots: slots.length,
          availableSlots: available.length,
          bookedSlots: booked.length,
        }
      })
      .sort((a, b) => a.date.localeCompare(b.date))
  }, [allSlots])

  // Derive doctors for a given date
  const getDoctorsForDate = useCallback((date: string): DoctorDateSummary[] => {
    const dateSlots = allSlots.filter((s) => s.appointment_date === date)
    const byDoctor: Record<string, SlotRow[]> = {}
    for (const s of dateSlots) {
      if (!byDoctor[s.doctor_id]) byDoctor[s.doctor_id] = []
      byDoctor[s.doctor_id].push(s)
    }
    return Object.entries(byDoctor)
      .map(([doctorId, slots]) => {
        const doc = doctors.find((d) => d.id === doctorId)
        if (!doc) return null
        return {
          doctorId,
          firstName: doc.firstName,
          lastName: doc.lastName,
          specialty: doc.specialty,
          totalSlots: slots.length,
          availableSlots: slots.filter((s) => s.current_bookings < s.max_bookings && s.status !== 'cancelled').length,
          bookedSlots: slots.filter((s) => s.current_bookings > 0).length,
          services: doc.services,
        }
      })
      .filter(Boolean) as DoctorDateSummary[]
  }, [allSlots, doctors])

  const selectedDoctor = view.kind === 'slots'
    ? doctors.find((d) => d.id === view.doctorId)
    : null

  const handleRefetch = useCallback(() => { refetch() }, [refetch])

  return (
    <>
      {/* Toggle tab */}
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
        {/* ── Level 1: Dates ─────────────────────────────────────── */}
        {view.kind === 'dates' && (
          <>
            <div className="flex items-center justify-between p-4 border-b border-lhc-border shrink-0">
              <h2 className="font-bold text-lhc-text-main flex items-center gap-2">
                <Calendar className="w-5 h-5 text-lhc-primary" />
                Slot Calendar
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

            {/* Global Add Slot button */}
            <div className="px-4 pt-3 pb-1 shrink-0">
              <Button
                size="sm"
                className="w-full bg-[#00A86B] hover:bg-[#009060] text-white"
                onClick={() => setShowGlobalAdd(true)}
                disabled={doctors.length === 0}
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> Add New Slot
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-lhc-primary" />
                </div>
              ) : dateSummaries.length === 0 ? (
                <div className="text-center py-10">
                  <Calendar className="w-8 h-8 mx-auto text-lhc-text-muted mb-2" />
                  <p className="text-sm text-lhc-text-muted">No upcoming slots.</p>
                  <p className="text-xs text-lhc-text-muted mt-1">Use &ldquo;Add New Slot&rdquo; to create one.</p>
                </div>
              ) : (
                dateSummaries.map((ds) => (
                  <button
                    key={ds.date}
                    className={cn(
                      'w-full text-left border rounded-lg p-3 hover:bg-lhc-background transition-colors',
                      isToday(ds.date)
                        ? 'border-[#00A86B] bg-[#00A86B]/5'
                        : 'border-lhc-border',
                    )}
                    onClick={() => setView({ kind: 'doctors', date: ds.date })}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-lhc-text-muted shrink-0" />
                        <span className="font-semibold text-sm text-lhc-text-main">
                          {formatDateHuman(ds.date)}
                        </span>
                        {isToday(ds.date) && (
                          <Badge className="bg-[#00A86B] text-white text-[9px] px-1.5">Today</Badge>
                        )}
                      </div>
                      <ChevronRight className="w-4 h-4 text-lhc-text-muted shrink-0" />
                    </div>
                    <div className="flex gap-2 mt-2 flex-wrap">
                      <Badge variant="secondary" className="text-xs">
                        <Users className="w-3 h-3 mr-1" /> {ds.doctorCount} doctor{ds.doctorCount !== 1 ? 's' : ''}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {ds.totalSlots} slots
                      </Badge>
                      <Badge variant="secondary" className="text-xs text-[#065F46] bg-[#ECFDF5]">
                        {ds.availableSlots} open
                      </Badge>
                      {ds.bookedSlots > 0 && (
                        <Badge variant="secondary" className="text-xs text-[#1E40AF] bg-[#EFF6FF]">
                          {ds.bookedSlots} booked
                        </Badge>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          </>
        )}

        {/* ── Level 2: Doctors for a date ────────────────────────── */}
        {view.kind === 'doctors' && (
          <>
            <div className="flex items-center gap-2 p-4 border-b border-lhc-border shrink-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setView({ kind: 'dates' })}
                title="Back to dates"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-sm text-lhc-text-main">
                  {formatDateShort(view.date)}
                  {isToday(view.date) && (
                    <Badge className="bg-[#00A86B] text-white text-[9px] px-1.5 ml-2">Today</Badge>
                  )}
                </p>
                <p className="text-xs text-lhc-text-muted">Available doctors</p>
              </div>
              <Button variant="ghost" size="icon" onClick={onToggle}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            {/* Add Slot for this date */}
            <div className="px-4 pt-3 pb-1 shrink-0">
              <Button
                size="sm"
                className="w-full bg-[#00A86B] hover:bg-[#009060] text-white"
                onClick={() => setShowGlobalAdd(true)}
                disabled={doctors.length === 0}
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> Add New Slot
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {(() => {
                const doctorsForDate = getDoctorsForDate(view.date)
                if (doctorsForDate.length === 0) {
                  return (
                    <div className="text-center py-10">
                      <Stethoscope className="w-8 h-8 mx-auto text-lhc-text-muted mb-2" />
                      <p className="text-sm text-lhc-text-muted">No doctors available on this date.</p>
                      <p className="text-xs text-lhc-text-muted mt-1">Use &ldquo;Add New Slot&rdquo; to assign a doctor.</p>
                    </div>
                  )
                }
                return doctorsForDate.map((doc) => (
                  <button
                    key={doc.doctorId}
                    className="w-full text-left border border-lhc-border rounded-lg p-3 hover:bg-lhc-background transition-colors"
                    onClick={() => setView({ kind: 'slots', date: view.date, doctorId: doc.doctorId })}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-sm text-lhc-text-main truncate flex items-center gap-2">
                          <Stethoscope className="w-4 h-4 text-lhc-primary shrink-0" />
                          {doc.firstName} {doc.lastName}
                        </p>
                        {doc.specialty && (
                          <p className="text-xs text-lhc-text-muted truncate ml-6">{doc.specialty}</p>
                        )}
                      </div>
                      <ChevronRight className="w-4 h-4 text-lhc-text-muted shrink-0 mt-0.5" />
                    </div>
                    <div className="flex gap-2 mt-2 flex-wrap ml-6">
                      <Badge variant="secondary" className="text-xs">
                        {doc.totalSlots} slots
                      </Badge>
                      <Badge variant="secondary" className="text-xs text-[#065F46] bg-[#ECFDF5]">
                        {doc.availableSlots} open
                      </Badge>
                      {doc.bookedSlots > 0 && (
                        <Badge variant="secondary" className="text-xs text-[#1E40AF] bg-[#EFF6FF]">
                          {doc.bookedSlots} booked
                        </Badge>
                      )}
                    </div>
                  </button>
                ))
              })()}
            </div>
          </>
        )}

        {/* ── Level 3: Slots for doctor + date ───────────────────── */}
        {view.kind === 'slots' && (
          <>
            <div className="flex items-center gap-2 p-4 border-b border-lhc-border shrink-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setView({ kind: 'doctors', date: view.date })}
                title="Back to doctors"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-sm text-lhc-text-main truncate">
                  {selectedDoctor ? `${selectedDoctor.firstName} ${selectedDoctor.lastName}` : 'Doctor'}
                </p>
                <p className="text-xs text-lhc-text-muted">
                  {formatDateShort(view.date)}
                  {selectedDoctor?.specialty && ` \u00B7 ${selectedDoctor.specialty}`}
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={onToggle}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <DateDoctorSlotView
                doctorId={view.doctorId}
                clinicId={clinicId}
                date={view.date}
                emergencySlotsEnabled={emergencySlotsEnabled}
                services={selectedDoctor?.services ?? []}
              />
            </div>
          </>
        )}
      </div>

      {/* Global Add Slot Dialog */}
      <GlobalAddSlotDialog
        clinicId={clinicId}
        doctors={doctors}
        open={showGlobalAdd}
        onOpenChange={setShowGlobalAdd}
      />
    </>
  )
}
