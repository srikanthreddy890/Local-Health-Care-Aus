'use client'

import { useState, useCallback, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from '@/lib/toast'
import { downloadPrescriptionFile } from '@/lib/prescriptions/utils'
import type { Prescription, PrescriptionShare, Medication } from '@/lib/prescriptions/types'

// Re-export shared types for consumers
export type { Prescription, PrescriptionShare, Medication }

// Supabase typed client has ambiguous FK resolution for prescriptions (multiple FKs to clinics/profiles).
// We use targeted `as unknown as` casts on query results where the typed select can't resolve joins.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRow = Record<string, any>

async function fetchAllSharesForPrescriptions(
  prescriptionIds: string[]
): Promise<Record<string, PrescriptionShare[]>> {
  if (prescriptionIds.length === 0) return {}

  const supabase = createClient()
  const { data, error } = await (supabase
    .from('prescription_pharmacy_shares')
    .select('*, clinics!prescription_pharmacy_shares_pharmacy_clinic_id_fkey(name, logo_url, phone, address_line1)')
    .in('prescription_id', prescriptionIds)
    .order('shared_at', { ascending: false }) as unknown as Promise<{ data: AnyRow[] | null; error: unknown }>)

  if (error) {
    toast.error('Could not load prescription shares.')
    return {}
  }

  const map: Record<string, PrescriptionShare[]> = {}
  for (const s of data ?? []) {
    const clinic = s.clinics as AnyRow | null
    const share: PrescriptionShare = {
      id: s.id,
      prescription_id: s.prescription_id,
      pharmacy_name: clinic?.name ?? null,
      pharmacy_logo_url: clinic?.logo_url ?? null,
      pharmacy_phone: clinic?.phone ?? null,
      pharmacy_address: clinic?.address_line1 ?? null,
      status: s.status ?? 'pending',
      shared_at: s.shared_at ?? '',
      access_revoked: s.access_revoked ?? false,
    }
    if (!map[s.prescription_id]) map[s.prescription_id] = []
    map[s.prescription_id].push(share)
  }
  return map
}

export function usePrescriptions(patientId: string) {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([])
  const [sharesMap, setSharesMap] = useState<Record<string, PrescriptionShare[]>>({})
  const [loading, setLoading] = useState(false)

  const fetchPrescriptions = useCallback(async () => {
    if (!patientId) return
    setLoading(true)
    try {
      const supabase = createClient()
      const { data, error } = await (supabase
        .from('prescriptions')
        .select('*, clinics!prescriptions_clinic_id_fkey(name)')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false }) as unknown as Promise<{ data: AnyRow[] | null; error: unknown }>)

      if (error) throw error

      const mapped: Prescription[] = (data ?? []).map((p: AnyRow) => {
        const clinic = p.clinics as AnyRow | null
        return {
          id: p.id,
          title: p.title,
          description: p.description ?? null,
          status: p.status ?? 'active',
          prescription_date: p.prescription_date ?? null,
          prescription_text: p.prescription_text ?? null,
          medications: Array.isArray(p.medications) ? (p.medications as Medication[]) : [],
          doctor_name: p.doctor_name ?? null,
          clinic_name: clinic?.name ?? null,
          file_path: p.file_path ?? null,
          file_name: p.file_name ?? null,
          expires_at: p.expires_at ?? null,
          booking_reference: p.booking_reference ?? null,
          created_at: p.created_at ?? '',
        }
      })

      setPrescriptions(mapped)

      // Batch-fetch all shares in a single query (fixes N+1 problem)
      const ids = mapped.map((p) => p.id)
      const shares = await fetchAllSharesForPrescriptions(ids)
      setSharesMap(shares)
    } catch {
      toast.error('Could not load prescriptions.')
    } finally {
      setLoading(false)
    }
  }, [patientId])

  useEffect(() => { fetchPrescriptions() }, [fetchPrescriptions])

  async function revokeShare(shareId: string, prescriptionId: string): Promise<void> {
    const supabase = createClient()
    const { error } = await supabase
      .from('prescription_pharmacy_shares')
      .update({ access_revoked: true, revoked_at: new Date().toISOString() })
      .eq('id', shareId)

    if (error) {
      toast.error('Could not revoke access.')
      return
    }
    toast.success('Access revoked.')
    setSharesMap((prev) => ({
      ...prev,
      [prescriptionId]: (prev[prescriptionId] ?? []).filter((s) => s.id !== shareId),
    }))
  }

  async function refetchShares(prescriptionId: string): Promise<void> {
    const shares = await fetchAllSharesForPrescriptions([prescriptionId])
    setSharesMap((prev) => ({ ...prev, [prescriptionId]: shares[prescriptionId] ?? [] }))
  }

  return {
    prescriptions,
    sharesMap,
    loading,
    refetch: fetchPrescriptions,
    downloadPrescriptionFile,
    revokeShare,
    refetchShares,
  }
}
