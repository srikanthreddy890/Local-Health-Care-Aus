'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, DollarSign, AlertTriangle, CheckCircle2, XCircle, Clock } from 'lucide-react'
import { format } from 'date-fns'

interface ClinicBillingRow {
  clinic_id: string
  stripe_customer_id: string
  subscription_status: string
  current_period_end: string | null
  grace_period_ends_at: string | null
  service_suspended_at: string | null
  clinics: {
    name: string
    billing_status: string
  } | null
}

export default function AdminBillingOverview() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any

  const { data: stripeCustomers, isLoading } = useQuery<ClinicBillingRow[]>({
    queryKey: ['admin-stripe-customers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stripe_customers')
        .select('clinic_id, stripe_customer_id, subscription_status, current_period_end, grace_period_ends_at, service_suspended_at, clinics(name, billing_status)')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data ?? []
    },
  })

  const { data: allClinicsCount } = useQuery<number>({
    queryKey: ['admin-total-clinics-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('clinics')
        .select('id', { count: 'exact', head: true })
      if (error) throw error
      return count ?? 0
    },
  })

  const { data: recentInvoices } = useQuery({
    queryKey: ['admin-recent-invoices'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stripe_invoices')
        .select('id, clinic_id, stripe_invoice_id, status, total, currency, created_at, hosted_invoice_url, clinics(name)')
        .order('created_at', { ascending: false })
        .limit(10)
      if (error) throw error
      return data ?? []
    },
  })

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-lhc-primary" />
      </div>
    )
  }

  const customers = stripeCustomers ?? []
  const totalClinics = allClinicsCount ?? 0
  const linkedClinics = customers.length
  const unlinkedClinics = totalClinics - linkedClinics
  const activeCount = customers.filter((c) => c.subscription_status === 'active').length
  const pastDueCount = customers.filter(
    (c) => c.subscription_status === 'past_due' || c.grace_period_ends_at
  ).length
  const suspendedCount = customers.filter((c) => c.service_suspended_at).length

  // Estimated MRR from recent paid invoices (rough)
  const paidInvoices = (recentInvoices ?? []).filter(
    (inv: { status: string }) => inv.status === 'paid'
  )

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-lhc-text-main">Billing Overview</h1>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-5 pb-4 text-center">
            <DollarSign className="w-5 h-5 text-lhc-primary mx-auto mb-1" />
            <p className="text-2xl font-bold text-lhc-text-main">{linkedClinics}</p>
            <p className="text-xs text-lhc-text-muted">Stripe Linked</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4 text-center">
            <Clock className="w-5 h-5 text-gray-400 mx-auto mb-1" />
            <p className="text-2xl font-bold text-lhc-text-main">{unlinkedClinics}</p>
            <p className="text-xs text-lhc-text-muted">Not Linked</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4 text-center">
            <CheckCircle2 className="w-5 h-5 text-green-600 mx-auto mb-1" />
            <p className="text-2xl font-bold text-green-600">{activeCount}</p>
            <p className="text-xs text-lhc-text-muted">Active</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4 text-center">
            <AlertTriangle className="w-5 h-5 text-amber-600 mx-auto mb-1" />
            <p className="text-2xl font-bold text-amber-600">{pastDueCount}</p>
            <p className="text-xs text-lhc-text-muted">Past Due</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4 text-center">
            <XCircle className="w-5 h-5 text-red-600 mx-auto mb-1" />
            <p className="text-2xl font-bold text-red-600">{suspendedCount}</p>
            <p className="text-xs text-lhc-text-muted">Suspended</p>
          </CardContent>
        </Card>
      </div>

      {/* Clinics table */}
      <Card>
        <CardHeader>
          <CardTitle>Clinics with Stripe Billing</CardTitle>
        </CardHeader>
        <CardContent>
          {customers.length === 0 ? (
            <p className="text-sm text-lhc-text-muted text-center py-4">
              No clinics linked to Stripe yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-lhc-border">
                    <th className="text-left py-2 font-medium text-lhc-text-muted">Clinic</th>
                    <th className="text-left py-2 font-medium text-lhc-text-muted">Subscription</th>
                    <th className="text-left py-2 font-medium text-lhc-text-muted">Billing Status</th>
                    <th className="text-left py-2 font-medium text-lhc-text-muted">Next Billing</th>
                    <th className="text-left py-2 font-medium text-lhc-text-muted">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((c) => {
                    const billingStatus = c.clinics?.billing_status ?? 'unknown'
                    return (
                      <tr key={c.clinic_id} className="border-b border-lhc-border/50">
                        <td className="py-2 font-medium text-lhc-text-main">
                          {c.clinics?.name ?? c.clinic_id.slice(0, 8)}
                        </td>
                        <td className="py-2">
                          <Badge
                            variant={
                              c.subscription_status === 'active'
                                ? 'default'
                                : c.subscription_status === 'past_due'
                                  ? 'destructive'
                                  : 'outline'
                            }
                            className={c.subscription_status === 'active' ? 'bg-green-600' : ''}
                          >
                            {c.subscription_status}
                          </Badge>
                        </td>
                        <td className="py-2">
                          <Badge
                            variant={
                              billingStatus === 'active' || billingStatus === 'exempt'
                                ? 'default'
                                : billingStatus === 'grace_period'
                                  ? 'destructive'
                                  : 'outline'
                            }
                            className={
                              billingStatus === 'active'
                                ? 'bg-green-600'
                                : billingStatus === 'exempt'
                                  ? 'bg-blue-600'
                                  : ''
                            }
                          >
                            {billingStatus}
                          </Badge>
                        </td>
                        <td className="py-2 text-lhc-text-muted">
                          {c.current_period_end
                            ? format(new Date(c.current_period_end), 'dd MMM yyyy')
                            : '—'}
                        </td>
                        <td className="py-2 text-xs text-lhc-text-muted">
                          {c.grace_period_ends_at && (
                            <span className="text-amber-600">
                              Grace ends {format(new Date(c.grace_period_ends_at), 'dd MMM')}
                            </span>
                          )}
                          {c.service_suspended_at && (
                            <span className="text-red-600">
                              Suspended {format(new Date(c.service_suspended_at), 'dd MMM')}
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent invoices */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          {(recentInvoices ?? []).length === 0 ? (
            <p className="text-sm text-lhc-text-muted text-center py-4">No invoices yet.</p>
          ) : (
            <div className="space-y-2">
              {(recentInvoices ?? []).map(
                (inv: {
                  id: string
                  status: string
                  total: number
                  currency: string
                  created_at: string
                  hosted_invoice_url: string | null
                  clinics: { name: string } | null
                }) => (
                  <div
                    key={inv.id}
                    className="flex items-center justify-between border border-lhc-border rounded-lg p-3"
                  >
                    <div>
                      <span className="text-sm font-medium text-lhc-text-main">
                        {inv.clinics?.name ?? 'Unknown'}
                      </span>
                      <span className="text-xs text-lhc-text-muted ml-2">
                        {inv.created_at
                          ? format(new Date(inv.created_at), 'dd MMM yyyy')
                          : ''}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">
                        ${(inv.total / 100).toFixed(2)} {inv.currency?.toUpperCase()}
                      </span>
                      <Badge
                        variant={inv.status === 'paid' ? 'default' : 'destructive'}
                        className={inv.status === 'paid' ? 'bg-green-600' : ''}
                      >
                        {inv.status}
                      </Badge>
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
