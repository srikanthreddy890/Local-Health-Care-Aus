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

export interface IncomingPrescription {
  // Share fields
  share_id: string
  shared_at: string
  share_status: string
  patient_notes: string | null
  response_notes: string | null
  access_revoked: boolean

  // Prescription fields
  prescription_id: string
  title: string
  description: string | null
  prescription_date: string | null
  prescription_text: string | null
  medications: Medication[]
  doctor_name: string | null
  status: string
  file_path: string | null
  file_name: string | null
  expires_at: string | null
  booking_reference: string | null

  // Related entity fields
  prescribing_clinic_name: string | null
  prescribing_clinic_id: string | null
  patient_first_name: string | null
  patient_last_name: string | null
  patient_id: string | null
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function usePharmacyPrescriptions(pharmacyClinicId: string) {
  const [incoming, setIncoming] = useState<IncomingPrescription[]>([])
  const [loading, setLoading] = useState(false)

  const fetchIncoming = useCallback(async () => {
    if (!pharmacyClinicId) return
    setLoading(true)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabase = createClient() as any
      const { data, error } = await supabase
        .from('prescription_pharmacy_shares')
        .select(
          '*, prescriptions:prescription_id(*, clinics:clinic_id(name), profiles:patient_id(first_name, last_name))'
        )
        .eq('pharmacy_clinic_id', pharmacyClinicId)
        .eq('access_revoked', false)
        .order('shared_at', { ascending: false })

      if (error) throw error

      const mapped: IncomingPrescription[] = (data ?? []).map((s: Record<string, unknown>) => {
        const rx = s.prescriptions as Record<string, unknown> | null
        const clinic = rx?.clinics as Record<string, unknown> | null
        const profile = rx?.profiles as Record<string, unknown> | null

        return {
          share_id: s.id as string,
          shared_at: s.shared_at as string,
          share_status: (s.status as string) ?? 'pending',
          patient_notes: (s.notes as string) ?? null,
          response_notes: (s.response_notes as string) ?? null,
          access_revoked: (s.access_revoked as boolean) ?? false,

          prescription_id: (rx?.id as string) ?? '',
          title: (rx?.title as string) ?? 'Untitled',
          description: (rx?.description as string) ?? null,
          prescription_date: (rx?.prescription_date as string) ?? null,
          prescription_text: (rx?.prescription_text as string) ?? null,
          medications: Array.isArray(rx?.medications) ? (rx.medications as Medication[]) : [],
          doctor_name: (rx?.doctor_name as string) ?? null,
          status: (rx?.status as string) ?? 'active',
          file_path: (rx?.file_path as string) ?? null,
          file_name: (rx?.file_name as string) ?? null,
          expires_at: (rx?.expires_at as string) ?? null,
          booking_reference: (rx?.booking_reference as string) ?? null,

          prescribing_clinic_name: (clinic?.name as string) ?? null,
          prescribing_clinic_id: (rx?.clinic_id as string) ?? null,
          patient_first_name: (profile?.first_name as string) ?? null,
          patient_last_name: (profile?.last_name as string) ?? null,
          patient_id: (rx?.patient_id as string) ?? null,
        }
      })

      setIncoming(mapped)
    } catch {
      toast({ title: 'Error', description: 'Could not load incoming prescriptions.', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [pharmacyClinicId])

  useEffect(() => { fetchIncoming() }, [fetchIncoming])

  async function updateShareStatus(
    shareId: string,
    status: 'viewed' | 'dispensed' | 'rejected',
    responseNotes?: string
  ): Promise<{ success: boolean }> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabase = createClient() as any
      const { data, error } = await supabase.functions.invoke('update-prescription-status', {
        body: { shareId, status, responseNotes },
      })

      if (error) throw error
      if (!data?.success) throw new Error(data?.message ?? 'Update failed')

      // Update local state optimistically
      setIncoming((prev) =>
        prev.map((item) => {
          if (item.share_id !== shareId) return item
          const updated = { ...item, share_status: status, response_notes: responseNotes ?? item.response_notes }
          if (status === 'dispensed') updated.status = 'dispensed'
          return updated
        })
      )

      if (status !== 'viewed') {
        toast.success(status === 'dispensed' ? 'Prescription marked as dispensed.' : 'Prescription rejected.')
      }

      return { success: true }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not update status.'
      toast.error(message)
      return { success: false }
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
    incoming,
    loading,
    refetch: fetchIncoming,
    updateShareStatus,
    downloadPrescriptionFile,
  }
}
