'use client'

import { useState, useEffect } from 'react'
import { Loader2, DollarSign, Zap, RefreshCw, ExternalLink, ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { toast } from '@/lib/toast'
import {
  TAX_RATE,
  MODULE_LABELS,
  type ClinicBilling,
  type ClinicBillingHistory,
  type ClinicModuleSubscription,
} from '@/lib/hooks/useClinicBilling'
import { useStripeCustomer, type StripeCustomer, type StripeInvoice } from '@/lib/hooks/useStripeCustomer'
import type { ClinicWithBilling } from '@/lib/hooks/useAdminClinics'
import { format } from 'date-fns'

interface Props {
  clinic: ClinicWithBilling | null
  open: boolean
  onClose: () => void
}

export default function AdminClinicBilling({ clinic, open, onClose }: Props) {
  const queryClient = useQueryClient()
  const clinicId = clinic?.id ?? ''

  const [price, setPrice] = useState(0)
  const [freeAppts, setFreeAppts] = useState(0)
  const [notes, setNotes] = useState('')
  const [isActive, setIsActive] = useState(true)

  // Stripe data
  const { customer: stripeCustomer, invoices: stripeInvoices, isLoading: loadingStripe } =
    useStripeCustomer(clinicId)

  // Fetch billing data
  const { data: billing, isLoading: loadingBilling } = useQuery<ClinicBilling | null>({
    queryKey: ['clinic-billing', clinicId],
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('clinic_billing')
        .select('*')
        .eq('clinic_id', clinicId)
        .maybeSingle()
      if (error) throw error
      return data as ClinicBilling | null
    },
    enabled: !!clinicId && open,
  })

  const { data: history } = useQuery<ClinicBillingHistory[]>({
    queryKey: ['clinic-billing-history', clinicId],
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('clinic_billing_history')
        .select('*')
        .eq('clinic_id', clinicId)
        .order('created_at', { ascending: false })
        .limit(20)
      if (error) throw error
      return (data ?? []) as ClinicBillingHistory[]
    },
    enabled: !!clinicId && open,
  })

  const { data: monthlyBookings } = useQuery<number>({
    queryKey: ['clinic-monthly-bookings', clinicId],
    queryFn: async () => {
      const supabase = createClient()
      const startOfMonth = new Date()
      startOfMonth.setDate(1)
      startOfMonth.setHours(0, 0, 0, 0)
      const iso = startOfMonth.toISOString()

      const [r1, r2, r3] = await Promise.all([
        supabase.from('bookings').select('id', { count: 'exact', head: true }).eq('clinic_id', clinicId).gte('created_at', iso),
        supabase.from('centaur_bookings').select('id', { count: 'exact', head: true }).eq('clinic_id', clinicId).gte('created_at', iso),
        supabase.from('custom_api_bookings').select('id', { count: 'exact', head: true }).eq('clinic_id', clinicId).gte('created_at', iso),
      ])
      return (r1.count ?? 0) + (r2.count ?? 0) + (r3.count ?? 0)
    },
    enabled: !!clinicId && open,
  })

  const { data: moduleSubs } = useQuery<ClinicModuleSubscription[]>({
    queryKey: ['clinic-module-subscriptions', clinicId],
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('clinic_module_subscriptions')
        .select('*')
        .eq('clinic_id', clinicId)
      if (error) throw error
      return (data ?? []) as ClinicModuleSubscription[]
    },
    enabled: !!clinicId && open,
  })

  // Populate form when billing data loads
  useEffect(() => {
    if (billing) {
      setPrice(billing.price_per_appointment)
      setFreeAppts(billing.free_appointments_per_month ?? 0)
      setNotes(billing.notes ?? '')
      setIsActive(billing.is_active ?? true)
    } else {
      setPrice(0)
      setFreeAppts(0)
      setNotes('')
      setIsActive(true)
    }
  }, [billing])

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const supabase = createClient()
      const payload = {
        clinic_id: clinicId,
        price_per_appointment: price,
        free_appointments_per_month: freeAppts,
        notes: notes || null,
        is_active: isActive,
      }

      if (billing) {
        const { error } = await supabase
          .from('clinic_billing')
          .update(payload)
          .eq('id', billing.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('clinic_billing').insert(payload)
        if (error) throw error
      }
    },
    onSuccess: () => {
      toast.success('Billing updated successfully')
      queryClient.invalidateQueries({ queryKey: ['clinic-billing', clinicId] })
      queryClient.invalidateQueries({ queryKey: ['clinic-billing-history', clinicId] })
      queryClient.invalidateQueries({ queryKey: ['admin-clinics'] })
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] })
      onClose()
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to update billing')
    },
  })

  // Stripe setup mutation
  const setupStripeMutation = useMutation({
    mutationFn: async () => {
      // Step 1: Create customer
      const custRes = await fetch('/api/stripe/create-customer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clinicId }),
      })
      if (!custRes.ok) throw new Error((await custRes.json()).error)

      // Step 2: Create subscription with active modules
      const activeModuleKeys = (moduleSubs ?? [])
        .filter((m) => m.is_active)
        .map((m) => m.module_key)

      const subRes = await fetch('/api/stripe/create-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clinicId, moduleKeys: activeModuleKeys }),
      })
      if (!subRes.ok) throw new Error((await subRes.json()).error)
      return subRes.json()
    },
    onSuccess: () => {
      toast.success('Stripe billing set up successfully')
      queryClient.invalidateQueries({ queryKey: ['stripe-customer', clinicId] })
      queryClient.invalidateQueries({ queryKey: ['stripe-invoices', clinicId] })
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to set up Stripe billing')
    },
  })

  // Sync billing mutation
  const syncBillingMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/stripe/sync-billing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clinicId }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      return res.json()
    },
    onSuccess: (data) => {
      toast.success(`Synced ${data.invoices_synced} invoices`)
      queryClient.invalidateQueries({ queryKey: ['stripe-customer', clinicId] })
      queryClient.invalidateQueries({ queryKey: ['stripe-invoices', clinicId] })
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to sync billing')
    },
  })

  // Reconcile usage mutation
  const reconcileUsageMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/stripe/report-usage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clinicId }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      return res.json()
    },
    onSuccess: (data) => {
      toast.success(`Reconciled ${data.reconciled} bookings`)
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to reconcile usage')
    },
  })

  // Billing status override mutation
  const updateBillingStatusMutation = useMutation({
    mutationFn: async (status: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabase = createClient() as any
      const { error } = await supabase
        .from('clinics')
        .update({ billing_status: status })
        .eq('id', clinicId)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Billing status updated')
      queryClient.invalidateQueries({ queryKey: ['admin-clinics'] })
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to update billing status')
    },
  })

  // Invoice calculation
  const bookings = monthlyBookings ?? 0
  const chargeableBookings = Math.max(0, bookings - freeAppts)
  const appointmentCharges = chargeableBookings * price
  const activeModules = (moduleSubs ?? []).filter((m) => m.is_active)
  const moduleCharges = activeModules.reduce((sum, m) => sum + m.price_per_month, 0)
  const subtotal = appointmentCharges + moduleCharges
  const gst = subtotal * TAX_RATE
  const total = subtotal + gst

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Set Billing — {clinic?.name}</DialogTitle>
          <DialogDescription>Configure pricing and billing for this clinic.</DialogDescription>
        </DialogHeader>

        {loadingBilling ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-lhc-primary" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Price per Appointment (AUD)</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  value={price}
                  onChange={(e) => setPrice(Number(e.target.value))}
                />
              </div>
              <div>
                <Label>Free Appointments / Month</Label>
                <Input
                  type="number"
                  min={0}
                  value={freeAppts}
                  onChange={(e) => setFreeAppts(Number(e.target.value))}
                />
              </div>
            </div>

            <div>
              <Label>Admin Notes</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Internal notes..."
                rows={2}
              />
            </div>

            <div className="flex items-center gap-2">
              <Switch checked={isActive} onCheckedChange={setIsActive} />
              <Label>Billing Active</Label>
            </div>

            {/* Estimated invoice */}
            <Card className="border-green-200 bg-green-50">
              <CardContent className="pt-4 space-y-1 text-sm">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="w-4 h-4 text-green-600" />
                  <span className="font-semibold text-green-700">Estimated Monthly Invoice</span>
                </div>
                <div className="flex justify-between text-lhc-text-muted">
                  <span>Appointments: {chargeableBookings} × ${price.toFixed(2)}</span>
                  <span>${appointmentCharges.toFixed(2)}</span>
                </div>
                {activeModules.map((m) => (
                  <div key={m.id} className="flex justify-between text-lhc-text-muted">
                    <span>{MODULE_LABELS[m.module_key] ?? m.module_key}</span>
                    <span>${m.price_per_month.toFixed(2)}</span>
                  </div>
                ))}
                <div className="flex justify-between text-lhc-text-muted border-t border-green-200 pt-1">
                  <span>Subtotal</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lhc-text-muted">
                  <span>GST (10%)</span>
                  <span>${gst.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-green-700 border-t border-green-200 pt-1">
                  <span>Total</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Billing history */}
            {(history ?? []).length > 0 && (
              <div>
                <Label className="mb-2 block">Billing History</Label>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {history!.map((h) => (
                    <div key={h.id} className="flex items-center gap-2 text-xs text-lhc-text-muted">
                      <Badge variant="outline" className="text-xs">
                        ${h.previous_price?.toFixed(2) ?? '0.00'} → ${h.new_price.toFixed(2)}
                      </Badge>
                      <span>
                        {h.created_at ? new Date(h.created_at).toLocaleDateString() : ''}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Button
              className="w-full"
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Save Billing
            </Button>

            {/* Stripe Integration Section */}
            <div className="border-t border-lhc-border pt-4 mt-4 space-y-3">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-4 h-4 text-indigo-600" />
                <span className="font-semibold text-indigo-700 text-sm">Stripe Integration</span>
              </div>

              {loadingStripe ? (
                <div className="flex justify-center py-2">
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                </div>
              ) : !stripeCustomer ? (
                <div className="space-y-2">
                  <p className="text-xs text-lhc-text-muted">
                    No Stripe customer linked. Set up Stripe billing to enable payment collection.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full border-indigo-300 text-indigo-700 hover:bg-indigo-50"
                    onClick={() => setupStripeMutation.mutate()}
                    disabled={setupStripeMutation.isPending}
                  >
                    {setupStripeMutation.isPending && (
                      <Loader2 className="w-3 h-3 animate-spin mr-2" />
                    )}
                    Setup Stripe Billing
                  </Button>
                </div>
              ) : (
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-lhc-text-muted">Customer</span>
                    <span className="font-mono text-lhc-text-main">
                      {stripeCustomer.stripe_customer_id.slice(0, 18)}...
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-lhc-text-muted">Subscription</span>
                    <Badge
                      variant={
                        stripeCustomer.subscription_status === 'active'
                          ? 'default'
                          : stripeCustomer.subscription_status === 'past_due'
                            ? 'destructive'
                            : 'outline'
                      }
                      className={
                        stripeCustomer.subscription_status === 'active' ? 'bg-green-600' : ''
                      }
                    >
                      {stripeCustomer.subscription_status ?? 'none'}
                    </Badge>
                  </div>
                  {stripeCustomer.current_period_end && (
                    <div className="flex justify-between">
                      <span className="text-lhc-text-muted">Next billing</span>
                      <span className="text-lhc-text-main">
                        {format(new Date(stripeCustomer.current_period_end), 'dd MMM yyyy')}
                      </span>
                    </div>
                  )}
                  {stripeCustomer.grace_period_ends_at && (
                    <div className="flex justify-between text-amber-600">
                      <span>Grace period ends</span>
                      <span>{format(new Date(stripeCustomer.grace_period_ends_at), 'dd MMM yyyy')}</span>
                    </div>
                  )}
                  {stripeCustomer.service_suspended_at && (
                    <div className="flex justify-between text-red-600">
                      <span>Suspended since</span>
                      <span>{format(new Date(stripeCustomer.service_suspended_at), 'dd MMM yyyy')}</span>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex gap-2 pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-xs"
                      onClick={() => syncBillingMutation.mutate()}
                      disabled={syncBillingMutation.isPending}
                    >
                      {syncBillingMutation.isPending ? (
                        <Loader2 className="w-3 h-3 animate-spin mr-1" />
                      ) : (
                        <RefreshCw className="w-3 h-3 mr-1" />
                      )}
                      Sync
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-xs"
                      onClick={() => reconcileUsageMutation.mutate()}
                      disabled={reconcileUsageMutation.isPending}
                    >
                      {reconcileUsageMutation.isPending ? (
                        <Loader2 className="w-3 h-3 animate-spin mr-1" />
                      ) : null}
                      Reconcile Usage
                    </Button>
                  </div>

                  {/* Billing status override */}
                  <div className="flex items-center gap-2 pt-1">
                    <ShieldAlert className="w-3 h-3 text-lhc-text-muted" />
                    <span className="text-lhc-text-muted">Override:</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs h-6 px-2"
                      onClick={() => updateBillingStatusMutation.mutate('exempt')}
                    >
                      Exempt
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs h-6 px-2"
                      onClick={() => updateBillingStatusMutation.mutate('active')}
                    >
                      Active
                    </Button>
                  </div>

                  {/* Recent invoices */}
                  {stripeInvoices.length > 0 && (
                    <div className="pt-2">
                      <Label className="text-xs mb-1 block">Recent Invoices</Label>
                      <div className="space-y-1 max-h-24 overflow-y-auto">
                        {stripeInvoices.slice(0, 5).map((inv) => (
                          <div key={inv.id} className="flex items-center justify-between text-xs">
                            <span className="text-lhc-text-muted">
                              {inv.created_at
                                ? format(new Date(inv.created_at), 'dd MMM yyyy')
                                : '—'}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">
                                ${(inv.total / 100).toFixed(2)}
                              </span>
                              <Badge
                                variant={inv.status === 'paid' ? 'default' : 'destructive'}
                                className={`text-xs ${inv.status === 'paid' ? 'bg-green-600' : ''}`}
                              >
                                {inv.status}
                              </Badge>
                              {inv.hosted_invoice_url && (
                                <a
                                  href={inv.hosted_invoice_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <ExternalLink className="w-3 h-3 text-indigo-500" />
                                </a>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
