'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { ClinicBilling, ClinicModuleSubscription } from './useClinicBilling'

export interface ClinicWithBilling {
  id: string
  name: string
  email: string | null
  clinic_type: string | null
  city: string | null
  state: string | null
  is_active: boolean | null
  created_at: string | null
  user_id: string | null
  billing_status: string
  // Module flags
  bulk_import_enabled: boolean | null
  quotes_enabled: boolean | null
  emergency_slots_enabled: boolean | null
  chat_enabled: boolean | null
  referrals_enabled: boolean
  patient_documents_enabled: boolean
  // Aggregated data
  billing: ClinicBilling | null
  moduleSubscriptions: ClinicModuleSubscription[]
  bookings_count: number
  doctors_count: number
}

export function useAdminClinics(userId: string) {
  const queryClient = useQueryClient()

  return useQuery<ClinicWithBilling[]>({
    queryKey: ['admin-clinics'],
    queryFn: async () => {
      const supabase = createClient()

      const { data: isAdmin } = await supabase.rpc('has_role', { _user_id: userId, _role: 'admin' })
      if (!isAdmin) throw new Error('Unauthorized: Admin access required')

      // Fetch clinics
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: clinics, error } = await (supabase as any)
        .from('clinics')
        .select('id, name, email, clinic_type, city, state, is_active, created_at, user_id, billing_status, bulk_import_enabled, quotes_enabled, emergency_slots_enabled, chat_enabled, referrals_enabled, patient_documents_enabled')
        .order('name') as { data: Array<Record<string, unknown>> | null; error: Error | null }

      if (error) throw error
      if (!clinics || clinics.length === 0) return []

      const clinicIds = clinics.map((c) => c.id as string)

      // Parallel fetch: billing, module subscriptions, booking counts, doctor counts
      const [billingRes, modulesRes, doctorsRes, stdCount, cenCount, cusCount] = await Promise.all([
        supabase.from('clinic_billing').select('*').in('clinic_id', clinicIds),
        supabase.from('clinic_module_subscriptions').select('*').in('clinic_id', clinicIds),
        supabase.from('doctors').select('clinic_id').eq('is_active', true).in('clinic_id', clinicIds),
        supabase.from('bookings').select('clinic_id').in('clinic_id', clinicIds),
        supabase.from('centaur_bookings').select('clinic_id').in('clinic_id', clinicIds),
        supabase.from('custom_api_bookings').select('clinic_id').in('clinic_id', clinicIds),
      ])

      // Build lookup maps
      const billingMap: Record<string, ClinicBilling> = {}
      for (const b of billingRes.data ?? []) {
        billingMap[b.clinic_id] = b as ClinicBilling
      }

      const modulesMap: Record<string, ClinicModuleSubscription[]> = {}
      for (const m of modulesRes.data ?? []) {
        if (!modulesMap[m.clinic_id]) modulesMap[m.clinic_id] = []
        modulesMap[m.clinic_id].push(m as ClinicModuleSubscription)
      }

      // Count doctors per clinic
      const doctorCountMap: Record<string, number> = {}
      for (const d of doctorsRes.data ?? []) {
        const cid = (d as { clinic_id: string }).clinic_id
        doctorCountMap[cid] = (doctorCountMap[cid] ?? 0) + 1
      }

      // Count bookings per clinic (all 3 sources)
      const bookingCountMap: Record<string, number> = {}
      for (const b of stdCount.data ?? []) {
        const cid = (b as { clinic_id: string | null }).clinic_id
        if (cid) bookingCountMap[cid] = (bookingCountMap[cid] ?? 0) + 1
      }
      for (const b of cenCount.data ?? []) {
        const cid = (b as { clinic_id: string }).clinic_id
        bookingCountMap[cid] = (bookingCountMap[cid] ?? 0) + 1
      }
      for (const b of cusCount.data ?? []) {
        const cid = (b as { clinic_id: string }).clinic_id
        bookingCountMap[cid] = (bookingCountMap[cid] ?? 0) + 1
      }

      return clinics.map((clinic) => {
        const id = clinic.id as string
        return {
          id,
          name: (clinic.name as string) ?? '',
          email: (clinic.email as string | null) ?? null,
          clinic_type: (clinic.clinic_type as string | null) ?? null,
          city: (clinic.city as string | null) ?? null,
          state: (clinic.state as string | null) ?? null,
          is_active: (clinic.is_active as boolean | null) ?? null,
          created_at: (clinic.created_at as string | null) ?? null,
          user_id: (clinic.user_id as string | null) ?? null,
          billing_status: (clinic.billing_status as string) ?? 'active',
          bulk_import_enabled: (clinic.bulk_import_enabled as boolean | null) ?? null,
          quotes_enabled: (clinic.quotes_enabled as boolean | null) ?? null,
          emergency_slots_enabled: (clinic.emergency_slots_enabled as boolean | null) ?? null,
          chat_enabled: (clinic.chat_enabled as boolean | null) ?? null,
          referrals_enabled: (clinic.referrals_enabled as boolean) ?? false,
          patient_documents_enabled: (clinic.patient_documents_enabled as boolean) ?? false,
          billing: billingMap[id] ?? null,
          moduleSubscriptions: modulesMap[id] ?? [],
          bookings_count: bookingCountMap[id] ?? 0,
          doctors_count: doctorCountMap[id] ?? 0,
        }
      })
    },
    enabled: !!userId,
  })
}
