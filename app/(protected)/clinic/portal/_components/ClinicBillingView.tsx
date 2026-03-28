'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
  ExternalLink,
  FileText,
  Download,
  ShieldAlert,
} from 'lucide-react'
import { useClinicBillingView, MODULE_LABELS, TAX_RATE } from '@/lib/hooks/useClinicBilling'
import { useStripeCustomer } from '@/lib/hooks/useStripeCustomer'
import { format } from 'date-fns'

export default function ClinicBillingView({ clinicId }: { clinicId: string }) {
  const { billing, history, moduleSubscriptions, monthlyBookings, isLoading, error } =
    useClinicBillingView(clinicId)
  const {
    customer: stripeCustomer,
    invoices: stripeInvoices,
    isLoading: loadingStripe,
  } = useStripeCustomer(clinicId)
  const [portalLoading, setPortalLoading] = useState(false)

  const openCustomerPortal = async () => {
    setPortalLoading(true)
    try {
      const res = await fetch('/api/stripe/customer-portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clinicId }),
      })
      const data = await res.json()
      if (data.url) {
        window.open(data.url, '_blank')
      } else {
        console.error('No portal URL returned:', data.error)
      }
    } catch (err) {
      console.error('Failed to open customer portal:', err)
    } finally {
      setPortalLoading(false)
    }
  }

  if ((isLoading || loadingStripe) && !billing) {
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
  const isGracePeriod = !!stripeCustomer?.grace_period_ends_at && !stripeCustomer?.service_suspended_at
  const isSuspended = !!stripeCustomer?.service_suspended_at
  const isSetupRequired =
    stripeCustomer && stripeCustomer.subscription_status === 'incomplete'

  const freeAppointments = billing.free_appointments_per_month ?? 0
  const pricePerAppointment = billing.price_per_appointment
  const totalBookings = monthlyBookings.total
  const hasMultipleSources = monthlyBookings.centaur > 0 || monthlyBookings.customApi > 0
  const chargeableBookings = Math.max(0, totalBookings - freeAppointments)
  const activeModules = moduleSubscriptions.filter((m) => m.is_active)
  const appointmentSubtotal = chargeableBookings * pricePerAppointment
  const moduleSubtotal = activeModules.reduce((sum, m) => sum + m.price_per_month, 0)
  const subtotal = appointmentSubtotal + moduleSubtotal
  const tax = subtotal * TAX_RATE
  const total = subtotal + tax
  const currency = billing.currency ?? 'AUD'

  const fmt = (n: number) => `${currency} $${n.toFixed(2)}`

  const openInvoices = stripeInvoices.filter((inv) => inv.status === 'open')
  const paidInvoices = stripeInvoices.filter((inv) => inv.status === 'paid')

  return (
    <div className="space-y-6">
      {/* Suspended banner */}
      {isSuspended && (
        <Card className="border-red-300 bg-red-50">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-red-800 font-semibold">Service Suspended</p>
                <p className="text-xs text-red-700 mt-1">
                  Your billing payment is overdue. Some features including appointment booking
                  have been restricted. Please update your payment method to restore full access.
                </p>
                <Button
                  size="sm"
                  className="mt-2 bg-red-600 hover:bg-red-700"
                  onClick={openCustomerPortal}
                  disabled={portalLoading}
                >
                  {portalLoading && <Loader2 className="w-3 h-3 animate-spin mr-2" />}
                  Update Payment Method
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Grace period banner */}
      {isGracePeriod && !isSuspended && (
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-amber-800 font-semibold">Payment Overdue</p>
                <p className="text-xs text-amber-700 mt-1">
                  Your recent payment failed. Please update your payment method before{' '}
                  <strong>
                    {stripeCustomer?.grace_period_ends_at
                      ? format(new Date(stripeCustomer.grace_period_ends_at), 'dd MMM yyyy')
                      : 'the grace period ends'}
                  </strong>{' '}
                  to avoid service interruption.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-2 border-amber-400 text-amber-800 hover:bg-amber-100"
                  onClick={openCustomerPortal}
                  disabled={portalLoading}
                >
                  {portalLoading && <Loader2 className="w-3 h-3 animate-spin mr-2" />}
                  Update Payment Method
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Setup required banner */}
      {isSetupRequired && !isSuspended && !isGracePeriod && (
        <Card className="border-indigo-300 bg-indigo-50">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-start gap-3">
              <CreditCard className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-indigo-800 font-semibold">Payment Method Required</p>
                <p className="text-xs text-indigo-700 mt-1">
                  Your billing subscription is set up but requires a payment method. Please add
                  a payment method to activate your subscription.
                </p>
                <Button
                  size="sm"
                  className="mt-2 bg-indigo-600 hover:bg-indigo-700"
                  onClick={openCustomerPortal}
                  disabled={portalLoading}
                >
                  {portalLoading && <Loader2 className="w-3 h-3 animate-spin mr-2" />}
                  Add Payment Method
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Inactive billing banner */}
      {billingInactive && !isSuspended && !isGracePeriod && !isSetupRequired && (
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

      {/* Section 1: Subscription Status + Billing Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stripeCustomer ? (
          <Card>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-3">
                <CreditCard className="w-5 h-5 text-lhc-primary shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-lhc-text-muted">Subscription Status</p>
                  <Badge
                    variant={
                      stripeCustomer.subscription_status === 'active'
                        ? 'default'
                        : stripeCustomer.subscription_status === 'past_due'
                          ? 'destructive'
                          : 'outline'
                    }
                    className={`mt-1 ${stripeCustomer.subscription_status === 'active' ? 'bg-green-600' : ''}`}
                  >
                    {stripeCustomer.subscription_status}
                  </Badge>
                  {stripeCustomer.current_period_end && (
                    <p className="text-xs text-lhc-text-muted mt-1">
                      Next billing: {format(new Date(stripeCustomer.current_period_end), 'dd MMM yyyy')}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
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
        )}

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
                <p className="text-xs text-lhc-text-muted">Payment Method</p>
                {stripeCustomer ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-1"
                    onClick={openCustomerPortal}
                    disabled={portalLoading}
                  >
                    {portalLoading ? (
                      <Loader2 className="w-3 h-3 animate-spin mr-2" />
                    ) : (
                      <ExternalLink className="w-3 h-3 mr-2" />
                    )}
                    Manage Payment
                  </Button>
                ) : (
                  <p className="text-sm text-lhc-text-muted mt-1">Not configured</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Section 2: Open Invoices (Pay Now) */}
      {openInvoices.length > 0 && (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-red-700 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Outstanding Invoices
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {openInvoices.map((inv) => (
                <div
                  key={inv.id}
                  className="flex items-center justify-between border border-red-200 rounded-lg p-3 bg-red-50"
                >
                  <div>
                    <span className="text-sm font-medium text-lhc-text-main">
                      ${(inv.total / 100).toFixed(2)} {inv.currency?.toUpperCase()}
                    </span>
                    {inv.period_start && inv.period_end && (
                      <p className="text-xs text-lhc-text-muted">
                        {format(new Date(inv.period_start), 'dd MMM')} –{' '}
                        {format(new Date(inv.period_end), 'dd MMM yyyy')}
                      </p>
                    )}
                  </div>
                  {inv.hosted_invoice_url && (
                    <Button
                      size="sm"
                      className="bg-red-600 hover:bg-red-700"
                      onClick={() => window.open(inv.hosted_invoice_url!, '_blank')}
                    >
                      Pay Now
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Section 3: Current Period Usage (existing breakdown) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lhc-text-main flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-lhc-primary" />
            Current Period Usage
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-lhc-text-muted">Total bookings this period</span>
              <span className="text-lhc-text-main font-medium">{totalBookings}</span>
            </div>
            {hasMultipleSources && (
              <>
                <div className="flex justify-between pl-4">
                  <span className="text-xs text-lhc-text-muted">Standard bookings</span>
                  <span className="text-xs text-lhc-text-main">{monthlyBookings.standard}</span>
                </div>
                <div className="flex justify-between pl-4">
                  <span className="text-xs text-lhc-text-muted">Centaur bookings</span>
                  <span className="text-xs text-lhc-text-main">{monthlyBookings.centaur}</span>
                </div>
                <div className="flex justify-between pl-4">
                  <span className="text-xs text-lhc-text-muted">Custom API bookings</span>
                  <span className="text-xs text-lhc-text-main">{monthlyBookings.customApi}</span>
                </div>
              </>
            )}
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
                Estimated Charges
              </span>
              <span className="text-lhc-text-main font-bold text-base">{fmt(total)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 4: Invoice History (Stripe) */}
      {paidInvoices.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lhc-text-main flex items-center gap-2">
              <FileText className="w-5 h-5 text-lhc-primary" />
              Invoice History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {paidInvoices.map((inv) => (
                <div
                  key={inv.id}
                  className="flex items-center justify-between border border-lhc-border rounded-lg p-3 bg-lhc-surface"
                >
                  <div>
                    <span className="text-sm font-medium text-lhc-text-main">
                      ${(inv.total / 100).toFixed(2)} {inv.currency?.toUpperCase()}
                    </span>
                    {inv.period_start && inv.period_end && (
                      <p className="text-xs text-lhc-text-muted">
                        {format(new Date(inv.period_start), 'dd MMM')} –{' '}
                        {format(new Date(inv.period_end), 'dd MMM yyyy')}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="default" className="bg-green-600">
                      Paid
                    </Badge>
                    {inv.hosted_invoice_url && (
                      <a
                        href={inv.hosted_invoice_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-lhc-primary hover:text-lhc-primary/80"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                    {inv.invoice_pdf && (
                      <a
                        href={inv.invoice_pdf}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-lhc-primary hover:text-lhc-primary/80"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Section 5: Active Module Subscriptions */}
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
                  <div className="min-w-0">
                    <span className="text-sm font-medium text-lhc-text-main">
                      {MODULE_LABELS[m.module_key] ?? m.module_key}
                    </span>
                    {m.activated_at && (
                      <p className="text-xs text-lhc-text-muted">
                        Active since {format(new Date(m.activated_at), 'dd MMM yyyy')}
                      </p>
                    )}
                  </div>
                  <Badge variant="outline">
                    {currency} ${m.price_per_month.toFixed(2)}/mo
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 6: Rate Changes History */}
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
              {history.length === 10 && (
                <p className="text-xs text-lhc-text-muted text-center pt-1">
                  Showing last 10 changes
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 7: Contact Support */}
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
