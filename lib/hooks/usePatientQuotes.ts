'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

export interface PatientQuote {
  id: string
  service_name: string
  request_type: string
  urgency: string
  status: string
  clinic_id: string
  estimated_cost: number | null
  patient_notes: string | null
  created_at: string
}

export function useAdminPatientQuotes(patientId: string | null) {
  return useQuery<PatientQuote[]>({
    queryKey: ['admin-patient-quotes', patientId],
    queryFn: async () => {
      if (!patientId) return []
      const supabase = createClient()

      const { data, error } = await supabase
        .from('quote_requests')
        .select('id, service_name, request_type, urgency, status, clinic_id, estimated_cost, patient_notes, created_at')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data ?? []
    },
    enabled: !!patientId,
  })
}
