'use client'
import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { toast } from '@/lib/toast'
import { cn } from '@/lib/utils'
import DefaultAvatar from '@/components/DefaultAvatar'
import { useClinicBookings, type UnifiedBooking } from './useClinicBookings'
import AttendanceButton from './AttendanceButton'
import ApiAttendanceButton from './ApiAttendanceButton'
import CustomApiAttendanceButton from './CustomApiAttendanceButton'
import AddPrescriptionDialog from './AddPrescriptionDialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  CalendarDays,
  Search,
  Loader2,
  AlertCircle,
  Phone,
  Mail,
  UserCheck,
  FileText,
  MoreHorizontal,
  Check,
  X,
  MessageSquare,
  Eye,
  Copy,
  HelpCircle,
  Info,
} from 'lucide-react'

interface Props {
  clinicId: string
  userId: string
  selectedDoctorId?: string | null
  selectedDate?: string | null
  searchTerm?: string
}

type StatusFilter = 'all' | 'confirmed' | 'pending' | 'cancelled' | 'completed'

const STATUS_STYLES: Record<string, { bg: string; text: string; border?: string }> = {
  confirmed: { bg: 'bg-[#D1FAE5]', text: 'text-[#065F46]' },
  pending: { bg: 'bg-[#FEF3C7]', text: 'text-[#92400E]' },
  cancelled: { bg: 'bg-red-100', text: 'text-red-700' },
  completed: { bg: 'bg-blue-100', text: 'text-blue-700' },
}

function formatHumanDate(dateStr: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T00:00:00')
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function PatientAvatar({ name }: { name: string }) {
  const isUnknown = name === 'Unknown' || name === 'Unregistered Patient'
  if (isUnknown) {
    return (
      <div className="w-[34px] h-[34px] rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
        <HelpCircle className="w-4 h-4 text-gray-500" />
      </div>
    )
  }
  return (
    <DefaultAvatar variant="patient" className="w-[34px] h-[34px] rounded-full flex-shrink-0" />
  )
}

function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status] ?? { bg: 'bg-gray-100', text: 'text-gray-600' }
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium', style.bg, style.text)}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}

function CopyableReference({ reference }: { reference: string }) {
  const [copied, setCopied] = useState(false)
  if (!reference) return null

  const truncated = reference.length > 18 ? `Ref: ${reference.slice(0, 14)}…` : `Ref: ${reference}`

  return (
    <button
      onClick={(e) => {
        e.stopPropagation()
        navigator.clipboard.writeText(reference)
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
      }}
      className="inline-flex items-center gap-1 text-[10px] font-mono text-lhc-text-muted hover:text-lhc-text-main transition-colors group"
      title={reference}
    >
      {truncated}
      {copied ? (
        <Check className="w-3 h-3 text-green-600" />
      ) : (
        <Copy className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
      )}
    </button>
  )
}

export default function ClinicBookingsList({
  clinicId,
  userId,
  selectedDoctorId,
  selectedDate,
  searchTerm: outerSearch = '',
}: Props) {
  const [localSearch, setLocalSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [selectedBooking, setSelectedBooking] = useState<UnifiedBooking | null>(null)
  const [clinicNoteDraft, setClinicNoteDraft] = useState('')
  const [savingNote, setSavingNote] = useState(false)
  const [rxDialogOpen, setRxDialogOpen] = useState(false)
  const [confirmingBooking, setConfirmingBooking] = useState(false)
  const [showCancelForm, setShowCancelForm] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [cancellingBooking, setCancellingBooking] = useState(false)

  const queryClient = useQueryClient()
  const { data: bookings, isLoading, error, updateClinicNotes } = useClinicBookings(clinicId)

  const combinedSearch = (outerSearch + ' ' + localSearch).trim().toLowerCase()

  const allBookings = bookings ?? []

  // Count bookings per status
  const statusCounts = {
    all: allBookings.length,
    confirmed: allBookings.filter((b) => b.status === 'confirmed').length,
    pending: allBookings.filter((b) => b.status === 'pending').length,
    cancelled: allBookings.filter((b) => b.status === 'cancelled').length,
    completed: allBookings.filter((b) => b.status === 'completed').length,
  }

  const filtered = allBookings.filter((b) => {
    if (statusFilter !== 'all' && b.status !== statusFilter) return false
    if (selectedDoctorId) {
      const matchesId = b.doctorId === selectedDoctorId
      const matchesName = b.doctorName.toLowerCase().includes(selectedDoctorId.toLowerCase())
      if (!matchesId && !matchesName) return false
    }
    if (selectedDate && b.appointmentDate !== selectedDate) return false
    if (combinedSearch) {
      const haystack = [b.patientName, b.reference, b.doctorName, b.serviceName].join(' ').toLowerCase()
      if (!haystack.includes(combinedSearch)) return false
    }
    return true
  })

  function openDialog(b: UnifiedBooking) {
    setSelectedBooking(b)
    setClinicNoteDraft(b.clinicNotes)
    setShowCancelForm(false)
    setCancelReason('')
  }

  async function saveNote() {
    if (!selectedBooking || selectedBooking.type !== 'standard') return
    setSavingNote(true)
    try {
      const supabase = createClient()
      const { error: err } = await supabase
        .from('bookings')
        .update({ clinic_notes: clinicNoteDraft })
        .eq('id', selectedBooking.id)
      if (err) throw err
      updateClinicNotes(selectedBooking.id, clinicNoteDraft)
      setSelectedBooking((prev) => prev ? { ...prev, clinicNotes: clinicNoteDraft } : prev)
      toast.success('Notes saved.')
    } catch {
      toast.error('Failed to save notes.')
    } finally {
      setSavingNote(false)
    }
  }

  function handleAttendanceSuccess() {
    queryClient.invalidateQueries({ queryKey: ['clinic-bookings-unified', clinicId] })
    setSelectedBooking(null)
  }

  async function handleConfirmBooking() {
    if (!selectedBooking) return
    setConfirmingBooking(true)
    try {
      const supabase = createClient()
      const table = selectedBooking.type === 'standard' ? 'bookings' : 'custom_api_bookings'
      const statusCol = selectedBooking.type === 'standard' ? 'status' : 'booking_status'
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: err } = await (supabase as any)
        .from(table)
        .update({ [statusCol]: 'confirmed' })
        .eq('id', selectedBooking.id)
      if (err) throw err
      toast.success('Booking confirmed.')
      queryClient.invalidateQueries({ queryKey: ['clinic-bookings-unified', clinicId] })
      setSelectedBooking(null)
    } catch {
      toast.error('Failed to confirm booking.')
    } finally {
      setConfirmingBooking(false)
    }
  }

  async function handleCancelBooking() {
    if (!selectedBooking || !cancelReason.trim()) return
    setCancellingBooking(true)
    try {
      const supabase = createClient()
      if (selectedBooking.type === 'standard') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: err } = await (supabase as any)
          .from('bookings')
          .update({ status: 'cancelled', cancellation_reason: cancelReason.trim() })
          .eq('id', selectedBooking.id)
        if (err) throw err
      } else if (selectedBooking.type === 'centaur') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: err } = await (supabase as any)
          .from('centaur_bookings')
          .update({ booking_status: 'cancelled' })
          .eq('id', selectedBooking.id)
        if (err) throw err
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: err } = await (supabase as any)
          .from('custom_api_bookings')
          .update({ booking_status: 'cancelled' })
          .eq('id', selectedBooking.id)
        if (err) throw err
      }
      toast.success('Booking cancelled.')
      queryClient.invalidateQueries({ queryKey: ['clinic-bookings-unified', clinicId] })
      setSelectedBooking(null)
      setShowCancelForm(false)
      setCancelReason('')
    } catch {
      toast.error('Failed to cancel booking.')
    } finally {
      setCancellingBooking(false)
    }
  }

  async function handleInlineConfirm(e: React.MouseEvent, b: UnifiedBooking) {
    e.stopPropagation()
    try {
      const supabase = createClient()
      const table = b.type === 'standard' ? 'bookings' : 'custom_api_bookings'
      const statusCol = b.type === 'standard' ? 'status' : 'booking_status'
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: err } = await (supabase as any)
        .from(table)
        .update({ [statusCol]: 'confirmed' })
        .eq('id', b.id)
      if (err) throw err
      toast.success('Booking confirmed.')
      queryClient.invalidateQueries({ queryKey: ['clinic-bookings-unified', clinicId] })
    } catch {
      toast.error('Failed to confirm.')
    }
  }

  const attendanceEl = selectedBooking && selectedBooking.status === 'confirmed' && selectedBooking.attendanceStatus !== 'attended'
    ? (() => {
        if (selectedBooking.type === 'standard') {
          return (
            <AttendanceButton
              bookingId={selectedBooking.id}
              patientName={selectedBooking.patientName}
              serviceName={selectedBooking.serviceName}
              markedBy={userId}
              onSuccess={handleAttendanceSuccess}
            />
          )
        }
        if (selectedBooking.type === 'centaur') {
          return (
            <ApiAttendanceButton
              bookingId={selectedBooking.id}
              clinicId={clinicId}
              patientName={selectedBooking.patientName}
              markedBy={userId}
              onSuccess={handleAttendanceSuccess}
            />
          )
        }
        if (selectedBooking.type === 'custom_api') {
          return (
            <CustomApiAttendanceButton
              bookingId={selectedBooking.id}
              clinicId={clinicId}
              patientName={selectedBooking.patientName}
              markedBy={userId}
              onSuccess={handleAttendanceSuccess}
            />
          )
        }
        return null
      })()
    : null

  return (
    <>
      <div className="space-y-4">
        {/* Search bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-lhc-text-muted" />
          <Input
            className="pl-9 rounded-[9px] text-xs"
            placeholder="Search by patient name, reference, doctor, or service…"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
          />
        </div>

        {/* Status pill tabs with counts */}
        <div className="flex flex-wrap gap-1.5">
          {(['all', 'confirmed', 'pending', 'cancelled', 'completed'] as StatusFilter[]).map((s) => {
            const count = statusCounts[s]
            const isActive = statusFilter === s
            return (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
                  isActive
                    ? 'bg-[#00A86B] text-white'
                    : 'bg-lhc-background text-lhc-text-muted hover:text-lhc-text-main',
                  count === 0 && !isActive && 'opacity-50'
                )}
              >
                <span className="capitalize">{s}</span>
                <span
                  className={cn(
                    'inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[9px] font-bold',
                    isActive
                      ? 'bg-white/25 text-white'
                      : 'bg-lhc-border/60 text-lhc-text-muted'
                  )}
                >
                  {count}
                </span>
              </button>
            )
          })}
        </div>

        {/* Booking list */}
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-lhc-primary" />
          </div>
        ) : error ? (
          <div className="flex items-center gap-2 text-sm text-red-600 py-4">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>Failed to load bookings. Please refresh and try again.</span>
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-lhc-text-muted text-sm text-center py-6">No bookings found.</p>
        ) : (
          <div className="divide-y divide-lhc-border/50">
            {filtered.map((b) => {
              const isPending = b.status === 'pending'
              const isUnknown = b.patientName === 'Unknown'
              const displayName = isUnknown ? 'Unregistered Patient' : b.patientName

              return (
                <button
                  key={b.id}
                  onClick={() => openDialog(b)}
                  className={cn(
                    'w-full text-left py-3.5 px-4 transition-colors group relative',
                    'hover:bg-lhc-background/60',
                    isPending && 'border-l-[3px] border-l-[#F59E0B] bg-[#FFFBEB]'
                  )}
                >
                  <div className="flex items-start gap-3">
                    <PatientAvatar name={displayName} />

                    <div className="flex-1 min-w-0">
                      {/* Line 1: Name + badges */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={cn(
                          'text-sm font-medium text-lhc-text-main',
                          isUnknown && 'italic text-lhc-text-muted'
                        )}>
                          {displayName}
                        </span>
                        {b.type === 'centaur' && <Badge variant="purple">Centaur</Badge>}
                        {b.type === 'custom_api' && <Badge variant="orange">Custom API</Badge>}
                        {b.attendanceStatus === 'attended' && (
                          <Badge variant="success">Attended</Badge>
                        )}
                        {isUnknown && (
                          <span className="inline-flex items-center gap-1 px-[7px] py-[2px] rounded-full text-[9px] font-medium bg-[#FEF3C7] text-[#92400E]">
                            <Info className="w-2.5 h-2.5" />
                            No account linked
                          </span>
                        )}
                      </div>

                      {/* Line 2: Human-readable date */}
                      <p className="text-xs text-lhc-text-muted mt-0.5">
                        {formatHumanDate(b.appointmentDate)} · {b.appointmentTime}
                      </p>

                      {/* Line 3: Doctor · Service */}
                      <p className="text-[11px] text-lhc-text-muted/70 mt-0.5">
                        {b.doctorName}
                        {b.serviceName ? ` · ${b.serviceName}` : ''}
                      </p>

                      {/* Reference - subtle, only visible on hover */}
                      {b.reference && (
                        <div className="mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <CopyableReference reference={b.reference} />
                        </div>
                      )}

                      {b.status === 'cancelled' && b.cancellationReason && (
                        <p className="text-xs text-red-600 mt-1 max-w-[250px] truncate">
                          Reason: {b.cancellationReason}
                        </p>
                      )}
                    </div>

                    {/* Right side: Status badge + inline actions */}
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <StatusBadge status={b.status} />

                      {/* Inline actions on hover */}
                      <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        {isPending && b.type !== 'centaur' && (
                          <button
                            onClick={(e) => handleInlineConfirm(e, b)}
                            className="h-7 px-2.5 rounded-[7px] text-[11px] font-medium bg-[#00A86B] text-white hover:bg-[#009060] transition-colors"
                          >
                            Confirm
                          </button>
                        )}
                        {b.status === 'confirmed' && (
                          <button
                            onClick={(e) => { e.stopPropagation(); openDialog(b) }}
                            className="h-7 px-2.5 rounded-[7px] text-[11px] font-medium border border-lhc-border text-lhc-text-muted hover:bg-lhc-background transition-colors"
                          >
                            View
                          </button>
                        )}
                        {isPending && isUnknown && (
                          <button
                            onClick={(e) => { e.stopPropagation(); openDialog(b) }}
                            className="h-7 px-2.5 rounded-[7px] text-[11px] font-medium border border-[#F59E0B] text-[#92400E] hover:bg-[#FEF3C7] transition-colors"
                          >
                            Follow up
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Booking detail dialog */}
      <Dialog open={!!selectedBooking} onOpenChange={(open) => { if (!open) setSelectedBooking(null) }}>
        {selectedBooking && (
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 flex-wrap">
                {selectedBooking.patientName === 'Unknown' ? 'Unregistered Patient' : selectedBooking.patientName}
                {selectedBooking.type === 'centaur' && <Badge variant="purple">Centaur</Badge>}
                {selectedBooking.type === 'custom_api' && <Badge variant="orange">Custom API</Badge>}
                <StatusBadge status={selectedBooking.status} />
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-5 text-sm">
              {/* Patient contact */}
              <section className="space-y-1.5">
                <h3 className="font-semibold text-lhc-text-main">Patient</h3>
                {selectedBooking.type === 'standard' ? (
                  <>
                    {selectedBooking.shareConsent?.mobile ? (
                      <a
                        href={`tel:${selectedBooking.patientPhone}`}
                        className="flex items-center gap-1.5 text-lhc-primary hover:underline"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        {selectedBooking.patientPhone}
                      </a>
                    ) : (
                      <p className="text-lhc-text-muted italic">Phone not shared by patient</p>
                    )}
                    {selectedBooking.shareConsent?.email ? (
                      <a
                        href={`mailto:${selectedBooking.patientEmail}`}
                        className="flex items-center gap-1.5 text-lhc-primary hover:underline"
                      >
                        <Mail className="w-3.5 h-3.5" />
                        {selectedBooking.patientEmail}
                      </a>
                    ) : (
                      <p className="text-lhc-text-muted italic">Email not shared by patient</p>
                    )}
                  </>
                ) : (
                  <p className="text-lhc-text-muted italic text-xs">Contact details managed in external booking system</p>
                )}
              </section>

              {/* Appointment details */}
              <section className="space-y-1 text-lhc-text-muted">
                <h3 className="font-semibold text-lhc-text-main">Appointment</h3>
                <p>{selectedBooking.doctorName}</p>
                <p>{formatHumanDate(selectedBooking.appointmentDate)} · {selectedBooking.appointmentTime}</p>
                {selectedBooking.serviceName && <p>{selectedBooking.serviceName}</p>}
                {selectedBooking.reference && (
                  <CopyableReference reference={selectedBooking.reference} />
                )}
              </section>

              {/* Cancellation reason */}
              {selectedBooking.status === 'cancelled' && selectedBooking.cancellationReason && (
                <section className="rounded-lg bg-red-50 border border-red-200 dark:bg-red-950/20 dark:border-red-800 p-3">
                  <p className="text-xs text-red-700 dark:text-red-300 font-medium">Cancellation reason</p>
                  <p className="text-sm text-red-800 dark:text-red-200 mt-0.5">{selectedBooking.cancellationReason}</p>
                </section>
              )}

              {/* Attendance status */}
              {selectedBooking.attendanceStatus === 'attended' && (
                <section className="rounded-lg bg-green-50 border border-green-200 dark:bg-green-950/20 dark:border-green-800 p-3 space-y-0.5">
                  <p className="text-xs font-medium text-green-700 dark:text-green-300 flex items-center gap-1">
                    <UserCheck className="w-3.5 h-3.5" />
                    Attendance Marked
                  </p>
                  {selectedBooking.servicePerformed && (
                    <p className="text-sm text-green-800 dark:text-green-200">Service: {selectedBooking.servicePerformed}</p>
                  )}
                  {selectedBooking.pointsEarned != null && (
                    <p className="text-sm text-green-800 dark:text-green-200">{selectedBooking.pointsEarned} pts earned</p>
                  )}
                </section>
              )}

              {/* Patient notes */}
              {selectedBooking.notes && (
                <section className="space-y-1">
                  <h3 className="font-semibold text-lhc-text-main">Patient Notes</h3>
                  <p className="text-lhc-text-muted bg-lhc-background rounded-md p-2">{selectedBooking.notes}</p>
                </section>
              )}

              {/* Clinic notes */}
              <section className="space-y-2">
                <h3 className="font-semibold text-lhc-text-main">Clinic Notes</h3>
                {selectedBooking.type === 'standard' ? (
                  <>
                    <Textarea
                      value={clinicNoteDraft}
                      onChange={(e) => setClinicNoteDraft(e.target.value)}
                      placeholder="Add internal notes…"
                    />
                    <Button
                      size="sm"
                      onClick={saveNote}
                      disabled={savingNote || clinicNoteDraft === selectedBooking.clinicNotes}
                    >
                      {savingNote && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
                      Save Notes
                    </Button>
                  </>
                ) : (
                  selectedBooking.clinicNotes ? (
                    <p className="text-lhc-text-muted bg-lhc-background rounded-md p-2">{selectedBooking.clinicNotes}</p>
                  ) : (
                    <p className="text-lhc-text-muted text-xs italic">No notes available.</p>
                  )
                )}
              </section>

              {/* Confirm / Cancel actions */}
              {selectedBooking.status !== 'cancelled' && selectedBooking.status !== 'completed' && (
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {selectedBooking.status === 'pending' && selectedBooking.type !== 'centaur' && (
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-white"
                        onClick={handleConfirmBooking}
                        disabled={confirmingBooking}
                      >
                        {confirmingBooking && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
                        Confirm Booking
                      </Button>
                    )}
                    {!showCancelForm && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-red-300 text-red-600 hover:bg-red-50"
                        onClick={() => setShowCancelForm(true)}
                      >
                        Cancel Booking
                      </Button>
                    )}
                  </div>
                  {showCancelForm && (
                    <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-800 p-3 space-y-2">
                      <p className="text-xs font-medium text-red-700 dark:text-red-300">Cancellation reason</p>
                      <Textarea
                        value={cancelReason}
                        onChange={(e) => setCancelReason(e.target.value)}
                        placeholder="Enter reason for cancellation…"
                        rows={2}
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={handleCancelBooking}
                          disabled={cancellingBooking || !cancelReason.trim()}
                        >
                          {cancellingBooking && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
                          Confirm Cancel
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => { setShowCancelForm(false); setCancelReason('') }}
                        >
                          Keep
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Attendance + Prescription actions */}
              <div className="flex flex-wrap gap-2 pt-1">
                {attendanceEl}
                {selectedBooking.attendanceStatus === 'attended' && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-green-300 text-green-700 hover:bg-green-50"
                      onClick={() => setRxDialogOpen(true)}
                    >
                      <FileText className="w-4 h-4 mr-1.5" />
                      Add Prescription
                    </Button>
                    <AddPrescriptionDialog
                      open={rxDialogOpen}
                      onOpenChange={setRxDialogOpen}
                      clinicId={clinicId}
                      userId={userId}
                      booking={{
                        id: selectedBooking.id,
                        reference: selectedBooking.reference,
                        type: selectedBooking.type,
                        patientName: selectedBooking.patientName,
                        patientId: selectedBooking.patientId,
                        doctorName: selectedBooking.doctorName,
                        doctorId: selectedBooking.doctorId,
                        appointmentDate: selectedBooking.appointmentDate,
                        appointmentTime: selectedBooking.appointmentTime,
                        clinicId,
                        createdBy: userId,
                      }}
                      onCreated={() => setRxDialogOpen(false)}
                    />
                  </>
                )}
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </>
  )
}
