'use client'

import { useState, useEffect } from 'react'
import { Loader2, DollarSign } from 'lucide-react'
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
import type { ClinicWithBilling } from '@/lib/hooks/useAdminClinics'

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
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
