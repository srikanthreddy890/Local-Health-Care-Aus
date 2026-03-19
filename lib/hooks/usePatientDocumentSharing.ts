'use client'

import { useState, useCallback, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from '@/lib/toast'

export interface DocumentShare {
  id: string
  document_id: string
  patient_id: string
  clinic_id: string
  shared_by: string | null
  shared_at: string
  is_downloaded: boolean | null
  downloaded_at: string | null
  expires_at: string | null
  access_revoked: boolean | null
  revoked_at: string | null
  notes: string | null
  password_attempts: number | null
  max_password_attempts: number | null
  clinic?: { id: string; name: string; logo_url?: string | null } | null
}

export interface EligibleClinic {
  id: string
  name: string
  logo_url: string | null
  patient_documents_enabled: boolean | null
}

export function usePatientDocumentSharing(patientId: string | null) {
  const [shares, setShares] = useState<DocumentShare[]>([])
  const [loading, setLoading] = useState(false)

  const fetchMyShares = useCallback(async (documentId?: string) => {
    if (!patientId) return
    setLoading(true)
    try {
      const supabase = createClient()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query = (supabase as any)
        .from('patient_document_shares')
        .select('*, clinic:clinic_id(id, name, logo_url)')
        .eq('patient_id', patientId)
        .or('access_revoked.is.null,access_revoked.eq.false')
        .order('shared_at', { ascending: false })
      if (documentId) query = query.eq('document_id', documentId)
      const { data, error } = await query
      if (error) throw error
      setShares(data ?? [])
    } catch {
      toast({ title: 'Error', description: 'Could not load shares.', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [patientId])

  useEffect(() => { fetchMyShares() }, [fetchMyShares])

  async function revokeShare(shareId: string): Promise<void> {
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('patient_document_shares')
      .update({ access_revoked: true, revoked_at: new Date().toISOString() })
      .eq('id', shareId)
    if (error) {
      toast({ title: 'Error', description: 'Could not revoke access.', variant: 'destructive' })
      return
    }
    toast({ title: 'Access revoked' })
    setShares((prev) => prev.filter((s) => s.id !== shareId))
  }

  async function fetchEligibleClinics(): Promise<EligibleClinic[]> {
    if (!patientId) return []
    try {
      const supabase = createClient()
      // Get clinics the patient has booked with
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: bookingData } = await (supabase as any)
        .from('bookings')
        .select('clinic_id')
        .eq('patient_id', patientId)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: centaurData } = await (supabase as any)
        .from('centaur_bookings')
        .select('clinic_id')
        .eq('patient_id', patientId)

      const clinicIds = [
        ...(bookingData ?? []).map((b: { clinic_id: string }) => b.clinic_id),
        ...(centaurData ?? []).map((b: { clinic_id: string }) => b.clinic_id),
      ].filter(Boolean)

      const uniqueIds = [...new Set(clinicIds)]
      if (!uniqueIds.length) return []

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('clinics')
        .select('id, name, logo_url, patient_documents_enabled')
        .in('id', uniqueIds)
        .eq('patient_documents_enabled', true)

      if (error) return []
      return data ?? []
    } catch {
      return []
    }
  }

  return { shares, loading, fetchMyShares, revokeShare, fetchEligibleClinics }
}
