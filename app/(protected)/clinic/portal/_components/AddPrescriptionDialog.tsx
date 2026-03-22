'use client'

import { useState, useEffect, useRef } from 'react'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Plus, Loader2, Upload, FileText, X, CalendarIcon, Pill,
} from 'lucide-react'
import { toast } from '@/lib/toast'
import {
  createPrescriptionAction,
  getRecentBookings,
} from '@/lib/hooks/useClinicPrescriptions'
import type { Medication, RecentBooking, CreatePrescriptionData } from '@/lib/prescriptions/types'
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE } from '@/lib/prescriptions/types'

// ── Types ────────────────────────────────────────────────────────────────────

export interface BookingRef {
  id: string
  reference: string
  type: 'standard' | 'centaur' | 'custom_api'
  patientName: string
  patientId?: string
  doctorName: string
  doctorId?: string
  appointmentDate: string
  appointmentTime: string
  clinicId: string
  createdBy: string
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  clinicId: string
  userId: string
  booking?: BookingRef
  onCreated?: () => void
}

// ── Constants ────────────────────────────────────────────────────────────────

const EMPTY_MED: Medication = { name: '', dosage: '', frequency: '', duration: '', notes: '' }

function typeBadge(type: string) {
  if (type === 'standard') return <Badge variant="secondary" className="text-[10px]">Standard</Badge>
  if (type === 'centaur') return <Badge className="bg-purple-100 text-purple-700 text-[10px]">Centaur</Badge>
  return <Badge className="bg-indigo-100 text-indigo-700 text-[10px]">Custom API</Badge>
}

// ── Component ────────────────────────────────────────────────────────────────

export default function AddPrescriptionDialog({
  open, onOpenChange, clinicId, userId, booking, onCreated,
}: Props) {
  // Uses standalone createPrescriptionAction — no full hook instantiation needed
  const [isUploading, setIsUploading] = useState(false)

  // Booking selection
  const [recentBookings, setRecentBookings] = useState<RecentBooking[]>([])
  const [bookingsLoading, setBookingsLoading] = useState(false)
  const [selectedBookingId, setSelectedBookingId] = useState<string>('')

  // Form fields
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [prescriptionText, setPrescriptionText] = useState('')
  const [contentMode, setContentMode] = useState<'upload' | 'write'>('write')
  const [expiryDate, setExpiryDate] = useState<Date | undefined>(undefined)

  // File upload
  const [file, setFile] = useState<File | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Medications
  const [medications, setMedications] = useState<Medication[]>([])
  const [pendingMed, setPendingMed] = useState<Medication>({ ...EMPTY_MED })

  // Load recent bookings when dialog opens in standalone mode
  useEffect(() => {
    if (!open) {
      // Reset form
      setTitle('')
      setDescription('')
      setPrescriptionText('')
      setContentMode('write')
      setExpiryDate(undefined)
      setFile(null)
      setMedications([])
      setPendingMed({ ...EMPTY_MED })
      setSelectedBookingId('')
      setRecentBookings([])
      return
    }

    if (!booking) {
      setBookingsLoading(true)
      getRecentBookings(clinicId)
        .then(setRecentBookings)
        .finally(() => setBookingsLoading(false))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, clinicId, booking])

  // Resolve the selected booking
  const resolvedBooking: BookingRef | undefined = booking
    ? booking
    : recentBookings.find((b) => b.id === selectedBookingId)
      ? (() => {
          const b = recentBookings.find((rb) => rb.id === selectedBookingId)!
          return {
            id: b.id,
            reference: b.reference,
            type: b.type,
            patientName: b.patientName,
            patientId: b.patientId,
            doctorName: b.doctorName,
            doctorId: b.doctorId,
            appointmentDate: b.appointmentDate,
            appointmentTime: b.appointmentTime,
            clinicId,
            createdBy: userId,
          }
        })()
      : undefined

  // ── File handlers ──────────────────────────────────────────────────────────

  function validateAndSetFile(f: File) {
    if (!ALLOWED_MIME_TYPES.includes(f.type)) {
      toast.error('Invalid file type. Allowed: PDF, JPEG, PNG, WebP.')
      return
    }
    if (f.size > MAX_FILE_SIZE) {
      toast.error('File too large. Maximum 50MB.')
      return
    }
    setFile(f)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragActive(false)
    if (e.dataTransfer.files[0]) validateAndSetFile(e.dataTransfer.files[0])
  }

  // ── Medication helpers ─────────────────────────────────────────────────────

  function addMedication() {
    if (!pendingMed.name.trim()) return
    setMedications((prev) => [...prev, { ...pendingMed, name: pendingMed.name.trim() }])
    setPendingMed({ ...EMPTY_MED })
  }

  function removeMedication(index: number) {
    setMedications((prev) => prev.filter((_, i) => i !== index))
  }

  // ── Submit ─────────────────────────────────────────────────────────────────

  async function handleSubmit() {
    if (!resolvedBooking) {
      toast.error('Please select an appointment.')
      return
    }
    if (!title.trim()) {
      toast.error('Please enter a prescription title.')
      return
    }

    // Auto-commit pending medication
    const finalMeds = [...medications]
    if (pendingMed.name.trim()) {
      finalMeds.push({ ...pendingMed, name: pendingMed.name.trim() })
    }

    const data: CreatePrescriptionData = {
      clinic_id: clinicId,
      patient_id: resolvedBooking.patientId ?? null,
      doctor_id: resolvedBooking.doctorId ?? null,
      doctor_name: resolvedBooking.doctorName,
      booking_reference: resolvedBooking.reference || null,
      booking_type: resolvedBooking.type,
      title: title.trim(),
      description: description.trim() || null,
      prescription_text: prescriptionText.trim() || null,
      medications: finalMeds,
      expires_at: expiryDate ? expiryDate.toISOString() : null,
      created_by: userId,
    }

    // Set correct booking FK
    if (resolvedBooking.type === 'standard') data.booking_id = resolvedBooking.id
    else if (resolvedBooking.type === 'centaur') data.centaur_booking_id = resolvedBooking.id
    else data.custom_api_booking_id = resolvedBooking.id

    setIsUploading(true)
    const result = await createPrescriptionAction(data, contentMode === 'upload' ? file : null)
    setIsUploading(false)

    if (result.success) {
      onOpenChange(false)
      onCreated?.()
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pill className="w-4 h-4" />
            Add Prescription
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* ── 1. Booking Selection ─────────────────────────────────── */}
          {booking ? (
            <Card className="p-3">
              <p className="font-medium text-sm">{booking.patientName}</p>
              <p className="text-xs text-muted-foreground">
                {booking.doctorName} · {booking.appointmentDate} {booking.appointmentTime}
              </p>
              <div className="mt-1">{typeBadge(booking.type)}</div>
            </Card>
          ) : (
            <div className="space-y-1.5">
              <Label>Appointment *</Label>
              {bookingsLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading appointments…
                </div>
              ) : (
                <Select value={selectedBookingId} onValueChange={setSelectedBookingId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an appointment…">
                      {resolvedBooking && (
                        <span className="text-sm truncate">
                          {resolvedBooking.patientName} · {resolvedBooking.doctorName} · {resolvedBooking.appointmentDate} {resolvedBooking.appointmentTime}
                        </span>
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {recentBookings.length === 0 && (
                      <div className="px-3 py-2 text-sm text-muted-foreground">No recent appointments found.</div>
                    )}
                    {recentBookings.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        <div className="flex flex-col py-0.5">
                          <span className="flex items-center gap-2 text-sm font-medium">
                            {b.patientName}
                            {b.type !== 'standard' && typeBadge(b.type)}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {b.doctorName} · {b.appointmentDate} at {b.appointmentTime}
                            {b.reference && <> · Ref: {b.reference}</>}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          {/* ── 2. Title + Description ──────────────────────────────── */}
          <div className="space-y-1.5">
            <Label htmlFor="rx-title">Title *</Label>
            <Input
              id="rx-title"
              placeholder="e.g. Post-visit medication"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="rx-desc">Description</Label>
            <Textarea
              id="rx-desc"
              placeholder="Optional description…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[60px]"
            />
          </div>

          {/* ── 3. Content Mode Tabs ────────────────────────────────── */}
          <Tabs value={contentMode} onValueChange={(v) => setContentMode(v as 'upload' | 'write')}>
            <TabsList className="w-full">
              <TabsTrigger value="upload" className="flex-1 gap-1.5">
                <Upload className="w-3.5 h-3.5" /> Upload File
              </TabsTrigger>
              <TabsTrigger value="write" className="flex-1 gap-1.5">
                <FileText className="w-3.5 h-3.5" /> Write
              </TabsTrigger>
            </TabsList>

            {/* Upload tab */}
            <TabsContent value="upload" className="mt-3">
              {file ? (
                <div className="flex items-center justify-between border border-lhc-border rounded-lg p-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="w-4 h-4 text-primary shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{file.name}</p>
                      <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setFile(null)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div
                  className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                    dragActive ? 'border-primary bg-primary/5' : 'border-lhc-border hover:border-primary/40'
                  }`}
                  onDragEnter={(e) => { e.preventDefault(); setDragActive(true) }}
                  onDragLeave={(e) => { e.preventDefault(); setDragActive(false) }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Drag & drop or <span className="text-primary font-medium">browse</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">PDF, JPEG, PNG, WebP · Max 50MB</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.[0]) validateAndSetFile(e.target.files[0])
                      e.target.value = ''
                    }}
                  />
                </div>
              )}
            </TabsContent>

            {/* Write tab */}
            <TabsContent value="write" className="mt-3 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="rx-text">Prescription Notes</Label>
                <Textarea
                  id="rx-text"
                  placeholder="Dosage, frequency, duration, special instructions…"
                  value={prescriptionText}
                  onChange={(e) => setPrescriptionText(e.target.value)}
                  className="min-h-[80px]"
                />
              </div>

              {/* Medications list */}
              <div className="space-y-2">
                <Label>Medications</Label>

                {medications.map((med, i) => (
                  <Card key={i} className="p-3 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-sm">{med.name}</p>
                      {[med.dosage, med.frequency, med.duration].filter(Boolean).length > 0 && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {[med.dosage, med.frequency, med.duration].filter(Boolean).join(' · ')}
                        </p>
                      )}
                      {med.notes && <p className="text-xs text-muted-foreground mt-0.5">{med.notes}</p>}
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => removeMedication(i)}>
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </Card>
                ))}

                {/* Add medication form */}
                <div className="border border-lhc-border rounded-lg p-3 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      placeholder="Medication name *"
                      value={pendingMed.name}
                      onChange={(e) => setPendingMed((p) => ({ ...p, name: e.target.value }))}
                    />
                    <Input
                      placeholder="Dosage (e.g. 500mg)"
                      value={pendingMed.dosage}
                      onChange={(e) => setPendingMed((p) => ({ ...p, dosage: e.target.value }))}
                    />
                    <Input
                      placeholder="Frequency (e.g. Twice daily)"
                      value={pendingMed.frequency}
                      onChange={(e) => setPendingMed((p) => ({ ...p, frequency: e.target.value }))}
                    />
                    <Input
                      placeholder="Duration (e.g. 7 days)"
                      value={pendingMed.duration}
                      onChange={(e) => setPendingMed((p) => ({ ...p, duration: e.target.value }))}
                    />
                  </div>
                  <Input
                    placeholder="Notes (optional)"
                    value={pendingMed.notes}
                    onChange={(e) => setPendingMed((p) => ({ ...p, notes: e.target.value }))}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addMedication}
                    disabled={!pendingMed.name.trim()}
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Medication
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {/* ── 4. Expiry Date ──────────────────────────────────────── */}
          <div className="space-y-1.5">
            <Label>Expiry Date (optional)</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal">
                  <CalendarIcon className="w-4 h-4 mr-2" />
                  {expiryDate ? format(expiryDate, 'PPP') : 'Select expiry date…'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={expiryDate}
                  onSelect={setExpiryDate}
                  disabled={{ before: new Date() }}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* ── Footer ──────────────────────────────────────────────────── */}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isUploading}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isUploading || !title.trim() || !resolvedBooking}
          >
            {isUploading && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
            Save Prescription
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
