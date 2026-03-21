'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

export interface PatientPrescription {
  id: string
  title: string
  description: string | null
  doctor_name: string | null
  prescription_date: string
  status: string | null
  clinic_id: string
  created_at: string | null
}

export function usePatientPrescriptions(patientId: string | null) {
  return useQuery<PatientPrescription[]>({
    queryKey: ['admin-patient-prescriptions', patientId],
    queryFn: async () => {
      if (!patientId) return []
      const supabase = createClient()

      const { data, error } = await supabase
        .from('prescriptions')
        .select('id, title, description, doctor_name, prescription_date, status, clinic_id, created_at')
        .eq('patient_id', patientId)
        .order('prescription_date', { ascending: false })

      if (error) throw error
      return data ?? []
    },
    enabled: !!patientId,
  })
}
