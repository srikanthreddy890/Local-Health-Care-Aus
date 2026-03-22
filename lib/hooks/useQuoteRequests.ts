'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from '@/lib/toast'
import {
  MAX_CLINICS_PER_BATCH,
  VALID_REQUEST_TYPES,
  VALID_URGENCY,
  VALID_STATUSES,
} from '@/lib/constants/quotes'

export interface QuoteRequest {
  id: string
  patient_id: string
  clinic_id: string
  service_id?: string | null
  service_name: string
  request_type: string
  urgency: string
  preferred_date?: string | null
  patient_notes?: string | null
  quote_batch_id?: string | null
  status: string
  estimated_cost?: number | null
  estimated_rebate?: number | null
  estimated_gap?: number | null
  valid_until?: string | null
  payment_options?: string | null
  clinic_notes?: string | null
  responded_by?: string | null
  responded_at?: string | null
  created_at: string
  updated_at: string
  // joined
  clinic?: { id: string; name: string; logo_url?: string | null; phone?: string | null; email?: string | null } | null
  service?: { id: string; name: string; price?: number | null } | null
  patient?: { id: string; first_name?: string | null; last_name?: string | null; phone?: string | null } | null
}

export interface CreateBatchQuoteRequestData {
  clinic_ids: string[]
  service_name: string
  request_type: string
  urgency: string
  preferred_date?: string | null
  patient_notes?: string | null
}

export interface RespondToQuoteData {
  estimated_cost: number
  estimated_rebate?: number | null
  estimated_gap?: number | null
  valid_until?: string | null
  payment_options?: string | null
  clinic_notes?: string | null
}

// ── Patient side ─────────────────────────────────────────────────────────────

export function usePatientQuotes(patientId: string) {
  const [quotes, setQuotes] = useState<QuoteRequest[]>([])
  const [loading, setLoading] = useState(false)

  const fetchQuotes = useCallback(async () => {
    if (!patientId) return
    setLoading(true)
    try {
      const supabase = createClient()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('quote_requests')
        .select('*, clinic:clinic_id(id, name, logo_url, phone, email), service:service_id(id, name, price)')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false })
        .limit(200)
      if (error) throw error
      setQuotes(data ?? [])
    } catch {
      toast({ title: 'Error', description: 'Could not load quote requests.', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [patientId])

  useEffect(() => { fetchQuotes() }, [fetchQuotes])

  async function createBatchQuoteRequests(data: CreateBatchQuoteRequestData): Promise<boolean> {
    // Validate inputs
    if (data.clinic_ids.length === 0 || data.clinic_ids.length > MAX_CLINICS_PER_BATCH) {
      toast({ title: 'Error', description: `You can select between 1 and ${MAX_CLINICS_PER_BATCH} clinics per quote request.`, variant: 'destructive' })
      return false
    }
    const trimmed = data.service_name.trim()
    if (trimmed.length < 3 || trimmed.length > 500) {
      toast({ title: 'Error', description: 'Service description must be between 3 and 500 characters.', variant: 'destructive' })
      return false
    }
    if (!VALID_REQUEST_TYPES.includes(data.request_type as typeof VALID_REQUEST_TYPES[number])) {
      toast({ title: 'Error', description: 'Invalid quote type.', variant: 'destructive' })
      return false
    }
    if (!VALID_URGENCY.includes(data.urgency as typeof VALID_URGENCY[number])) {
      toast({ title: 'Error', description: 'Invalid urgency value.', variant: 'destructive' })
      return false
    }
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    const batchId = crypto.randomUUID()
    const rows = data.clinic_ids.map((clinicId) => ({
      patient_id: patientId,
      clinic_id: clinicId,
      quote_batch_id: batchId,
      service_name: data.service_name,
      request_type: data.request_type,
      urgency: data.urgency,
      preferred_date: data.preferred_date ?? null,
      patient_notes: data.patient_notes ?? null,
    }))

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from('quote_requests').insert(rows)
    if (error) {
      toast({ title: 'Error', description: 'Could not submit quote request.', variant: 'destructive' })
      return false
    }

    // Fire-and-forget notifications per clinic
    if (session) {
      data.clinic_ids.forEach((clinicId) => {
        fetch('/api/quote-request-notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clinicId,
            serviceName: data.service_name,
            requestType: data.request_type,
            urgency: data.urgency,
            preferredDate: data.preferred_date,
            patientNotes: data.patient_notes,
          }),
        }).catch((err) => console.error('Quote request notification failed:', err))
      })
    }

    toast({ title: 'Quote requested', description: `Sent to ${data.clinic_ids.length} clinic${data.clinic_ids.length !== 1 ? 's' : ''}.` })
    await fetchQuotes()
    return true
  }

  async function updateQuoteStatus(quoteId: string, status: string): Promise<boolean> {
    if (!VALID_STATUSES.includes(status as typeof VALID_STATUSES[number])) {
      toast({ title: 'Error', description: 'Invalid status value.', variant: 'destructive' })
      return false
    }
    // Prevent accepting a quote whose validity has expired
    if (status === 'accepted') {
      const quote = quotes.find((q) => q.id === quoteId)
      if (quote?.valid_until && new Date(quote.valid_until) < new Date()) {
        toast({ title: 'Quote Expired', description: 'This quote has passed its validity date and can no longer be accepted.', variant: 'destructive' })
        return false
      }
    }
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('quote_requests')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', quoteId)
    if (error) {
      toast({ title: 'Error', description: 'Could not update quote status.', variant: 'destructive' })
      return false
    }
    setQuotes((prev) => prev.map((q) => q.id === quoteId ? { ...q, status } : q))
    return true
  }

  return { quotes, loading, refetch: fetchQuotes, createBatchQuoteRequests, updateQuoteStatus }
}

// ── Clinic side ──────────────────────────────────────────────────────────────

export function useClinicQuotes(clinicId: string) {
  const [quotes, setQuotes] = useState<QuoteRequest[]>([])
  const [loading, setLoading] = useState(false)

  const fetchQuotes = useCallback(async () => {
    if (!clinicId) return
    setLoading(true)
    try {
      const supabase = createClient()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('quote_requests')
        .select('*, patient:patient_id(id, first_name, last_name, phone), service:service_id(id, name, price)')
        .eq('clinic_id', clinicId)
        .order('created_at', { ascending: false })
        .limit(200)
      if (error) throw error
      setQuotes(data ?? [])
    } catch {
      toast({ title: 'Error', description: 'Could not load quote requests.', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [clinicId])

  useEffect(() => { fetchQuotes() }, [fetchQuotes])

  async function respondToQuote(quoteId: string, responseData: RespondToQuoteData, respondedBy: string): Promise<boolean> {
    // Validate response data
    if (responseData.estimated_cost <= 0 || responseData.estimated_cost > 999999) {
      toast({ title: 'Error', description: 'Cost must be between $0.01 and $999,999.', variant: 'destructive' })
      return false
    }
    if (responseData.estimated_rebate != null && responseData.estimated_rebate > responseData.estimated_cost) {
      toast({ title: 'Error', description: 'Rebate cannot exceed the estimated cost.', variant: 'destructive' })
      return false
    }
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('quote_requests')
      .update({
        status: 'responded',
        estimated_cost: responseData.estimated_cost,
        estimated_rebate: responseData.estimated_rebate ?? null,
        estimated_gap: responseData.estimated_gap ?? null,
        valid_until: responseData.valid_until ?? null,
        payment_options: responseData.payment_options ?? null,
        clinic_notes: responseData.clinic_notes ?? null,
        responded_by: respondedBy || null,
        responded_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', quoteId)
    if (error) {
      toast({ title: 'Error', description: 'Could not submit response.', variant: 'destructive' })
      return false
    }

    // Fire-and-forget patient notification
    fetch('/api/quote-response-notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quoteId }),
    }).catch((err) => console.error('Quote response notification failed:', err))

    toast({ title: 'Response sent', description: 'Your quote response has been submitted.' })
    await fetchQuotes()
    return true
  }

  async function updateQuoteStatus(quoteId: string, status: string): Promise<boolean> {
    if (!VALID_STATUSES.includes(status as typeof VALID_STATUSES[number])) {
      toast({ title: 'Error', description: 'Invalid status value.', variant: 'destructive' })
      return false
    }
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('quote_requests')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', quoteId)
    if (error) {
      toast({ title: 'Error', description: 'Could not update status.', variant: 'destructive' })
      return false
    }
    setQuotes((prev) => prev.map((q) => q.id === quoteId ? { ...q, status } : q))
    return true
  }

  return { quotes, loading, refetch: fetchQuotes, respondToQuote, updateQuoteStatus }
}
