'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

export interface StripeCustomer {
  id: string
  clinic_id: string
  stripe_customer_id: string
  stripe_subscription_id: string | null
  subscription_status: string
  current_period_start: string | null
  current_period_end: string | null
  cancel_at_period_end: boolean
  default_payment_method: string | null
  billing_email: string | null
  grace_period_ends_at: string | null
  service_suspended_at: string | null
  created_at: string
  updated_at: string
}

export interface StripeInvoice {
  id: string
  clinic_id: string
  stripe_invoice_id: string
  stripe_subscription_id: string | null
  status: string
  currency: string
  amount_due: number
  amount_paid: number
  amount_remaining: number
  tax: number
  subtotal: number
  total: number
  hosted_invoice_url: string | null
  invoice_pdf: string | null
  period_start: string | null
  period_end: string | null
  due_date: string | null
  paid_at: string | null
  attempt_count: number
  next_payment_attempt: string | null
  line_items: Array<{
    description: string | null
    amount: number
    quantity: number | null
    period: { start: number; end: number } | null
  }>
  created_at: string
  updated_at: string
}

export function useStripeCustomer(clinicId: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any

  const customerQuery = useQuery<StripeCustomer | null>({
    queryKey: ['stripe-customer', clinicId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stripe_customers')
        .select('*')
        .eq('clinic_id', clinicId)
        .maybeSingle()
      if (error) throw error
      return data
    },
    enabled: !!clinicId,
  })

  const invoicesQuery = useQuery<StripeInvoice[]>({
    queryKey: ['stripe-invoices', clinicId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stripe_invoices')
        .select('*')
        .eq('clinic_id', clinicId)
        .order('created_at', { ascending: false })
        .limit(20)
      if (error) throw error
      return data ?? []
    },
    enabled: !!clinicId,
  })

  return {
    customer: customerQuery.data ?? null,
    invoices: invoicesQuery.data ?? [],
    isLoading: customerQuery.isLoading || invoicesQuery.isLoading,
    error: customerQuery.error || invoicesQuery.error,
  }
}
