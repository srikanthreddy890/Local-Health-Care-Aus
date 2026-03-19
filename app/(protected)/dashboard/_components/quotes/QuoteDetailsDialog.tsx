'use client'

import { useState } from 'react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Phone, Clock, AlertCircle, CheckCircle, XCircle, CalendarDays, CreditCard, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { QuoteRequest } from '@/lib/hooks/useQuoteRequests'

const REQUEST_TYPE_LABELS: Record<string, string> = {
  general: 'General Enquiry',
  treatment_plan: 'Treatment Plan',
  insurance_estimate: 'Insurance Estimate',
  procedure_quote: 'Procedure Quote',
  other: 'Other',
}

const PAYMENT_LABELS: Record<string, string> = {
  upfront: 'Upfront Payment',
  payment_plan: 'Payment Plan',
  health_fund: 'Health Fund',
  mixed: 'Mixed Options',
}

function formatCurrency(n?: number | null) {
  if (n == null) return '—'
  return `$${Number(n).toFixed(2)}`
}

function formatDate(d?: string | null) {
  if (!d) return null
  return new Date(d).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

interface Props {
  quote: QuoteRequest
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdateStatus: (quoteId: string, status: string) => Promise<boolean>
  onBookAppointment: (clinicId: string) => void
}

export default function QuoteDetailsDialog({ quote, open, onOpenChange, onUpdateStatus, onBookAppointment }: Props) {
  const [isUpdating, setIsUpdating] = useState(false)

  async function handleStatusChange(status: string) {
    setIsUpdating(true)
    const ok = await onUpdateStatus(quote.id, status)
    setIsUpdating(false)
    if (ok) {
      if (status === 'accepted') {
        onBookAppointment(quote.clinic_id)
      }
      onOpenChange(false)
    }
  }

  const isResponded = quote.status === 'responded'
  const isPending = quote.status === 'pending' || quote.status === 'in_review'
  const canAct = isResponded || isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="pr-6">Quote Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Clinic Info */}
          {quote.clinic && (
            <div className="rounded-lg border border-lhc-border bg-lhc-background p-4 space-y-1">
              <p className="font-semibold text-lhc-text-main">{quote.clinic.name}</p>
              {quote.clinic.phone && (
                <p className="text-sm text-lhc-text-muted flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5" />{quote.clinic.phone}
                </p>
              )}
            </div>
          )}

          {/* Request Details */}
          <div className="rounded-lg border border-lhc-border bg-lhc-background p-4 space-y-3">
            <p className="text-xs font-semibold text-lhc-text-muted uppercase tracking-wide">Request Details</p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-lhc-text-muted text-xs">Service</p>
                <p className="text-lhc-text-main font-medium">{quote.service_name}</p>
              </div>
              <div>
                <p className="text-lhc-text-muted text-xs">Quote Type</p>
                <p className="text-lhc-text-main">{REQUEST_TYPE_LABELS[quote.request_type] ?? quote.request_type}</p>
              </div>
              <div>
                <p className="text-lhc-text-muted text-xs">Urgency</p>
                <Badge variant={quote.urgency === 'urgent' ? 'destructive' : 'outline'} className="text-xs capitalize">
                  {quote.urgency}
                </Badge>
              </div>
              <div>
                <p className="text-lhc-text-muted text-xs">Requested</p>
                <p className="text-lhc-text-main flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-lhc-text-muted" />
                  {timeAgo(quote.created_at)}
                </p>
              </div>
              {quote.preferred_date && (
                <div>
                  <p className="text-lhc-text-muted text-xs">Preferred Date</p>
                  <p className="text-lhc-text-main flex items-center gap-1">
                    <CalendarDays className="w-3.5 h-3.5 text-lhc-text-muted" />
                    {formatDate(quote.preferred_date)}
                  </p>
                </div>
              )}
            </div>
            {quote.patient_notes && (
              <div className="rounded-md bg-lhc-surface p-3">
                <p className="text-xs text-lhc-text-muted mb-1">Your notes</p>
                <p className="text-sm text-lhc-text-main">{quote.patient_notes}</p>
              </div>
            )}
          </div>

          {/* Clinic Response */}
          {isResponded && (
            <div className="rounded-lg border border-lhc-primary/20 bg-lhc-primary/5 p-4 space-y-3">
              <p className="text-xs font-semibold text-lhc-text-muted uppercase tracking-wide flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-lhc-primary" />Clinic Response
              </p>
              {/* Cost breakdown */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-lhc-surface border border-lhc-border p-3">
                  <p className="text-xs text-lhc-text-muted">Estimated Cost</p>
                  <p className="text-base font-bold text-lhc-text-main mt-0.5">
                    {formatCurrency(quote.estimated_cost)}
                  </p>
                </div>
                <div className="rounded-lg bg-lhc-surface border border-lhc-border p-3">
                  <p className="text-xs text-lhc-text-muted">Rebate</p>
                  <p className="text-base font-bold text-green-600 mt-0.5">{formatCurrency(quote.estimated_rebate)}</p>
                </div>
                <div className="rounded-lg bg-lhc-surface border border-lhc-border p-3">
                  <p className="text-xs text-lhc-text-muted">Your Gap</p>
                  <p className="text-base font-bold text-lhc-primary mt-0.5">{formatCurrency(quote.estimated_gap)}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {quote.valid_until && (
                  <div>
                    <p className="text-lhc-text-muted text-xs">Valid Until</p>
                    <p className="text-lhc-text-main">{formatDate(quote.valid_until)}</p>
                  </div>
                )}
                {quote.payment_options && (
                  <div>
                    <p className="text-lhc-text-muted text-xs">Payment</p>
                    <p className="text-lhc-text-main flex items-center gap-1">
                      <CreditCard className="w-3.5 h-3.5" />
                      {PAYMENT_LABELS[quote.payment_options] ?? quote.payment_options}
                    </p>
                  </div>
                )}
              </div>
              {quote.clinic_notes && (
                <div>
                  <p className="text-xs text-lhc-text-muted mb-1 flex items-center gap-1">
                    <FileText className="w-3 h-3" />Clinic notes
                  </p>
                  <p className="text-sm text-lhc-text-main bg-lhc-surface border border-lhc-border rounded-md p-2.5">
                    {quote.clinic_notes}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Awaiting response */}
          {isPending && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 p-4 flex gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-800 dark:text-amber-300">Awaiting Response</p>
                <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                  The clinic will respond to your request soon.
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className={cn(!canAct && 'pt-4')}>
          {isPending && (
            <Button
              variant="destructive"
              size="sm"
              disabled={isUpdating}
              onClick={() => handleStatusChange('cancelled')}
            >
              <XCircle className="w-4 h-4" />Cancel Request
            </Button>
          )}
          {isResponded && (
            <>
              <Button
                variant="outline"
                size="sm"
                disabled={isUpdating}
                onClick={() => handleStatusChange('declined')}
              >
                <XCircle className="w-4 h-4" />Decline
              </Button>
              <Button
                size="sm"
                disabled={isUpdating}
                onClick={() => handleStatusChange('accepted')}
              >
                <CheckCircle className="w-4 h-4" />Accept Quote &amp; Book
              </Button>
            </>
          )}
          {!canAct && (
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
