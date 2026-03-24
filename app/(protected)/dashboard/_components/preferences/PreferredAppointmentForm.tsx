'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from '@/lib/toast'
import { CreatePreferenceInput } from '@/lib/hooks/useAppointmentPreferences'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2 } from 'lucide-react'

interface Clinic {
  id: string
  name: string
  centaur_api_enabled?: boolean
  centaur_practice_id?: string | null
  custom_api_enabled?: boolean
  custom_api_config_id?: string | null
}

interface Doctor {
  id: string
  name: string
}

interface Service {
  id: string
  name: string
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (input: CreatePreferenceInput) => Promise<boolean>
}

const TIME_SLOTS: string[] = []
for (let h = 9; h <= 17; h++) {
  TIME_SLOTS.push(`${String(h).padStart(2, '0')}:00`)
  if (h < 17 || false) TIME_SLOTS.push(`${String(h).padStart(2, '0')}:30`)
}
// 09:00 to 17:30
const ALL_TIMES = (() => {
  const slots: string[] = []
  for (let h = 9; h <= 17; h++) {
    slots.push(`${String(h).padStart(2, '0')}:00`)
    if (h < 17) slots.push(`${String(h).padStart(2, '0')}:30`)
  }
  slots.push('17:30')
  return slots
})()

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default function PreferredAppointmentForm({ open, onOpenChange, onSubmit }: Props) {
  const [clinics, setClinics] = useState<Clinic[]>([])
  const [clinicsLoading, setClinicsLoading] = useState(false)

  const [selectedClinicId, setSelectedClinicId] = useState('')
  const [clinicType, setClinicType] = useState<'db' | 'centaur' | 'custom'>('db')
  const [customApiConfigId, setCustomApiConfigId] = useState<string | null>(null)

  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [doctorsLoading, setDoctorsLoading] = useState(false)
  const [selectedDoctorId, setSelectedDoctorId] = useState('')

  const [services, setServices] = useState<Service[]>([])
  const [servicesLoading, setServicesLoading] = useState(false)
  const [selectedServiceId, setSelectedServiceId] = useState('')

  const [preferredDate, setPreferredDate] = useState('')
  const [preferredTime, setPreferredTime] = useState('')
  const [notifEmail, setNotifEmail] = useState(true)
  const [notifSms, setNotifSms] = useState(false)
  const [notifPush, setNotifPush] = useState(true)
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const todayStr = new Date().toISOString().split('T')[0]

  // Load clinics on open
  useEffect(() => {
    if (!open) return
    setClinicsLoading(true)
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(supabase as any)
      .from('clinics')
      .select('id, name, centaur_api_enabled, centaur_practice_id, custom_api_enabled, custom_api_config_id')
      .eq('is_active', true)
      .order('name', { ascending: true })
      .then(({ data, error }: { data: Clinic[] | null; error: unknown }) => {
        if (!error) setClinics(data ?? [])
        setClinicsLoading(false)
      })
  }, [open])

  // Reset form when closed
  useEffect(() => {
    if (!open) {
      setSelectedClinicId('')
      setSelectedDoctorId('')
      setSelectedServiceId('')
      setDoctors([])
      setServices([])
      setPreferredDate('')
      setPreferredTime('')
      setNotifEmail(true)
      setNotifSms(false)
      setNotifPush(true)
      setNotes('')
      setClinicType('db')
      setCustomApiConfigId(null)
    }
  }, [open])

  async function handleClinicChange(clinicId: string) {
    setSelectedClinicId(clinicId)
    setSelectedDoctorId('')
    setSelectedServiceId('')
    setDoctors([])
    setServices([])

    const clinic = clinics.find((c) => c.id === clinicId)
    if (!clinic) return

    // Detect clinic type
    if (clinic.centaur_api_enabled && clinic.centaur_practice_id) {
      setClinicType('centaur')
      setCustomApiConfigId(null)
      await loadCentaurDoctors(clinic.centaur_practice_id)
    } else if (clinic.custom_api_enabled && clinic.custom_api_config_id) {
      setClinicType('custom')
      setCustomApiConfigId(clinic.custom_api_config_id)
      await loadCustomApiDoctors(clinic.custom_api_config_id)
    } else {
      setClinicType('db')
      setCustomApiConfigId(null)
      await loadDbDoctors(clinicId)
    }
  }

  async function loadDbDoctors(clinicId: string) {
    setDoctorsLoading(true)
    try {
      const supabase = createClient()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any)
        .from('doctors')
        .select('id, first_name, last_name')
        .eq('clinic_id', clinicId)
        .eq('is_active', true)
        .order('first_name', { ascending: true })
      setDoctors((data ?? []).map((d: { id: string; first_name: string; last_name: string }) => ({ id: d.id, name: `${d.first_name} ${d.last_name}`.trim() })))
    } catch {
      toast.error('Could not load doctors.')
    } finally {
      setDoctorsLoading(false)
    }
  }

  async function loadCentaurDoctors(practiceId: string) {
    setDoctorsLoading(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase.functions.invoke('centaur-integration', {
        body: { action: 'getDoctors', practiceId },
      })
      if (error) throw error
      const list = (data?.doctors ?? []) as Array<{ id: number; name: string }>
      setDoctors(list.map((d) => ({ id: String(d.id), name: d.name })))
    } catch {
      toast.error('Could not load Centaur doctors.')
    } finally {
      setDoctorsLoading(false)
    }
  }

  async function loadCustomApiDoctors(configId: string) {
    setDoctorsLoading(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase.functions.invoke('custom-api-integration', {
        body: { action: 'get_doctors', configId },
      })
      if (error) throw error
      const list = (data?.doctors ?? []) as Array<{ id: string; name: string }>
      setDoctors(list.map((d) => ({ id: String(d.id), name: d.name })))
    } catch {
      toast.error('Could not load doctors from custom API.')
    } finally {
      setDoctorsLoading(false)
    }
  }

  async function handleDoctorChange(doctorId: string) {
    setSelectedDoctorId(doctorId)
    setSelectedServiceId('')
    setServices([])
    if (!doctorId || !selectedClinicId) return

    if (clinicType === 'db') {
      await loadDbServices(doctorId, selectedClinicId)
    }
    // For centaur/custom API clinics, services are not loaded from DB
  }

  async function loadDbServices(doctorId: string, clinicId: string) {
    setServicesLoading(true)
    try {
      const supabase = createClient()
      // First try doctor-specific services via doctor_services junction
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: doctorSvcData } = await (supabase as any)
        .from('doctor_services')
        .select('service_id, services(id, name)')
        .eq('doctor_id', doctorId)
        .eq('is_active', true)

      const doctorServices = (doctorSvcData ?? [])
        .map((ds: { services: { id: string; name: string } | null }) => ds.services)
        .filter(Boolean) as Service[]

      if (doctorServices.length > 0) {
        // Deduplicate by name
        const seen = new Set<string>()
        const unique = doctorServices.filter((s) => {
          if (seen.has(s.name)) return false
          seen.add(s.name)
          return true
        })
        setServices(unique)
      } else {
        // Fallback: clinic-wide services
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: clinicSvcData } = await (supabase as any)
          .from('services_public')
          .select('id, name')
          .eq('clinic_id', clinicId)
          .eq('is_active', true)
        setServices(clinicSvcData ?? [])
      }
    } catch {
      toast.error('Could not load services.')
    } finally {
      setServicesLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!selectedClinicId) { toast.error('Please select a clinic.'); return }
    if (!selectedDoctorId) { toast.error('Please select a doctor.'); return }
    if (clinicType === 'db' && services.length > 0 && !selectedServiceId) { toast.error('Please select a service.'); return }
    if (!preferredDate) { toast.error('Please select a preferred date.'); return }
    if (!preferredTime) { toast.error('Please select a preferred time.'); return }
    if (clinicType === 'custom' && customApiConfigId && !UUID_REGEX.test(customApiConfigId)) {
      toast.error('Invalid custom API configuration ID.')
      return
    }

    const input: CreatePreferenceInput = {
      clinic_id: selectedClinicId,
      preferred_date: preferredDate,
      preferred_time: preferredTime,
      notification_email: notifEmail,
      notification_sms: notifSms,
      notification_push: notifPush,
      notes: notes.trim() || null,
      check_database_appointments: clinicType === 'db',
      check_centaur_appointments: clinicType === 'centaur',
      check_custom_api_appointments: clinicType === 'custom',
    }

    if (clinicType === 'db') {
      input.doctor_id = selectedDoctorId
      if (selectedServiceId) input.service_id = selectedServiceId
    } else if (clinicType === 'centaur') {
      input.centaur_doctor_id = parseInt(selectedDoctorId, 10)
    } else {
      input.custom_api_config_id = customApiConfigId
      input.custom_api_doctor_id = selectedDoctorId
    }

    setSubmitting(true)
    const ok = await onSubmit(input)
    setSubmitting(false)
    if (ok) onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Appointment Reminder</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {/* Clinic */}
          <div className="space-y-1.5">
            <Label>Clinic</Label>
            {clinicsLoading ? (
              <div className="flex items-center gap-2 text-sm text-lhc-text-muted">
                <Loader2 className="w-4 h-4 animate-spin" />Loading clinics…
              </div>
            ) : (
              <Select value={selectedClinicId} onValueChange={handleClinicChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a clinic" />
                </SelectTrigger>
                <SelectContent>
                  {clinics.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.centaur_api_enabled ? '🟢 ' : ''}{c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Doctor */}
          <div className="space-y-1.5">
            <Label>Doctor</Label>
            {doctorsLoading ? (
              <div className="flex items-center gap-2 text-sm text-lhc-text-muted">
                <Loader2 className="w-4 h-4 animate-spin" />Loading doctors…
              </div>
            ) : (
              <Select
                value={selectedDoctorId}
                onValueChange={handleDoctorChange}
                disabled={!selectedClinicId}
              >
                <SelectTrigger>
                  <SelectValue placeholder={selectedClinicId ? 'Select a doctor' : 'Select a clinic first'} />
                </SelectTrigger>
                <SelectContent>
                  {doctors.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Service */}
          {clinicType === 'db' && (
            <div className="space-y-1.5">
              <Label>Service</Label>
              {servicesLoading ? (
                <div className="flex items-center gap-2 text-sm text-lhc-text-muted">
                  <Loader2 className="w-4 h-4 animate-spin" />Loading services…
                </div>
              ) : (
                <Select
                  value={selectedServiceId}
                  onValueChange={setSelectedServiceId}
                  disabled={!selectedDoctorId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={selectedDoctorId ? 'Select a service' : 'Select a doctor first'} />
                  </SelectTrigger>
                  <SelectContent>
                    {services.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          {/* Date + Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="preferred-date">Preferred Date</Label>
              <input
                id="preferred-date"
                type="date"
                min={todayStr}
                value={preferredDate}
                onChange={(e) => setPreferredDate(e.target.value)}
                className="w-full border border-lhc-border rounded-lg px-3 py-2.5 min-h-[44px] text-sm bg-lhc-background text-lhc-text-main focus:outline-none focus:ring-2 focus:ring-lhc-primary"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Preferred Time</Label>
              <Select value={preferredTime} onValueChange={setPreferredTime}>
                <SelectTrigger>
                  <SelectValue placeholder="Select time" />
                </SelectTrigger>
                <SelectContent>
                  {ALL_TIMES.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Notification methods */}
          <div className="space-y-2">
            <Label>Notification Methods</Label>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={notifEmail}
                  onCheckedChange={(v) => setNotifEmail(!!v)}
                />
                <span className="text-sm text-lhc-text-main">Email</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={notifSms}
                  onCheckedChange={(v) => setNotifSms(!!v)}
                />
                <span className="text-sm text-lhc-text-main">SMS</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={notifPush}
                  onCheckedChange={(v) => setNotifPush(!!v)}
                />
                <span className="text-sm text-lhc-text-main">In-app</span>
              </label>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder="Any additional information…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? <><Loader2 className="w-4 h-4 animate-spin" />Setting reminder…</> : 'Set Reminder'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
