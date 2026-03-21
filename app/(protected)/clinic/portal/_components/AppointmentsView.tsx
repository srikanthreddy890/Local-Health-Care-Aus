'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Loader2, Search, X, Trash2, AlertTriangle } from 'lucide-react'
import ClinicBookingsList from './ClinicBookingsList'

interface Props {
  clinicId: string | null
  userId: string
}

interface AvailableSlot {
  id: string
  appointment_date: string
  start_time: string
  doctor_id: string | null
  max_bookings: number
  current_bookings: number
  is_emergency_slot: boolean
  doctors: { first_name: string; last_name: string; specialty: string | null } | null
  services: { name: string; duration_minutes: number | null; price: number | null } | null
}

interface ClinicDoctor {
  id: string
  first_name: string
  last_name: string
}

function formatTime12h(time: string): string {
  const [h, m] = time.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 || 12
  return `${hour}:${String(m).padStart(2, '0')} ${period}`
}

export default function AppointmentsView({ clinicId, userId }: Props) {
  const [view, setView] = useState<'booked' | 'available'>('booked')
  const [visibleCount, setVisibleCount] = useState(10)

  // Outer filters
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedDoctorId, setSelectedDoctorId] = useState('')

  // Slot delete dialog
  const [deletingSlot, setDeletingSlot] = useState<AvailableSlot | null>(null)
  const [deleteReason, setDeleteReason] = useState('')
  const [deleteLoading, setDeleteLoading] = useState(false)

  const queryClient = useQueryClient()
  const today = new Date().toISOString().split('T')[0]

  // Fetch clinic doctors for filter dropdown
  const { data: clinicDoctors } = useQuery({
    queryKey: ['clinic-doctors-filter', clinicId],
    queryFn: async () => {
      if (!clinicId) return []
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabase = createClient() as any
      const { data } = await supabase
        .from('doctors')
        .select('id, first_name, last_name')
        .eq('clinic_id', clinicId)
        .eq('is_active', true)
        .order('first_name')
      return (data ?? []) as ClinicDoctor[]
    },
    enabled: !!clinicId,
  })

  // Available slots — fetched when viewing available tab
  const { data: rawAvailableSlots } = useQuery({
    queryKey: ['clinic-available-slots', clinicId],
    queryFn: async () => {
      if (!clinicId) return []
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabase = createClient() as any
      const { data } = await supabase
        .from('appointments')
        .select(
          'id, appointment_date, start_time, doctor_id, max_bookings, current_bookings, is_emergency_slot, ' +
          'doctors(first_name, last_name, specialty), services(name, duration_minutes, price)'
        )
        .eq('clinic_id', clinicId)
        .eq('status', 'available')
        .is('deleted_at', null)
        .gte('appointment_date', today)
        .order('appointment_date', { ascending: true })
        .order('start_time', { ascending: true })
      return (data ?? []) as AvailableSlot[]
    },
    enabled: !!clinicId && view === 'available',
  })

  // Client-side: only show slots where there are still spots available
  const availableSlots = (rawAvailableSlots ?? []).filter(
    (s) => s.current_bookings < s.max_bookings
  )

  // Apply outer filters to available slots
  const filteredSlots = availableSlots.filter((s) => {
    if (selectedDate && s.appointment_date !== selectedDate) return false
    if (selectedDoctorId && s.doctor_id !== selectedDoctorId) return false
    if (searchTerm) {
      const doctorName = s.doctors
        ? `${s.doctors.first_name} ${s.doctors.last_name} ${s.doctors.specialty ?? ''}`.toLowerCase()
        : ''
      const serviceName = (s.services?.name ?? '').toLowerCase()
      if (!doctorName.includes(searchTerm.toLowerCase()) && !serviceName.includes(searchTerm.toLowerCase())) {
        return false
      }
    }
    return true
  })

  const visibleSlots = filteredSlots.slice(0, visibleCount)

  // Stats (spec: sum of availableSlots per slot, unique doctors, unique days)
  const totalAvailableSlots = filteredSlots.reduce((sum, s) => sum + (s.max_bookings - s.current_bookings), 0)
  const doctorsWithAvailability = new Set(filteredSlots.map((s) => s.doctor_id).filter(Boolean)).size
  const daysWithSlots = new Set(filteredSlots.map((s) => s.appointment_date)).size

  const hasFilters = !!(searchTerm || selectedDate || selectedDoctorId)

  function clearFilters() {
    setSearchTerm('')
    setSelectedDate('')
    setSelectedDoctorId('')
  }

  async function confirmDeleteSlot() {
    if (!deletingSlot) return
    setDeleteLoading(true)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabase = createClient() as any
      const { error } = await supabase
        .from('appointments')
        .update({
          deleted_at: new Date().toISOString(),
          deleted_by: userId,
          deletion_reason: deleteReason.trim() || 'Removed by clinic',
        })
        .eq('id', deletingSlot.id)

      if (error) throw error
      toast.success('Slot removed successfully.')
      setDeletingSlot(null)
      setDeleteReason('')
      queryClient.invalidateQueries({ queryKey: ['clinic-available-slots', clinicId] })
    } catch {
      toast.error('Failed to remove slot. Please try again.')
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <>
      <Card>
        <CardContent className="pt-6">
          {/* ── Outer Filters ─────────────────────────── */}
          <div className="space-y-3 mb-5">
            <div className="flex flex-wrap gap-2">
              {/* Text search */}
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-lhc-text-muted" />
                <Input
                  className="pl-9"
                  placeholder="Search doctor, specialty, service…"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              {/* Date filter */}
              <Input
                type="date"
                className="w-auto"
                min={today}
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />

              {/* Doctor filter */}
              {(clinicDoctors ?? []).length > 0 && (
                <select
                  className="rounded-md border border-lhc-border bg-lhc-surface px-3 py-2 text-sm text-lhc-text-main focus:outline-none focus:ring-2 focus:ring-lhc-primary"
                  value={selectedDoctorId}
                  onChange={(e) => setSelectedDoctorId(e.target.value)}
                >
                  <option value="">All doctors</option>
                  {(clinicDoctors ?? []).map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.first_name} {d.last_name}
                    </option>
                  ))}
                </select>
              )}

              {hasFilters && (
                <Button variant="outline" size="sm" onClick={clearFilters} className="gap-1.5">
                  <X className="w-3.5 h-3.5" />
                  Clear
                </Button>
              )}
            </div>

            {/* Active filter badges */}
            {hasFilters && view === 'available' && (
              <div className="flex items-center gap-2 flex-wrap text-xs text-lhc-text-muted">
                <span>{filteredSlots.length} slot{filteredSlots.length !== 1 ? 's' : ''} found</span>
                {searchTerm && (
                  <Badge variant="secondary" className="gap-1">
                    &ldquo;{searchTerm}&rdquo;
                    <button onClick={() => setSearchTerm('')}><X className="w-3 h-3" /></button>
                  </Badge>
                )}
                {selectedDate && (
                  <Badge variant="secondary" className="gap-1">
                    {selectedDate}
                    <button onClick={() => setSelectedDate('')}><X className="w-3 h-3" /></button>
                  </Badge>
                )}
                {selectedDoctorId && (
                  <Badge variant="secondary" className="gap-1">
                    {clinicDoctors?.find((d) => d.id === selectedDoctorId)?.first_name ?? 'Doctor'}
                    <button onClick={() => setSelectedDoctorId('')}><X className="w-3 h-3" /></button>
                  </Badge>
                )}
              </div>
            )}

            {(clinicDoctors ?? []).length === 0 && (
              <div className="flex items-center gap-2 text-xs text-yellow-700 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg px-3 py-2">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                No active doctors found. Add a doctor to create appointment slots.
              </div>
            )}
          </div>

          {/* ── Sub-tabs ────────────────────────────── */}
          <Tabs value={view} onValueChange={(v) => { setView(v as 'booked' | 'available'); setVisibleCount(10) }}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="booked">Booked Appointments</TabsTrigger>
              <TabsTrigger value="available">Available Slots</TabsTrigger>
            </TabsList>

            {/* ── Booked ────────────────────────────── */}
            <TabsContent value="booked" className="mt-4">
              <ClinicBookingsList
                clinicId={clinicId ?? ''}
                userId={userId}
                selectedDoctorId={selectedDoctorId || null}
                selectedDate={selectedDate || null}
                searchTerm={searchTerm}
              />
            </TabsContent>

            {/* ── Available ─────────────────────────── */}
            <TabsContent value="available" className="mt-4 space-y-4">
              {/* Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-lhc-surface border border-lhc-border rounded-lg p-3 text-center">
                  <p className="text-xl font-bold text-lhc-text-main">{totalAvailableSlots}</p>
                  <p className="text-xs text-lhc-text-muted">Total Available Slots</p>
                </div>
                <div className="bg-lhc-surface border border-lhc-border rounded-lg p-3 text-center">
                  <p className="text-xl font-bold text-lhc-text-main">{doctorsWithAvailability}</p>
                  <p className="text-xs text-lhc-text-muted">Doctors with Availability</p>
                </div>
                <div className="bg-lhc-surface border border-lhc-border rounded-lg p-3 text-center">
                  <p className="text-xl font-bold text-lhc-text-main">{daysWithSlots}</p>
                  <p className="text-xs text-lhc-text-muted">Days with Slots</p>
                </div>
              </div>

              {/* Slot list */}
              <div className="space-y-2">
                {!rawAvailableSlots ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-lhc-primary" />
                  </div>
                ) : visibleSlots.length === 0 ? (
                  <p className="text-lhc-text-muted text-sm text-center py-6">No available slots.</p>
                ) : (
                  visibleSlots.map((slot) => {
                    const doctorName = slot.doctors
                      ? `${slot.doctors.first_name} ${slot.doctors.last_name}`
                      : 'Unknown Doctor'
                    const available = slot.max_bookings - slot.current_bookings

                    return (
                      <div
                        key={slot.id}
                        className="flex items-center justify-between border border-lhc-border rounded-lg p-3 bg-lhc-surface gap-3"
                      >
                        <div className="space-y-0.5 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-lhc-text-main">
                              {slot.appointment_date} at {formatTime12h(slot.start_time)}
                            </span>
                            {slot.is_emergency_slot && <Badge variant="destructive">Emergency</Badge>}
                            <Badge variant="secondary">
                              {available} of {slot.max_bookings} available
                            </Badge>
                          </div>
                          <p className="text-xs text-lhc-text-muted">
                            {doctorName}
                            {slot.doctors?.specialty ? ` · ${slot.doctors?.specialty}` : ''}
                          </p>
                          {slot.services && (
                            <p className="text-xs text-lhc-text-muted">
                              {slot.services.name}
                              {slot.services.duration_minutes ? ` · ${slot.services.duration_minutes} min` : ''}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {slot.services?.price != null && (
                            <p className="text-sm font-medium text-lhc-text-main">${slot.services.price}</p>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-red-200 text-red-600 hover:bg-red-50"
                            onClick={() => { setDeletingSlot(slot); setDeleteReason('') }}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>

              {filteredSlots.length > visibleCount && (
                <Button variant="outline" className="w-full" onClick={() => setVisibleCount((n) => n + 10)}>
                  Load 10 More
                </Button>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Delete slot confirmation dialog */}
      <Dialog open={!!deletingSlot} onOpenChange={(open) => { if (!open) setDeletingSlot(null) }}>
        {deletingSlot && (
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Remove Appointment Slot</DialogTitle>
              <DialogDescription>
                Remove the slot on <strong>{deletingSlot.appointment_date}</strong> at{' '}
                <strong>{formatTime12h(deletingSlot.start_time)}</strong>
                {deletingSlot.doctors
                  ? ` with ${deletingSlot.doctors.first_name} ${deletingSlot.doctors.last_name}`
                  : ''}
                ? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-1.5">
              <label className="text-sm text-lhc-text-muted">Reason (optional)</label>
              <Textarea
                placeholder="e.g. Doctor unavailable, public holiday…"
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
              />
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDeletingSlot(null)} disabled={deleteLoading}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={confirmDeleteSlot}
                disabled={deleteLoading}
              >
                {deleteLoading && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
                Remove Slot
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </>
  )
}
