'use client'

import { useState, useCallback, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from '@/lib/toast'
import { downloadPrescriptionFile } from '@/lib/prescriptions/utils'
import type {
  ClinicPrescription,
  Medication,
  CreatePrescriptionData,
  RecentBooking,
} from '@/lib/prescriptions/types'
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE } from '@/lib/prescriptions/types'
import type { Json } from '@/integrations/supabase/types'

// Re-export shared types for consumers
export type { ClinicPrescription, Medication, CreatePrescriptionData, RecentBooking }

// Supabase typed client has ambiguous FK resolution for prescriptions (multiple FKs to clinics/profiles).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRow = Record<string, any>

// ── Standalone: getRecentBookings ────────────────────────────────────────────

export async function getRecentBookings(clinicId: string): Promise<RecentBooking[]> {
  const supabase = createClient()
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
      .limit(50) as unknown as Promise<{ data: AnyRow[] | null }>,
    supabase
      .from('centaur_bookings')
      .select('id, centaur_booking_id, local_patient_id, patient_first_name, patient_last_name, appointment_date, appointment_time, centaur_doctor_id')
      .eq('clinic_id', clinicId)
      .gte('appointment_date', cutoff)
      .order('appointment_date', { ascending: false })
      .limit(50) as unknown as Promise<{ data: AnyRow[] | null }>,
    supabase
      .from('custom_api_bookings')
      .select('id, external_booking_id, patient_id, patient_first_name, patient_last_name, appointment_date, appointment_time, doctor_name')
      .eq('clinic_id', clinicId)
      .gte('appointment_date', cutoff)
      .order('appointment_date', { ascending: false })
      .limit(50) as unknown as Promise<{ data: AnyRow[] | null }>,
  ])

  const results: RecentBooking[] = []

  for (const b of (standard ?? []) as AnyRow[]) {
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

  for (const b of (centaur ?? []) as AnyRow[]) {
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

  for (const b of (custom ?? []) as AnyRow[]) {
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

// ── Standalone: createPrescriptionAction ─────────────────────────────────────

export async function createPrescriptionAction(
  data: CreatePrescriptionData,
  file?: File | null
): Promise<{ success: boolean }> {
  try {
    const supabase = createClient()

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

    // Build insert payload
    // patient_id is required (non-nullable) in the DB schema
    if (!data.patient_id) {
      toast.error('Patient information is required.')
      return { success: false }
    }

    const insertData = {
      clinic_id: data.clinic_id,
      patient_id: data.patient_id,
      doctor_id: data.doctor_id ?? null,
      doctor_name: data.doctor_name ?? null,
      booking_type: data.booking_type ?? 'standard',
      booking_reference: data.booking_reference ?? null,
      title: data.title,
      description: data.description ?? null,
      prescription_text: data.prescription_text ?? null,
      medications: (data.medications ?? []) as unknown as Json,
      prescription_date: new Date().toISOString().split('T')[0],
      status: 'active',
      expires_at: data.expires_at ?? null,
      created_by: data.created_by,
      file_path: filePath,
      file_name: fileName,
      file_size: fileSize,
      mime_type: mimeType,
      booking_id: data.booking_type === 'standard' ? (data.booking_id ?? null) : null,
      centaur_booking_id: data.booking_type === 'centaur' ? (data.centaur_booking_id ?? null) : null,
      custom_api_booking_id: data.booking_type === 'custom_api' ? (data.custom_api_booking_id ?? null) : null,
    }

    const { data: created, error } = await supabase
      .from('prescriptions')
      .insert(insertData)
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
    return { success: true }
  } catch {
    toast.error('Failed to create prescription.')
    return { success: false }
  }
}

// ── Hook: useClinicPrescriptions ─────────────────────────────────────────────

export function useClinicPrescriptions(clinicId: string) {
  const [prescriptions, setPrescriptions] = useState<ClinicPrescription[]>([])
  const [loading, setLoading] = useState(false)

  const fetchPrescriptions = useCallback(async () => {
    if (!clinicId) return
    setLoading(true)
    try {
      const supabase = createClient()
      const { data, error } = await (supabase
        .from('prescriptions')
        .select('*, profiles!prescriptions_patient_id_fkey(first_name, last_name)')
        .eq('clinic_id', clinicId)
        .order('created_at', { ascending: false }) as unknown as Promise<{ data: AnyRow[] | null; error: unknown }>)

      if (error) throw error

      const mapped: ClinicPrescription[] = (data ?? []).map((p: AnyRow) => {
        const profile = p.profiles as AnyRow | null
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
          title: p.title,
          description: p.description ?? null,
          prescription_date: p.prescription_date ?? null,
          prescription_text: p.prescription_text ?? null,
          medications: Array.isArray(p.medications) ? (p.medications as Medication[]) : [],
          file_path: p.file_path ?? null,
          file_name: p.file_name ?? null,
          file_size: p.file_size ?? null,
          mime_type: p.mime_type ?? null,
          status: p.status ?? 'active',
          expires_at: p.expires_at ?? null,
          created_by: p.created_by ?? null,
          created_at: p.created_at ?? '',
        }
      })

      setPrescriptions(mapped)
    } catch {
      toast.error('Could not load prescriptions.')
    } finally {
      setLoading(false)
    }
  }, [clinicId])

  useEffect(() => { fetchPrescriptions() }, [fetchPrescriptions])

  async function deletePrescription(id: string, filePath?: string | null): Promise<void> {
    try {
      const supabase = createClient()

      // Delete associated shares first to prevent orphaned records
      await supabase.from('prescription_pharmacy_shares').delete().eq('prescription_id', id)

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
      const supabase = createClient()
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

  return {
    prescriptions,
    loading,
    refetch: fetchPrescriptions,
    deletePrescription,
    updatePrescriptionStatus,
    downloadPrescriptionFile,
  }
}
