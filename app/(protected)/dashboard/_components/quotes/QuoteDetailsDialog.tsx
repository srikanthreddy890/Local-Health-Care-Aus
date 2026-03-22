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
import { REQUEST_TYPE_LABELS, PAYMENT_LABELS, formatCurrencyOrDash as formatCurrency, formatDate, timeAgo } from '@/lib/constants/quotes'

interface Props {
  quote: QuoteRequest
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdateStatus: (quoteId: string, status: string) => Promise<boolean>
  onBookAppointment: (clinicId: string, serviceName?: string) => void
}

export default function QuoteDetailsDialog({ quote, open, onOpenChange, onUpdateStatus, onBookAppointment }: Props) {
  const [isUpdating, setIsUpdating] = useState(false)
  const [confirmCancel, setConfirmCancel] = useState(false)

  async function handleStatusChange(status: string) {
    setIsUpdating(true)
    const ok = await onUpdateStatus(quote.id, status)
    setIsUpdating(false)
    if (ok) {
      if (status === 'accepted') {
        onBookAppointment(quote.clinic_id, quote.service_name)
      }
      onOpenChange(false)
    }
  }

  const isResponded = quote.status === 'responded'
  const isPending = quote.status === 'pending' || quote.status === 'in_review'
  const hasClinicResponse = ['responded', 'accepted', 'declined'].includes(quote.status) && quote.estimated_cost != null
  const isQuoteExpired = quote.valid_until ? new Date(quote.valid_until) < new Date() : false
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
          {hasClinicResponse && (
            <div className="rounded-lg border border-lhc-primary/20 bg-lhc-primary/5 p-4 space-y-3">
              <p className="text-xs font-semibold text-lhc-text-muted uppercase tracking-wide flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-lhc-primary" />Clinic Response
              </p>
              {/* Cost breakdown */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-center">
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
              {isQuoteExpired && (
                <div className="rounded-md border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-800 p-3 flex gap-2">
                  <Clock className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-red-800 dark:text-red-300">Quote Expired</p>
                    <p className="text-xs text-red-700 dark:text-red-400 mt-0.5">
                      This quote was valid until {formatDate(quote.valid_until)} and can no longer be accepted.
                    </p>
                  </div>
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
          {isPending && !confirmCancel && (
            <Button
              variant="destructive"
              size="sm"
              disabled={isUpdating}
              onClick={() => setConfirmCancel(true)}
              aria-label="Cancel this quote request"
            >
              <XCircle className="w-4 h-4" />Cancel Request
            </Button>
          )}
          {isPending && confirmCancel && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-lhc-text-muted">Are you sure?</span>
              <Button
                variant="destructive"
                size="sm"
                disabled={isUpdating}
                onClick={() => handleStatusChange('cancelled')}
              >
                Yes, Cancel
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmCancel(false)}
              >
                No
              </Button>
            </div>
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
                disabled={isUpdating || isQuoteExpired}
                onClick={() => handleStatusChange('accepted')}
                title={isQuoteExpired ? 'This quote has expired' : undefined}
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
