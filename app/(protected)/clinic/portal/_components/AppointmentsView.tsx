'use client'

import { useState, useMemo } from 'react'
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
import {
  Loader2,
  Search,
  X,
  Trash2,
  AlertTriangle,
  Calendar,
  Users,
  CalendarDays,
  Eye,
  Lock,
  ChevronDown,
} from 'lucide-react'
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

function formatHumanDate(dateStr: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T00:00:00')
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`
}

function formatShortDate(dateStr: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T00:00:00')
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]}`
}

interface DateGroup {
  date: string
  label: string
  slots: AvailableSlot[]
  booked: number
}

export default function AppointmentsView({ clinicId, userId }: Props) {
  const [view, setView] = useState<'booked' | 'available'>('booked')
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const INITIAL_VISIBLE = 6

  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedDoctorId, setSelectedDoctorId] = useState('')

  // Slot delete dialog
  const [deletingSlot, setDeletingSlot] = useState<AvailableSlot | null>(null)
  const [deleteReason, setDeleteReason] = useState('')
  const [deleteLoading, setDeleteLoading] = useState(false)

  const queryClient = useQueryClient()
  const today = new Date().toISOString().split('T')[0]

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

  const availableSlots = (rawAvailableSlots ?? []).filter(
    (s) => s.current_bookings < s.max_bookings
  )

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

  // Group slots by date
  const dateGroups = useMemo(() => {
    const groupMap = new Map<string, AvailableSlot[]>()
    for (const slot of filteredSlots) {
      const group = groupMap.get(slot.appointment_date) ?? []
      group.push(slot)
      groupMap.set(slot.appointment_date, group)
    }

    const groups: DateGroup[] = []
    for (const [date, slots] of groupMap) {
      const booked = slots.reduce((sum, s) => sum + s.current_bookings, 0)
      groups.push({
        date,
        label: formatHumanDate(date),
        slots,
        booked,
      })
    }
    return groups
  }, [filteredSlots])

  // Stats
  const totalAvailableSlots = filteredSlots.reduce((sum, s) => sum + (s.max_bookings - s.current_bookings), 0)
  const doctorsWithAvailability = new Set(filteredSlots.map((s) => s.doctor_id).filter(Boolean)).size
  const daysWithSlots = new Set(filteredSlots.map((s) => s.appointment_date)).size
  const nextSlotDate = filteredSlots.length > 0 ? filteredSlots[0] : null

  const hasFilters = !!(searchTerm || selectedDate || selectedDoctorId)

  function clearFilters() {
    setSearchTerm('')
    setSelectedDate('')
    setSelectedDoctorId('')
  }

  function toggleGroupExpanded(date: string) {
    setExpandedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(date)) next.delete(date)
      else next.add(date)
      return next
    })
  }

  function getSlotStatusPill(slot: AvailableSlot) {
    const available = slot.max_bookings - slot.current_bookings
    if (available === 0) {
      return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#D1FAE5] text-[#065F46]">Booked</span>
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-lhc-text-muted">
        {available} of {slot.max_bookings} available
      </span>
    )
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
          {/* Sub-tabs */}
          <Tabs value={view} onValueChange={(v) => { setView(v as 'booked' | 'available'); setExpandedGroups(new Set()) }}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="booked">Booked Appointments</TabsTrigger>
              <TabsTrigger value="available">Available Slots</TabsTrigger>
            </TabsList>

            {/* Filters - only show for available slots or pass through to bookings */}
            {view === 'available' && (
              <div className="space-y-3 mt-4 mb-4">
                <div className="flex flex-wrap gap-2">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-lhc-text-muted" />
                    <Input
                      className="pl-9 rounded-[9px] text-xs"
                      placeholder="Search doctor, specialty, service…"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>

                  <Input
                    type="date"
                    className="w-auto"
                    min={today}
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                  />

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

                {hasFilters && (
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
            )}

            {/* Booked */}
            <TabsContent value="booked" className="mt-4">
              <ClinicBookingsList
                clinicId={clinicId ?? ''}
                userId={userId}
                selectedDoctorId={null}
                selectedDate={null}
                searchTerm=""
              />
            </TabsContent>

            {/* Available */}
            <TabsContent value="available" className="mt-4 space-y-4">
              {/* Stat cards with color accents */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-lhc-surface border border-lhc-border rounded-xl p-3.5">
                  <div className="flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                      <Calendar className="w-4 h-4 text-[#1E40AF]" />
                    </div>
                    <div>
                      <p className="text-[26px] font-medium leading-tight text-[#1E40AF]">{totalAvailableSlots}</p>
                      <p className="text-[11px] text-lhc-text-muted mt-0.5">Total Available Slots</p>
                      <p className="text-[10px] text-lhc-text-muted/60">Across all doctors and dates</p>
                    </div>
                  </div>
                </div>
                <div className="bg-lhc-surface border border-lhc-border rounded-xl p-3.5">
                  <div className="flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
                      <Users className="w-4 h-4 text-[#059669]" />
                    </div>
                    <div>
                      <p className="text-[26px] font-medium leading-tight text-[#059669]">{doctorsWithAvailability}</p>
                      <p className="text-[11px] text-lhc-text-muted mt-0.5">Doctors with Availability</p>
                      <p className="text-[10px] text-lhc-text-muted/60">Currently accepting bookings</p>
                    </div>
                  </div>
                </div>
                <div className="bg-lhc-surface border border-lhc-border rounded-xl p-3.5">
                  <div className="flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center flex-shrink-0">
                      <CalendarDays className="w-4 h-4 text-teal-600" />
                    </div>
                    <div>
                      <p className="text-[26px] font-medium leading-tight text-teal-600">{daysWithSlots}</p>
                      <p className="text-[11px] text-lhc-text-muted mt-0.5">Days with Slots</p>
                      {nextSlotDate && (
                        <p className="text-[10px] text-lhc-text-muted/60">
                          Next: {formatShortDate(nextSlotDate.appointment_date)} {formatTime12h(nextSlotDate.start_time)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Slot list - grouped by date */}
              <div className="space-y-1">
                {!rawAvailableSlots ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-lhc-primary" />
                  </div>
                ) : dateGroups.length === 0 ? (
                  <p className="text-lhc-text-muted text-sm text-center py-6">No available slots.</p>
                ) : (
                  dateGroups.map((group) => {
                    const isExpanded = expandedGroups.has(group.date)
                    const visibleSlots = isExpanded ? group.slots : group.slots.slice(0, INITIAL_VISIBLE)
                    const hiddenCount = group.slots.length - INITIAL_VISIBLE

                    return (
                      <div key={group.date} className="mb-3">
                        {/* Date group header */}
                        <div className="flex items-center gap-2 py-2 sticky top-0 bg-white z-10">
                          <CalendarDays className="w-3.5 h-3.5 text-lhc-text-muted" />
                          <span className="text-xs font-medium uppercase text-lhc-text-muted tracking-wide">
                            {group.label}
                          </span>
                          <div className="flex-1 border-b border-lhc-border/50" />
                          <span className="text-[10px] text-lhc-text-muted">
                            {group.slots.length} slot{group.slots.length !== 1 ? 's' : ''}
                            {group.booked > 0 ? ` · ${group.booked} booked` : ''}
                          </span>
                        </div>

                        {/* Slots in group */}
                        <div className="ml-3 space-y-1">
                          {visibleSlots.map((slot) => {
                            const doctorName = slot.doctors
                              ? `${slot.doctors.first_name} ${slot.doctors.last_name}`
                              : 'Unknown Doctor'

                            return (
                              <div
                                key={slot.id}
                                className="flex items-center justify-between rounded-lg p-3 bg-lhc-surface border border-lhc-border/50 gap-3 group hover:bg-lhc-background/60 transition-colors"
                              >
                                <div className="space-y-0.5 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-xs font-medium text-lhc-text-main">
                                      {formatShortDate(slot.appointment_date)}
                                    </span>
                                    <span className="text-xs">·</span>
                                    <span className="text-xs font-bold text-[#00A86B]">
                                      {formatTime12h(slot.start_time)}
                                    </span>
                                    {slot.is_emergency_slot && <Badge variant="destructive" className="text-[10px] py-0">Emergency</Badge>}
                                    {getSlotStatusPill(slot)}
                                  </div>
                                  <p className="text-[11px] text-lhc-text-muted">
                                    {doctorName}
                                    {slot.doctors?.specialty ? ` · ${slot.doctors.specialty}` : ''}
                                  </p>
                                  {slot.services && (
                                    <p className="text-[11px] text-lhc-text-muted">
                                      {slot.services.name}
                                      {slot.services.duration_minutes ? ` · ${slot.services.duration_minutes} min` : ''}
                                    </p>
                                  )}
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  {slot.services?.price != null && (
                                    <p className="text-sm font-medium text-lhc-text-main mr-1">${slot.services.price}</p>
                                  )}
                                  {/* Action buttons - visible on hover */}
                                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                      className="w-7 h-7 rounded-[7px] border border-lhc-border/50 flex items-center justify-center text-lhc-text-muted hover:bg-lhc-background hover:border-lhc-border transition-colors"
                                      title="View slot details"
                                      onClick={() => {}}
                                    >
                                      <Eye className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      className="w-7 h-7 rounded-[7px] border border-lhc-border/50 flex items-center justify-center text-lhc-text-muted hover:bg-amber-50 hover:text-amber-600 hover:border-amber-200 transition-colors"
                                      title="Block this slot"
                                      onClick={() => {}}
                                    >
                                      <Lock className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      className="w-7 h-7 rounded-[7px] border border-lhc-border/50 flex items-center justify-center text-lhc-text-muted hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"
                                      title="Delete this slot"
                                      onClick={() => { setDeletingSlot(slot); setDeleteReason('') }}
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )
                          })}

                          {/* Show more link */}
                          {!isExpanded && hiddenCount > 0 && (
                            <button
                              onClick={() => toggleGroupExpanded(group.date)}
                              className="text-[11px] text-[#00A86B] font-medium hover:underline py-1.5 pl-3 flex items-center gap-1"
                            >
                              Show {hiddenCount} more
                              <ChevronDown className="w-3 h-3" />
                            </button>
                          )}
                          {isExpanded && hiddenCount > 0 && (
                            <button
                              onClick={() => toggleGroupExpanded(group.date)}
                              className="text-[11px] text-lhc-text-muted font-medium hover:underline py-1.5 pl-3"
                            >
                              Show less
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
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
                Remove the slot on <strong>{formatHumanDate(deletingSlot.appointment_date)}</strong> at{' '}
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
