'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { toast } from '@/lib/toast'
import { useEffect } from 'react'

export const TAX_RATE = 0.10

export const MODULE_LABELS: Record<string, string> = {
  bulk_import: 'Bulk Doctor Import',
  quotes: 'Quote Requests',
  emergency_slots: 'Emergency Appointments',
  chat: 'Patient Messaging',
  referrals: 'Referrals System',
  patient_documents: 'Patient Documents',
  loyalty_points: 'Loyalty Points',
  incoming_prescriptions: 'Incoming Prescriptions',
}

export interface ClinicBilling {
  id: string
  clinic_id: string
  price_per_appointment: number
  free_appointments_per_month: number | null
  billing_cycle: string
  currency: string
  is_active: boolean | null
  notes: string | null
  effective_from: string | null
  created_at: string | null
  updated_at: string | null
  created_by: string | null
  updated_by: string | null
}

export interface ClinicBillingHistory {
  id: string
  clinic_id: string
  clinic_billing_id: string | null
  previous_price: number | null
  new_price: number
  previous_free_appointments: number | null
  new_free_appointments: number | null
  change_reason: string | null
  changed_by: string | null
  created_at: string | null
}

export interface ClinicModuleSubscription {
  id: string
  clinic_id: string
  module_key: string
  price_per_month: number
  is_active: boolean
  activated_at: string | null
  deactivated_at: string | null
  created_at: string | null
  updated_at: string | null
}

function useClinicBillingQueries(clinicId: string, historyLimit: number) {
  const queryClient = useQueryClient()

  const billingQuery = useQuery<ClinicBilling | null>({
    queryKey: ['clinic-billing', clinicId],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabase = createClient() as any
      const { data, error } = await supabase
        .from('clinic_billing')
        .select('*')
        .eq('clinic_id', clinicId)
        .maybeSingle()
      if (error) throw error
      return data
    },
    enabled: !!clinicId,
  })

  const historyQuery = useQuery<ClinicBillingHistory[]>({
    queryKey: ['clinic-billing-history', clinicId],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabase = createClient() as any
      const { data, error } = await supabase
        .from('clinic_billing_history')
        .select('*')
        .eq('clinic_id', clinicId)
        .order('created_at', { ascending: false })
        .limit(historyLimit)
      if (error) throw error
      return data ?? []
    },
    enabled: !!clinicId,
  })

  const monthlyBookingsQuery = useQuery<number>({
    queryKey: ['clinic-monthly-bookings', clinicId],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabase = createClient() as any
      const startOfMonth = new Date()
      startOfMonth.setDate(1)
      startOfMonth.setHours(0, 0, 0, 0)
      const iso = startOfMonth.toISOString()

      const [r1, r2, r3] = await Promise.all([
        supabase
          .from('bookings')
          .select('id', { count: 'exact', head: true })
          .eq('clinic_id', clinicId)
          .gte('created_at', iso),
        supabase
          .from('centaur_bookings')
          .select('id', { count: 'exact', head: true })
          .eq('clinic_id', clinicId)
          .gte('created_at', iso),
        supabase
          .from('custom_api_bookings')
          .select('id', { count: 'exact', head: true })
          .eq('clinic_id', clinicId)
          .gte('created_at', iso),
      ])

      return (r1.count ?? 0) + (r2.count ?? 0) + (r3.count ?? 0)
    },
    enabled: !!clinicId,
  })

  const moduleSubsQuery = useQuery<ClinicModuleSubscription[]>({
    queryKey: ['clinic-module-subscriptions', clinicId],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabase = createClient() as any
      const { data, error } = await supabase
        .from('clinic_module_subscriptions')
        .select('*')
        .eq('clinic_id', clinicId)
      if (error) throw error
      return data ?? []
    },
    enabled: !!clinicId,
  })

  // Realtime subscriptions
  useEffect(() => {
    if (!clinicId) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createClient() as any

    const channel = supabase
      .channel(`clinic-billing-${clinicId}-${Date.now()}`)
      .on('postgres_changes' as never, {
        event: '*',
        schema: 'public',
        table: 'clinic_billing',
        filter: `clinic_id=eq.${clinicId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['clinic-billing', clinicId] })
        queryClient.invalidateQueries({ queryKey: ['clinic-billing-history', clinicId] })
      })
      .on('postgres_changes' as never, {
        event: '*',
        schema: 'public',
        table: 'clinic_module_subscriptions',
        filter: `clinic_id=eq.${clinicId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['clinic-module-subscriptions', clinicId] })
      })
      .on('postgres_changes' as never, {
        event: 'INSERT',
        schema: 'public',
        table: 'bookings',
        filter: `clinic_id=eq.${clinicId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['clinic-monthly-bookings', clinicId] })
      })
      .on('postgres_changes' as never, {
        event: 'INSERT',
        schema: 'public',
        table: 'centaur_bookings',
        filter: `clinic_id=eq.${clinicId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['clinic-monthly-bookings', clinicId] })
      })
      .on('postgres_changes' as never, {
        event: 'INSERT',
        schema: 'public',
        table: 'custom_api_bookings',
        filter: `clinic_id=eq.${clinicId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['clinic-monthly-bookings', clinicId] })
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clinicId, queryClient])

  return {
    billing: billingQuery.data ?? null,
    history: historyQuery.data ?? [],
    moduleSubscriptions: moduleSubsQuery.data ?? [],
    monthlyBookings: monthlyBookingsQuery.data ?? 0,
    isLoading: billingQuery.isLoading || historyQuery.isLoading || monthlyBookingsQuery.isLoading || moduleSubsQuery.isLoading,
    error: billingQuery.error || historyQuery.error || monthlyBookingsQuery.error || moduleSubsQuery.error,
  }
}

export function useClinicBillingView(clinicId: string) {
  return useClinicBillingQueries(clinicId, 10)
}

/** Used by admin portal — AdminClinicBilling component (not yet implemented) */
export function useClinicBillingAdmin(clinicId: string) {
  const queryClient = useQueryClient()
  const queries = useClinicBillingQueries(clinicId, 20)

  const updateBilling = useMutation({
    mutationFn: async (values: {
      price_per_appointment: number
      free_appointments_per_month: number
      notes?: string
      is_active?: boolean
    }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabase = createClient() as any
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data: existing } = await supabase
        .from('clinic_billing')
        .select('id')
        .eq('clinic_id', clinicId)
        .maybeSingle()

      const now = new Date().toISOString()

      if (existing) {
        const { error } = await supabase
          .from('clinic_billing')
          .update({
            price_per_appointment: values.price_per_appointment,
            free_appointments_per_month: values.free_appointments_per_month,
            notes: values.notes ?? null,
            is_active: values.is_active ?? true,
            effective_from: now,
            updated_by: user.id,
          })
          .eq('id', existing.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('clinic_billing')
          .insert({
            clinic_id: clinicId,
            price_per_appointment: values.price_per_appointment,
            free_appointments_per_month: values.free_appointments_per_month,
            notes: values.notes ?? null,
            is_active: values.is_active ?? true,
            effective_from: now,
            created_by: user.id,
            updated_by: user.id,
          })
        if (error) throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clinic-billing', clinicId] })
      queryClient.invalidateQueries({ queryKey: ['clinic-billing-history', clinicId] })
      queryClient.invalidateQueries({ queryKey: ['admin-clinics'] })
      toast({ title: 'Billing updated', description: 'Changes saved successfully.' })
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to update billing.', variant: 'destructive' })
    },
  })

  return {
    ...queries,
    updateBilling,
  }
}
