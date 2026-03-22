'use client'

import { useState, useCallback, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from '@/lib/toast'
import { downloadPrescriptionFile } from '@/lib/prescriptions/utils'
import type { IncomingPrescription, Medication } from '@/lib/prescriptions/types'

// Re-export shared types for consumers
export type { IncomingPrescription, Medication }

// Supabase typed client has ambiguous FK resolution for joined tables.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRow = Record<string, any>

// ── Hook ─────────────────────────────────────────────────────────────────────

export function usePharmacyPrescriptions(pharmacyClinicId: string) {
  const [incoming, setIncoming] = useState<IncomingPrescription[]>([])
  const [loading, setLoading] = useState(false)

  const fetchIncoming = useCallback(async () => {
    if (!pharmacyClinicId) return
    setLoading(true)
    try {
      const supabase = createClient()
      const { data, error } = await (supabase
        .from('prescription_pharmacy_shares')
        .select(
          '*, prescriptions!prescription_pharmacy_shares_prescription_id_fkey(*, clinics!prescriptions_clinic_id_fkey(name), profiles!prescriptions_patient_id_fkey(first_name, last_name))'
        )
        .eq('pharmacy_clinic_id', pharmacyClinicId)
        .eq('access_revoked', false)
        .order('shared_at', { ascending: false }) as unknown as Promise<{ data: AnyRow[] | null; error: unknown }>)

      if (error) throw error

      const mapped: IncomingPrescription[] = (data ?? []).map((s: AnyRow) => {
        const rx = s.prescriptions as AnyRow | null
        const clinic = rx?.clinics as AnyRow | null
        const profile = rx?.profiles as AnyRow | null

        return {
          share_id: s.id,
          shared_at: s.shared_at ?? '',
          share_status: s.status ?? 'pending',
          patient_notes: s.notes ?? null,
          response_notes: s.response_notes ?? null,
          access_revoked: s.access_revoked ?? false,

          prescription_id: rx?.id ?? '',
          title: rx?.title ?? 'Untitled',
          description: rx?.description ?? null,
          prescription_date: rx?.prescription_date ?? null,
          prescription_text: rx?.prescription_text ?? null,
          medications: Array.isArray(rx?.medications) ? (rx.medications as Medication[]) : [],
          doctor_name: rx?.doctor_name ?? null,
          status: rx?.status ?? 'active',
          file_path: rx?.file_path ?? null,
          file_name: rx?.file_name ?? null,
          expires_at: rx?.expires_at ?? null,
          booking_reference: rx?.booking_reference ?? null,

          prescribing_clinic_name: clinic?.name ?? null,
          prescribing_clinic_id: rx?.clinic_id ?? null,
          patient_first_name: profile?.first_name ?? null,
          patient_last_name: profile?.last_name ?? null,
          patient_id: rx?.patient_id ?? null,
        }
      })

      setIncoming(mapped)
    } catch {
      toast.error('Could not load incoming prescriptions.')
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
      const supabase = createClient()
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

  return {
    incoming,
    loading,
    refetch: fetchIncoming,
    updateShareStatus,
    downloadPrescriptionFile,
  }
}
