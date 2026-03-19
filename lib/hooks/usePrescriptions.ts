'use client'

import { useState, useCallback, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from '@/lib/toast'

export interface Medication {
  name: string
  dosage?: string
  frequency?: string
  duration?: string
  notes?: string
}

export interface Prescription {
  id: string
  title: string
  description: string | null
  status: string
  prescription_date: string | null
  prescription_text: string | null
  medications: Medication[]
  doctor_name: string | null
  clinic_name: string | null
  file_path: string | null
  file_name: string | null
  expires_at: string | null
  booking_reference: string | null
  created_at: string
}

export interface PrescriptionShare {
  id: string
  prescription_id: string
  pharmacy_name: string | null
  pharmacy_logo_url: string | null
  pharmacy_phone: string | null
  pharmacy_address: string | null
  status: string
  shared_at: string
  access_revoked: boolean | null
}

async function fetchSharesForPrescription(prescriptionId: string): Promise<PrescriptionShare[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any
  const { data, error } = await supabase
    .from('prescription_pharmacy_shares')
    .select('*, clinics:pharmacy_clinic_id(name, logo_url, phone, address_line1)')
    .eq('prescription_id', prescriptionId)
    .order('shared_at', { ascending: false })

  if (error) return []

  return (data ?? []).map((s: Record<string, unknown>) => {
    const clinic = s.clinics as Record<string, unknown> | null
    return {
      id: s.id,
      prescription_id: s.prescription_id,
      pharmacy_name: clinic?.name ?? null,
      pharmacy_logo_url: clinic?.logo_url ?? null,
      pharmacy_phone: clinic?.phone ?? null,
      pharmacy_address: clinic?.address_line1 ?? null,
      status: s.status ?? 'pending',
      shared_at: s.shared_at,
      access_revoked: s.access_revoked ?? false,
    } as PrescriptionShare
  })
}

export function usePrescriptions(patientId: string) {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([])
  const [sharesMap, setSharesMap] = useState<Record<string, PrescriptionShare[]>>({})
  const [loading, setLoading] = useState(false)

  const fetchPrescriptions = useCallback(async () => {
    if (!patientId) return
    setLoading(true)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabase = createClient() as any
      const { data, error } = await supabase
        .from('prescriptions')
        .select('*, clinics:clinic_id(name)')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false })

      if (error) throw error

      const mapped: Prescription[] = (data ?? []).map((p: Record<string, unknown>) => {
        const clinic = p.clinics as Record<string, unknown> | null
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
          created_at: p.created_at as string,
        }
      })

      setPrescriptions(mapped)

      // Fetch shares for each prescription in parallel
      const entries = await Promise.all(
        mapped.map(async (p) => [p.id, await fetchSharesForPrescription(p.id)] as const)
      )
      setSharesMap(Object.fromEntries(entries))
    } catch {
      toast({ title: 'Error', description: 'Could not load prescriptions.', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [patientId])

  useEffect(() => { fetchPrescriptions() }, [fetchPrescriptions])

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
      toast({ title: 'Error', description: 'Could not download file.', variant: 'destructive' })
    }
  }

  async function revokeShare(shareId: string, prescriptionId: string): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createClient() as any
    const { error } = await supabase
      .from('prescription_pharmacy_shares')
      .update({ access_revoked: true, revoked_at: new Date().toISOString() })
      .eq('id', shareId)

    if (error) {
      toast({ title: 'Error', description: 'Could not revoke access.', variant: 'destructive' })
      return
    }
    toast({ title: 'Access revoked' })
    setSharesMap((prev) => ({
      ...prev,
      [prescriptionId]: (prev[prescriptionId] ?? []).filter((s) => s.id !== shareId),
    }))
  }

  async function refetchShares(prescriptionId: string): Promise<void> {
    const shares = await fetchSharesForPrescription(prescriptionId)
    setSharesMap((prev) => ({ ...prev, [prescriptionId]: shares }))
  }

  return { prescriptions, sharesMap, loading, refetch: fetchPrescriptions, downloadPrescriptionFile, revokeShare, refetchShares }
}
