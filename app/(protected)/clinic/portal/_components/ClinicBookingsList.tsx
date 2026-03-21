'use client'
import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { toast } from '@/lib/toast'
import { cn } from '@/lib/utils'
import { useClinicBookings, type UnifiedBooking } from './useClinicBookings'
import AttendanceButton from './AttendanceButton'
import ApiAttendanceButton from './ApiAttendanceButton'
import CustomApiAttendanceButton from './CustomApiAttendanceButton'
import AddPrescriptionDialog from './AddPrescriptionDialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
} from 'lucide-react'

interface Props {
  clinicId: string
  userId: string
  selectedDoctorId?: string | null
  selectedDate?: string | null
  searchTerm?: string
}

type StatusFilter = 'all' | 'confirmed' | 'pending' | 'cancelled' | 'completed'

function getStatusVariant(status: string): 'success' | 'warning' | 'destructive' | 'secondary' {
  if (status === 'confirmed') return 'success'
  if (status === 'pending') return 'warning'
  if (status === 'cancelled') return 'destructive'
  return 'secondary'
}

function typeColor(type: UnifiedBooking['type']) {
  if (type === 'centaur') return 'border-l-purple-400'
  if (type === 'custom_api') return 'border-l-indigo-400'
  return 'border-l-blue-400'
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

  const queryClient = useQueryClient()
  const { data: bookings, isLoading, error, updateClinicNotes } = useClinicBookings(clinicId)

  const combinedSearch = (outerSearch + ' ' + localSearch).trim().toLowerCase()

  const filtered = (bookings ?? []).filter((b) => {
    // Status filter
    if (statusFilter !== 'all' && b.status !== statusFilter) return false

    // Doctor filter
    if (selectedDoctorId) {
      const matchesId = b.doctorId === selectedDoctorId
      const matchesName = b.doctorName.toLowerCase().includes(selectedDoctorId.toLowerCase())
      if (!matchesId && !matchesName) return false
    }

    // Date filter
    if (selectedDate && b.appointmentDate !== selectedDate) return false

    // Text search
    if (combinedSearch) {
      const haystack = [b.patientName, b.reference, b.doctorName].join(' ').toLowerCase()
      if (!haystack.includes(combinedSearch)) return false
    }

    return true
  })

  function openDialog(b: UnifiedBooking) {
    setSelectedBooking(b)
    setClinicNoteDraft(b.clinicNotes)
  }

  async function saveNote() {
    if (!selectedBooking || selectedBooking.type !== 'standard') return
    setSavingNote(true)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabase = createClient() as any
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
      <Card>
        <CardHeader>
          <CardTitle className="text-lhc-text-main flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-lhc-primary" />
            Booked Appointments
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Local search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-lhc-text-muted" />
            <Input
              className="pl-9"
              placeholder="Search by patient, reference, or doctor…"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
            />
          </div>

          {/* Status tabs */}
          <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
            <TabsList className="flex flex-wrap h-auto gap-1 bg-lhc-surface border border-lhc-border rounded-lg p-1">
              {(['all', 'confirmed', 'pending', 'cancelled', 'completed'] as StatusFilter[]).map((s) => (
                <TabsTrigger key={s} value={s} className="capitalize text-xs">
                  {s}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

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
            <div className="space-y-2">
              {filtered.map((b) => (
                <button
                  key={b.id}
                  onClick={() => openDialog(b)}
                  className={cn(
                    'w-full text-left border border-lhc-border rounded-lg p-3 bg-lhc-surface',
                    'border-l-4 hover:bg-lhc-background transition-colors',
                    typeColor(b.type)
                  )}
                >
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-lhc-text-main">{b.patientName}</span>
                        {b.type === 'centaur' && <Badge variant="purple">Centaur</Badge>}
                        {b.type === 'custom_api' && <Badge variant="orange">Custom API</Badge>}
                        <Badge variant={getStatusVariant(b.status)} className="capitalize">{b.status}</Badge>
                        {b.attendanceStatus === 'attended' && (
                          <Badge variant="success">✓ Attended</Badge>
                        )}
                      </div>
                      <p className="text-xs text-lhc-text-muted">
                        {b.appointmentDate} at {b.appointmentTime}
                        {b.doctorName ? ` · ${b.doctorName}` : ''}
                        {b.serviceName ? ` · ${b.serviceName}` : ''}
                      </p>
                      {b.reference && (
                        <p className="text-xs text-lhc-text-muted font-mono">{b.reference}</p>
                      )}
                      {b.status === 'cancelled' && b.cancellationReason && (
                        <p className="text-xs text-red-600 max-w-[200px] truncate">
                          Reason: {b.cancellationReason}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Booking detail dialog */}
      <Dialog open={!!selectedBooking} onOpenChange={(open) => { if (!open) setSelectedBooking(null) }}>
        {selectedBooking && (
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 flex-wrap">
                {selectedBooking.patientName}
                {selectedBooking.type === 'centaur' && <Badge variant="purple">Centaur</Badge>}
                {selectedBooking.type === 'custom_api' && <Badge variant="orange">Custom API</Badge>}
                <Badge variant={getStatusVariant(selectedBooking.status)} className="capitalize">
                  {selectedBooking.status}
                </Badge>
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
                  <>
                    {selectedBooking.patientPhone && (
                      <a href={`tel:${selectedBooking.patientPhone}`} className="flex items-center gap-1.5 text-lhc-primary hover:underline">
                        <Phone className="w-3.5 h-3.5" />
                        {selectedBooking.patientPhone}
                      </a>
                    )}
                    {selectedBooking.patientEmail && (
                      <a href={`mailto:${selectedBooking.patientEmail}`} className="flex items-center gap-1.5 text-lhc-primary hover:underline">
                        <Mail className="w-3.5 h-3.5" />
                        {selectedBooking.patientEmail}
                      </a>
                    )}
                  </>
                )}
              </section>

              {/* Appointment details */}
              <section className="space-y-1 text-lhc-text-muted">
                <h3 className="font-semibold text-lhc-text-main">Appointment</h3>
                <p>{selectedBooking.doctorName}</p>
                <p>{selectedBooking.appointmentDate} at {selectedBooking.appointmentTime}</p>
                {selectedBooking.serviceName && <p>{selectedBooking.serviceName}</p>}
                {selectedBooking.reference && (
                  <p className="font-mono text-xs">{selectedBooking.reference}</p>
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
