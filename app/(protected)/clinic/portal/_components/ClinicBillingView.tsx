'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  CreditCard,
  DollarSign,
  Gift,
  CalendarDays,
  Package,
  History,
  Headphones,
  Loader2,
  AlertCircle,
  ArrowRight,
} from 'lucide-react'
import { useClinicBillingView, MODULE_LABELS, TAX_RATE } from '@/lib/hooks/useClinicBilling'
import { format } from 'date-fns'

export default function ClinicBillingView({ clinicId }: { clinicId: string }) {
  const { billing, history, moduleSubscriptions, monthlyBookings, isLoading, error } =
    useClinicBillingView(clinicId)

  if (isLoading && !billing) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-lhc-primary" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 text-sm text-red-600 py-8 justify-center">
        <AlertCircle className="w-4 h-4 shrink-0" />
        <span>Failed to load billing data. Please refresh and try again.</span>
      </div>
    )
  }

  if (!billing) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <CreditCard className="w-10 h-10 text-lhc-text-muted mx-auto mb-3 opacity-40" />
            <p className="text-lhc-text-muted text-sm">
              Billing has not been configured for this clinic yet.
              <br />
              Please contact our support team for setup.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const billingInactive = billing.is_active === false

  const freeAppointments = billing.free_appointments_per_month ?? 0
  const pricePerAppointment = billing.price_per_appointment
  const chargeableBookings = Math.max(0, monthlyBookings - freeAppointments)
  const activeModules = moduleSubscriptions.filter((m) => m.is_active)
  const appointmentSubtotal = chargeableBookings * pricePerAppointment
  const moduleSubtotal = activeModules.reduce((sum, m) => sum + m.price_per_month, 0)
  const subtotal = appointmentSubtotal + moduleSubtotal
  const tax = subtotal * TAX_RATE
  const total = subtotal + tax
  const currency = billing.currency ?? 'AUD'

  const fmt = (n: number) => `${currency} $${n.toFixed(2)}`

  return (
    <div className="space-y-6">
      {/* Inactive billing banner */}
      {billingInactive && (
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <p className="text-sm text-amber-800 font-medium">
                Billing is currently inactive for this clinic. Contact support for details.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Section 1: Billing Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <DollarSign className="w-5 h-5 text-lhc-primary shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-lhc-text-muted">Price per Appointment</p>
                <p className="text-xl font-bold text-lhc-text-main">
                  {currency} ${pricePerAppointment.toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <Gift className="w-5 h-5 text-lhc-primary shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-lhc-text-muted">Free Appointments / Month</p>
                <p className="text-xl font-bold text-lhc-text-main">{freeAppointments}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <CalendarDays className="w-5 h-5 text-lhc-primary shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-lhc-text-muted">Billing Cycle</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="text-xl font-bold text-lhc-text-main capitalize">
                    {billing.billing_cycle}
                  </p>
                  <Badge variant="outline">{currency}</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Section 2: This Month's Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lhc-text-main flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-lhc-primary" />
            This Month&apos;s Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-lhc-text-muted">Total bookings this month</span>
              <span className="text-lhc-text-main font-medium">{monthlyBookings}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-lhc-text-muted">Free tier allowance</span>
              <span className="text-lhc-text-main font-medium">
                {freeAppointments > 0 ? `-${freeAppointments}` : '0'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-lhc-text-muted">Chargeable bookings</span>
              <span className="text-lhc-text-main font-medium">{chargeableBookings}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-lhc-text-muted">
                Appointment charges ({chargeableBookings} &times; ${pricePerAppointment.toFixed(2)})
              </span>
              <span className="text-lhc-text-main font-medium">{fmt(appointmentSubtotal)}</span>
            </div>
            {moduleSubtotal > 0 && (
              <div className="flex justify-between">
                <span className="text-lhc-text-muted">Module subscriptions</span>
                <span className="text-lhc-text-main font-medium">{fmt(moduleSubtotal)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-lhc-text-muted">Subtotal</span>
              <span className="text-lhc-text-main font-medium">{fmt(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-lhc-text-muted">GST (10%)</span>
              <span className="text-lhc-text-main font-medium">{fmt(tax)}</span>
            </div>
            <div className="flex justify-between border-t border-lhc-border pt-2 mt-2">
              <span className="text-lhc-text-main font-bold text-base">
                Total Estimated Charges
              </span>
              <span className="text-lhc-text-main font-bold text-base">{fmt(total)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 3: Active Module Subscriptions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lhc-text-main flex items-center gap-2">
            <Package className="w-5 h-5 text-lhc-primary" />
            Active Module Subscriptions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activeModules.length === 0 ? (
            <p className="text-lhc-text-muted text-sm text-center py-4">
              No active module subscriptions.
            </p>
          ) : (
            <div className="space-y-2">
              {activeModules.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between border border-lhc-border rounded-lg p-3 bg-lhc-surface"
                >
                  <span className="text-sm font-medium text-lhc-text-main">
                    {MODULE_LABELS[m.module_key] ?? m.module_key}
                  </span>
                  <Badge variant="outline">
                    {currency} ${m.price_per_month.toFixed(2)}/mo
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 4: Billing History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lhc-text-main flex items-center gap-2">
            <History className="w-5 h-5 text-lhc-primary" />
            Rate Changes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="text-lhc-text-muted text-sm text-center py-4">
              No rate changes recorded.
            </p>
          ) : (
            <div className="space-y-3">
              {history.map((h) => (
                <div
                  key={h.id}
                  className="border border-lhc-border rounded-lg p-3 bg-lhc-surface"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-lhc-text-muted">
                      {h.created_at
                        ? format(new Date(h.created_at), 'dd MMM yyyy, HH:mm')
                        : '—'}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <Badge variant="outline">
                        ${h.previous_price?.toFixed(2) ?? '—'}
                      </Badge>
                      <ArrowRight className="w-3 h-3 text-lhc-text-muted" />
                      <Badge variant="secondary">
                        ${h.new_price.toFixed(2)}
                      </Badge>
                    </div>
                  </div>
                  {h.previous_free_appointments !== h.new_free_appointments &&
                    h.new_free_appointments != null && (
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <span className="text-xs text-lhc-text-muted">Free tier:</span>
                        <Badge variant="outline" className="text-xs">
                          {h.previous_free_appointments ?? '—'}
                        </Badge>
                        <ArrowRight className="w-3 h-3 text-lhc-text-muted" />
                        <Badge variant="secondary" className="text-xs">
                          {h.new_free_appointments}
                        </Badge>
                      </div>
                    )}
                  {h.change_reason && (
                    <p className="text-xs text-lhc-text-muted mt-1.5">{h.change_reason}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 5: Contact Support */}
      <Card className="bg-lhc-surface border-lhc-border">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Headphones className="w-5 h-5 text-lhc-primary shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-lhc-text-main mb-1">Need to update your billing?</h3>
              <p className="text-sm text-lhc-text-muted">
                To make changes to your billing plan, please contact our support team.
                Billing adjustments including pricing, free tier allowances, and module
                subscriptions are managed by our administrators.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
