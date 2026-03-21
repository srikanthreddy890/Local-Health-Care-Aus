'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from '@/lib/toast'

export interface SentReferral {
  id: string
  target_clinic_id: string
  target_clinic_name: string
  target_clinic_email: string | null
  document_id: string
  document_title: string
  document_file_name: string
  patient_name: string | null
  referral_notes: string | null
  is_downloaded: boolean | null
  downloaded_at: string | null
  expires_at: string | null
  access_revoked: boolean | null
  revoked_at: string | null
  password_attempts: number | null
  max_password_attempts: number | null
  created_at: string | null
}

export interface ReceivedReferral {
  id: string
  source_clinic_id: string
  source_clinic_name: string
  source_clinic_email: string | null
  source_clinic_phone: string | null
  document_id: string
  document_title: string
  document_file_name: string
  patient_name: string | null
  referral_notes: string | null
  is_downloaded: boolean | null
  downloaded_at: string | null
  expires_at: string | null
  access_revoked: boolean | null
  password_attempts: number | null
  max_password_attempts: number | null
  created_at: string | null
}

export interface ClinicDocument {
  id: string
  clinic_id: string | null
  title: string
  document_type: string
  file_name: string
}

export interface ClinicOption {
  id: string
  name: string
  email: string
}

export function useClinicReferrals(clinicId: string) {
  const [sentReferrals, setSentReferrals] = useState<SentReferral[]>([])
  const [receivedReferrals, setReceivedReferrals] = useState<ReceivedReferral[]>([])
  const [allClinics, setAllClinics] = useState<ClinicOption[]>([])
  const [clinicDocuments, setClinicDocuments] = useState<ClinicDocument[]>([])
  const [loading, setLoading] = useState(false)

  const fetchSentReferrals = useCallback(async () => {
    if (!clinicId) return
    try {
      const supabase = createClient()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('clinic_referrals')
        .select('*, target_clinic:target_clinic_id(name, email), document:document_id(title, file_name)')
        .eq('source_clinic_id', clinicId)
        .order('created_at', { ascending: false })
      if (error) throw error
      setSentReferrals(
        (data ?? []).map((r: Record<string, unknown>) => ({
          id: r.id,
          target_clinic_id: r.target_clinic_id,
          target_clinic_name: (r.target_clinic as Record<string, unknown>)?.name ?? 'Unknown',
          target_clinic_email: (r.target_clinic as Record<string, unknown>)?.email ?? null,
          document_id: r.document_id,
          document_title: (r.document as Record<string, unknown>)?.title ?? 'Untitled',
          document_file_name: (r.document as Record<string, unknown>)?.file_name ?? '',
          patient_name: r.patient_name,
          referral_notes: r.referral_notes,
          is_downloaded: r.is_downloaded,
          downloaded_at: r.downloaded_at,
          expires_at: r.expires_at,
          access_revoked: r.access_revoked,
          revoked_at: r.revoked_at,
          password_attempts: r.password_attempts,
          max_password_attempts: r.max_password_attempts,
          created_at: r.created_at,
        }))
      )
    } catch {
      toast({ title: 'Error', description: 'Could not load sent referrals.', variant: 'destructive' })
    }
  }, [clinicId])

  const fetchReceivedReferrals = useCallback(async () => {
    if (!clinicId) return
    try {
      const supabase = createClient()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('clinic_referrals')
        .select('*, source_clinic:source_clinic_id(name, email, phone), document:document_id(title, file_name)')
        .eq('target_clinic_id', clinicId)
        .or('access_revoked.is.null,access_revoked.eq.false')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
      if (error) throw error
      setReceivedReferrals(
        (data ?? []).map((r: Record<string, unknown>) => ({
          id: r.id,
          source_clinic_id: r.source_clinic_id,
          source_clinic_name: (r.source_clinic as Record<string, unknown>)?.name ?? 'Unknown',
          source_clinic_email: (r.source_clinic as Record<string, unknown>)?.email ?? null,
          source_clinic_phone: (r.source_clinic as Record<string, unknown>)?.phone ?? null,
          document_id: r.document_id,
          document_title: (r.document as Record<string, unknown>)?.title ?? 'Untitled',
          document_file_name: (r.document as Record<string, unknown>)?.file_name ?? '',
          patient_name: r.patient_name,
          referral_notes: r.referral_notes,
          is_downloaded: r.is_downloaded,
          downloaded_at: r.downloaded_at,
          expires_at: r.expires_at,
          access_revoked: r.access_revoked,
          password_attempts: r.password_attempts,
          max_password_attempts: r.max_password_attempts,
          created_at: r.created_at,
        }))
      )
    } catch {
      toast({ title: 'Error', description: 'Could not load received referrals.', variant: 'destructive' })
    }
  }, [clinicId])

  const fetchAllClinics = useCallback(async () => {
    if (!clinicId) return
    try {
      const supabase = createClient()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('clinics')
        .select('id, name, email')
        .not('email', 'is', null)
        .neq('id', clinicId)
        .or('is_active.is.null,is_active.eq.true')
        .order('name')
      if (error) throw error
      setAllClinics((data ?? []) as ClinicOption[])
    } catch {
      toast({ title: 'Error', description: 'Could not load clinics.', variant: 'destructive' })
    }
  }, [clinicId])

  const fetchClinicDocuments = useCallback(async () => {
    if (!clinicId) return
    try {
      const supabase = createClient()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('clinic_documents')
        .select('id, clinic_id, title, document_type, file_name')
        .eq('clinic_id', clinicId)
        .order('created_at', { ascending: false })
      if (error) throw error
      setClinicDocuments((data ?? []) as ClinicDocument[])
    } catch {
      toast({ title: 'Error', description: 'Could not load documents.', variant: 'destructive' })
    }
  }, [clinicId])

  async function createReferral(params: {
    targetClinicId: string
    documentIds: string[]
    patientName?: string
    referralNotes?: string
  }) {
    const supabase = createClient()
    const { data, error } = await supabase.functions.invoke('send-clinic-referral', {
      body: {
        sourceClinicId: clinicId,
        targetClinicId: params.targetClinicId,
        documentIds: params.documentIds,
        patientName: params.patientName ?? null,
        referralNotes: params.referralNotes ?? null,
      },
    })
    if (error || data?.error) {
      toast({ title: 'Error', description: data?.error ?? 'Could not send referral.', variant: 'destructive' })
      return false
    }
    const count = params.documentIds.length
    toast({ title: 'Referral sent', description: `${count} document(s) sent! Password emailed separately.` })
    await fetchSentReferrals()
    return true
  }

  async function verifyAndDownload(
    referralId: string,
    password: string
  ): Promise<{ success: boolean; error?: string; attemptsRemaining?: number; locked?: boolean }> {
    const supabase = createClient()
    const { data, error } = await supabase.functions.invoke('verify-referral-download', {
      body: { referralId, password },
    })
    if (error) {
      return { success: false, error: 'Network error. Please try again.' }
    }
    if (data?.error) {
      return {
        success: false,
        error: data.error,
        attemptsRemaining: data.attemptsRemaining,
        locked: data.locked,
      }
    }

    if (!data.downloadUrl) {
      return { success: false, error: 'Download URL not available. Please try again.' }
    }

    // Download the file via blob strategy
    try {
      const response = await fetch(data.downloadUrl)
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = data.fileName ?? 'referral-document'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch {
      // Fallback: open in new tab
      window.open(data.downloadUrl, '_blank')
    }

    await fetchReceivedReferrals()
    return { success: true }
  }

  async function revokeReferral(referralId: string) {
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('clinic_referrals')
      .update({ access_revoked: true, revoked_at: new Date().toISOString() })
      .eq('id', referralId)
      .eq('source_clinic_id', clinicId)
    if (error) {
      toast({ title: 'Error', description: 'Could not revoke referral.', variant: 'destructive' })
      return
    }
    toast({ title: 'Referral revoked' })
    await fetchSentReferrals()
  }

  async function resendPassword(referralId: string) {
    const supabase = createClient()
    const { data, error } = await supabase.functions.invoke('resend-referral-password', {
      body: { referralId },
    })
    if (error || data?.error) {
      toast({ title: 'Error', description: data?.error ?? 'Could not resend password.', variant: 'destructive' })
      return
    }
    toast({ title: 'Password resent', description: 'New password sent to receiving clinic.' })
  }

  useEffect(() => {
    setLoading(true)
    Promise.all([fetchSentReferrals(), fetchReceivedReferrals()]).finally(() => setLoading(false))
  }, [fetchSentReferrals, fetchReceivedReferrals])

  return {
    sentReferrals,
    receivedReferrals,
    allClinics,
    clinicDocuments,
    loading,
    refetchSent: fetchSentReferrals,
    refetchReceived: fetchReceivedReferrals,
    fetchAllClinics,
    fetchClinicDocuments,
    createReferral,
    verifyAndDownload,
    revokeReferral,
    resendPassword,
  }
}
