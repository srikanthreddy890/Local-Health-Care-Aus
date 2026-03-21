'use client'

import { useState, useCallback, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from '@/lib/toast'

// ── Interfaces ───────────────────────────────────────────────────────────────

export interface Medication {
  name: string
  dosage?: string
  frequency?: string
  duration?: string
  notes?: string
}

export interface ClinicPrescription {
  id: string
  clinic_id: string
  patient_id: string | null
  patient_first_name: string | null
  patient_last_name: string | null
  doctor_id: string | null
  doctor_name: string | null
  booking_type: string | null
  booking_reference: string | null
  title: string
  description: string | null
  prescription_date: string | null
  prescription_text: string | null
  medications: Medication[]
  file_path: string | null
  file_name: string | null
  file_size: number | null
  mime_type: string | null
  status: string
  expires_at: string | null
  created_by: string | null
  created_at: string
}

export interface CreatePrescriptionData {
  clinic_id: string
  patient_id?: string | null
  doctor_id?: string | null
  doctor_name?: string | null
  booking_id?: string | null
  centaur_booking_id?: string | null
  custom_api_booking_id?: string | null
  booking_type?: string
  booking_reference?: string | null
  title: string
  description?: string | null
  prescription_text?: string | null
  medications?: Medication[]
  expires_at?: string | null
  created_by: string
}

export interface RecentBooking {
  id: string
  reference: string
  type: 'standard' | 'centaur' | 'custom_api'
  patientName: string
  patientId?: string
  doctorName: string
  doctorId?: string
  appointmentDate: string
  appointmentTime: string
}

// ── Constants ────────────────────────────────────────────────────────────────

const ALLOWED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50 MB

// ── Standalone: getRecentBookings ────────────────────────────────────────────

export async function getRecentBookings(clinicId: string): Promise<RecentBooking[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const cutoff = thirtyDaysAgo.toISOString().split('T')[0]

  const [{ data: standard }, { data: centaur }, { data: custom }] = await Promise.all([
    supabase
      .from('bookings')
      .select('id, booking_reference, patient_id, patient_first_name, patient_last_name, appointment_date, start_time, doctor_name, appointments!appointment_id(doctor_id)')
      .eq('clinic_id', clinicId)
      .gte('appointment_date', cutoff)
      .order('appointment_date', { ascending: false })
      .limit(50),
    supabase
      .from('centaur_bookings')
      .select('id, centaur_booking_id, local_patient_id, patient_first_name, patient_last_name, appointment_date, appointment_time, centaur_doctor_id')
      .eq('clinic_id', clinicId)
      .gte('appointment_date', cutoff)
      .order('appointment_date', { ascending: false })
      .limit(50),
    supabase
      .from('custom_api_bookings')
      .select('id, external_booking_id, patient_id, patient_first_name, patient_last_name, appointment_date, appointment_time, doctor_name')
      .eq('clinic_id', clinicId)
      .gte('appointment_date', cutoff)
      .order('appointment_date', { ascending: false })
      .limit(50),
  ])

  const results: RecentBooking[] = []

  for (const b of (standard ?? []) as Record<string, unknown>[]) {
    const appt = b.appointments as { doctor_id?: string } | null
    results.push({
      id: b.id as string,
      reference: (b.booking_reference as string) ?? '',
      type: 'standard',
      patientName: [b.patient_first_name, b.patient_last_name].filter(Boolean).join(' ') || 'Unknown',
      patientId: (b.patient_id as string) ?? undefined,
      doctorName: (b.doctor_name as string) ?? 'Unknown',
      doctorId: appt?.doctor_id ?? undefined,
      appointmentDate: (b.appointment_date as string) ?? '',
      appointmentTime: (b.start_time as string) ?? '',
    })
  }

  for (const b of (centaur ?? []) as Record<string, unknown>[]) {
    results.push({
      id: b.id as string,
      reference: `CENTAUR-${b.centaur_booking_id}`,
      type: 'centaur',
      patientName: [b.patient_first_name, b.patient_last_name].filter(Boolean).join(' ') || 'Unknown',
      patientId: (b.local_patient_id as string) ?? undefined,
      doctorName: `Doctor ID: ${b.centaur_doctor_id}`,
      appointmentDate: (b.appointment_date as string) ?? '',
      appointmentTime: (b.appointment_time as string) ?? '',
    })
  }

  for (const b of (custom ?? []) as Record<string, unknown>[]) {
    results.push({
      id: b.id as string,
      reference: (b.external_booking_id as string) ?? '',
      type: 'custom_api',
      patientName: [b.patient_first_name, b.patient_last_name].filter(Boolean).join(' ') || 'Unknown',
      patientId: (b.patient_id as string) ?? undefined,
      doctorName: (b.doctor_name as string) ?? 'Unknown',
      appointmentDate: (b.appointment_date as string) ?? '',
      appointmentTime: (b.appointment_time as string) ?? '',
    })
  }

  // Sort by date descending
  results.sort((a, b) => (b.appointmentDate > a.appointmentDate ? 1 : -1))
  return results
}

// ── Hook: useClinicPrescriptions ─────────────────────────────────────────────

export function useClinicPrescriptions(clinicId: string) {
  const [prescriptions, setPrescriptions] = useState<ClinicPrescription[]>([])
  const [loading, setLoading] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  const fetchPrescriptions = useCallback(async () => {
    if (!clinicId) return
    setLoading(true)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabase = createClient() as any
      const { data, error } = await supabase
        .from('prescriptions')
        .select('*, profiles:patient_id(first_name, last_name)')
        .eq('clinic_id', clinicId)
        .order('created_at', { ascending: false })

      if (error) throw error

      const mapped: ClinicPrescription[] = (data ?? []).map((p: Record<string, unknown>) => {
        const profile = p.profiles as Record<string, unknown> | null
        return {
          id: p.id,
          clinic_id: p.clinic_id,
          patient_id: p.patient_id ?? null,
          patient_first_name: profile?.first_name ?? null,
          patient_last_name: profile?.last_name ?? null,
          doctor_id: p.doctor_id ?? null,
          doctor_name: p.doctor_name ?? null,
          booking_type: p.booking_type ?? null,
          booking_reference: p.booking_reference ?? null,
          title: p.title as string,
          description: p.description ?? null,
          prescription_date: p.prescription_date ?? null,
          prescription_text: p.prescription_text ?? null,
          medications: Array.isArray(p.medications) ? (p.medications as Medication[]) : [],
          file_path: p.file_path ?? null,
          file_name: p.file_name ?? null,
          file_size: p.file_size ?? null,
          mime_type: p.mime_type ?? null,
          status: (p.status as string) ?? 'active',
          expires_at: p.expires_at ?? null,
          created_by: p.created_by ?? null,
          created_at: p.created_at as string,
        }
      })

      setPrescriptions(mapped)
    } catch {
      toast({ title: 'Error', description: 'Could not load prescriptions.', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [clinicId])

  useEffect(() => { fetchPrescriptions() }, [fetchPrescriptions])

  async function createPrescription(
    data: CreatePrescriptionData,
    file?: File | null
  ): Promise<{ success: boolean }> {
    setIsUploading(true)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabase = createClient() as any

      let filePath: string | null = null
      let fileName: string | null = null
      let fileSize: number | null = null
      let mimeType: string | null = null

      if (file) {
        if (!ALLOWED_MIME_TYPES.includes(file.type)) {
          toast.error('Invalid file type. Allowed: PDF, JPEG, PNG, WebP.')
          return { success: false }
        }
        if (file.size > MAX_FILE_SIZE) {
          toast.error('File too large. Maximum size is 50MB.')
          return { success: false }
        }

        const ext = file.name.split('.').pop() ?? 'bin'
        const storagePath = `${data.clinic_id}/${crypto.randomUUID()}.${ext}`

        const { error: uploadErr } = await supabase.storage
          .from('prescriptions')
          .upload(storagePath, file, { contentType: file.type })

        if (uploadErr) throw uploadErr

        filePath = storagePath
        fileName = file.name
        fileSize = file.size
        mimeType = file.type
      }

      const payload: Record<string, unknown> = {
        clinic_id: data.clinic_id,
        patient_id: data.patient_id ?? null,
        doctor_id: data.doctor_id ?? null,
        doctor_name: data.doctor_name ?? null,
        booking_type: data.booking_type ?? null,
        booking_reference: data.booking_reference ?? null,
        title: data.title,
        description: data.description ?? null,
        prescription_text: data.prescription_text ?? null,
        medications: data.medications ?? [],
        prescription_date: new Date().toISOString().split('T')[0],
        status: 'active',
        expires_at: data.expires_at ?? null,
        created_by: data.created_by,
        file_path: filePath,
        file_name: fileName,
        file_size: fileSize,
        mime_type: mimeType,
      }

      // Set the correct booking FK
      if (data.booking_type === 'standard' && data.booking_id) {
        payload.booking_id = data.booking_id
      } else if (data.booking_type === 'centaur' && data.centaur_booking_id) {
        payload.centaur_booking_id = data.centaur_booking_id
      } else if (data.booking_type === 'custom_api' && data.custom_api_booking_id) {
        payload.custom_api_booking_id = data.custom_api_booking_id
      }

      const { data: created, error } = await supabase
        .from('prescriptions')
        .insert(payload)
        .select('id')
        .single()

      if (error) throw error

      // Fire-and-forget notification
      fetch('/api/prescription-notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'new_prescription', prescriptionId: created.id }),
      }).catch(() => {})

      toast.success('Prescription created successfully.')
      await fetchPrescriptions()
      return { success: true }
    } catch {
      toast.error('Failed to create prescription.')
      return { success: false }
    } finally {
      setIsUploading(false)
    }
  }

  async function deletePrescription(id: string, filePath?: string | null): Promise<void> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabase = createClient() as any

      if (filePath) {
        await supabase.storage.from('prescriptions').remove([filePath])
      }

      const { error } = await supabase.from('prescriptions').delete().eq('id', id)
      if (error) throw error

      setPrescriptions((prev) => prev.filter((p) => p.id !== id))
      toast.success('Prescription deleted.')
    } catch {
      toast.error('Could not delete prescription.')
    }
  }

  async function updatePrescriptionStatus(id: string, status: string): Promise<void> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabase = createClient() as any
      const { error } = await supabase.from('prescriptions').update({ status }).eq('id', id)
      if (error) throw error

      setPrescriptions((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status } : p))
      )
      toast.success('Status updated.')
    } catch {
      toast.error('Could not update status.')
    }
  }

  async function downloadPrescriptionFile(filePath: string, fileName: string): Promise<void> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabase = createClient() as any
      const { data, error } = await supabase.storage.from('prescriptions').download(filePath)
      if (error) throw error
      const url = URL.createObjectURL(data as Blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch {
      toast.error('Could not download file.')
    }
  }

  return {
    prescriptions,
    loading,
    isUploading,
    refetch: fetchPrescriptions,
    createPrescription,
    deletePrescription,
    updatePrescriptionStatus,
    downloadPrescriptionFile,
  }
}
