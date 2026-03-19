'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  DollarSign, Clock, AlertCircle, CheckCircle, XCircle,
  RefreshCw, Loader2, User, Phone, CalendarDays, FileText, CreditCard,
} from 'lucide-react'
import { useClinicQuotes, type QuoteRequest, type RespondToQuoteData } from '@/lib/hooks/useQuoteRequests'
import { createClient } from '@/lib/supabase/client'
import { toast } from '@/lib/toast'
import { cn } from '@/lib/utils'

// ── Status config ─────────────────────────────────────────────────────────────
type StatusCfg = { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive'; Icon: React.ElementType }
const STATUS: Record<string, StatusCfg> = {
  pending:   { label: 'Pending',        variant: 'outline',     Icon: Clock },
  in_review: { label: 'In Review',      variant: 'secondary',   Icon: AlertCircle },
  responded: { label: 'Responded',      variant: 'default',     Icon: CheckCircle },
  accepted:  { label: 'Accepted',       variant: 'default',     Icon: CheckCircle },
  declined:  { label: 'Declined',       variant: 'destructive', Icon: XCircle },
  expired:   { label: 'Expired',        variant: 'secondary',   Icon: Clock },
  cancelled: { label: 'Cancelled',      variant: 'destructive', Icon: XCircle },
}

const REQUEST_TYPE_LABELS: Record<string, string> = {
  general: 'General Enquiry',
  treatment_plan: 'Treatment Plan',
  insurance_estimate: 'Insurance Estimate',
  procedure_quote: 'Procedure Quote',
  other: 'Other',
}

const PAYMENT_OPTIONS = [
  { value: 'upfront',       label: 'Upfront Payment' },
  { value: 'payment_plan',  label: 'Payment Plan' },
  { value: 'health_fund',   label: 'Health Fund' },
  { value: 'mixed',         label: 'Mixed Options' },
]

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function formatDate(d?: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ── Respond Dialog ────────────────────────────────────────────────────────────
interface RespondDialogProps {
  quote: QuoteRequest
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (quoteId: string, data: RespondToQuoteData, respondedBy: string) => Promise<boolean>
}

function RespondDialog({ quote, open, onOpenChange, onSubmit }: RespondDialogProps) {
  // Pre-fill with existing values so "Update Response" shows current data
  const [estimatedCost, setEstimatedCost] = useState(quote.estimated_cost?.toString() ?? '')
  const [estimatedRebate, setEstimatedRebate] = useState(quote.estimated_rebate?.toString() ?? '')
  const [estimatedGap, setEstimatedGap] = useState(quote.estimated_gap?.toString() ?? '')
  const [validUntil, setValidUntil] = useState(quote.valid_until ?? '')
  const [paymentOptions, setPaymentOptions] = useState(quote.payment_options ?? '')
  const [clinicNotes, setClinicNotes] = useState(quote.clinic_notes ?? '')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Auto-calculate gap when cost and rebate change
  function handleCostOrRebateChange(cost: string, rebate: string) {
    const c = parseFloat(cost)
    const r = parseFloat(rebate)
    if (!isNaN(c) && !isNaN(r)) {
      setEstimatedGap(Math.max(0, c - r).toFixed(2))
    }
  }

  async function handleSubmit() {
    const cost = parseFloat(estimatedCost)
    if (isNaN(cost)) return
    setIsSubmitting(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      toast({ title: 'Session expired', description: 'Please reload the page and try again.', variant: 'destructive' })
      setIsSubmitting(false)
      return
    }
    const ok = await onSubmit(quote.id, {
      estimated_cost: cost,
      estimated_rebate: estimatedRebate ? parseFloat(estimatedRebate) : null,
      estimated_gap: estimatedGap ? parseFloat(estimatedGap) : null,
      valid_until: validUntil || null,
      payment_options: paymentOptions || null,
      clinic_notes: clinicNotes || null,
    }, user.id)
    setIsSubmitting(false)
    if (ok) {
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Respond to Quote Request</DialogTitle>
        </DialogHeader>

        {/* Patient + request summary */}
        <div className="rounded-lg border border-lhc-border bg-lhc-background p-3 space-y-1 text-sm">
          <p className="font-medium text-lhc-text-main">
            {quote.patient?.first_name} {quote.patient?.last_name}
          </p>
          {quote.patient?.phone && (
            <p className="text-lhc-text-muted flex items-center gap-1">
              <Phone className="w-3.5 h-3.5" />{quote.patient.phone}
            </p>
          )}
          <p className="text-lhc-text-muted">{quote.service_name} · {REQUEST_TYPE_LABELS[quote.request_type] ?? quote.request_type}</p>
          {quote.preferred_date && (
            <p className="text-lhc-text-muted flex items-center gap-1">
              <CalendarDays className="w-3.5 h-3.5" />Preferred: {formatDate(quote.preferred_date)}
            </p>
          )}
          {quote.patient_notes && (
            <p className="text-lhc-text-muted italic mt-1">"{quote.patient_notes}"</p>
          )}
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs mb-1 block">Estimated Cost *</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={estimatedCost}
                onChange={(e) => {
                  setEstimatedCost(e.target.value)
                  handleCostOrRebateChange(e.target.value, estimatedRebate)
                }}
              />
            </div>
            <div>
              <Label className="text-xs mb-1 block">Rebate</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={estimatedRebate}
                onChange={(e) => {
                  setEstimatedRebate(e.target.value)
                  handleCostOrRebateChange(estimatedCost, e.target.value)
                }}
              />
            </div>
            <div>
              <Label className="text-xs mb-1 block">Gap (out-of-pocket)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={estimatedGap}
                onChange={(e) => setEstimatedGap(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs mb-1 block">Quote Valid Until</Label>
              <Input
                type="date"
                value={validUntil}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => setValidUntil(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs mb-1 block">Payment Options</Label>
              <Select value={paymentOptions} onValueChange={setPaymentOptions}>
                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  {PAYMENT_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-xs mb-1 block">Clinic Notes (optional)</Label>
            <Textarea
              placeholder="Any additional information for the patient…"
              value={clinicNotes}
              onChange={(e) => setClinicNotes(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !estimatedCost}>
            {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" />Sending…</> : 'Send Quote'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function QuoteRequestsTab({ clinicId }: { clinicId: string }) {
  const { quotes, loading, refetch, respondToQuote, updateQuoteStatus } = useClinicQuotes(clinicId)
  const [selectedQuote, setSelectedQuote] = useState<QuoteRequest | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  async function handleInlineStatusUpdate(quoteId: string, status: string) {
    setUpdatingId(quoteId)
    await updateQuoteStatus(quoteId, status)
    setUpdatingId(null)
  }

  const filtered = statusFilter === 'all' ? quotes : quotes.filter((q) => q.status === statusFilter)

  const statusCounts = quotes.reduce<Record<string, number>>((acc, q) => {
    acc[q.status] = (acc[q.status] ?? 0) + 1
    return acc
  }, {})

  function QuoteRow({ quote }: { quote: QuoteRequest }) {
    const cfg = STATUS[quote.status] ?? STATUS.pending
    const canRespond = quote.status === 'pending' || quote.status === 'in_review'

    return (
      <div className={cn(
        'rounded-lg border p-4 space-y-3 transition-colors',
        quote.status === 'pending' ? 'border-lhc-primary/30 bg-lhc-primary/5' : 'border-lhc-border bg-lhc-surface'
      )}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-semibold text-lhc-text-main">{quote.service_name}</p>
              <Badge variant={cfg.variant} className="text-[10px] px-1.5 py-0 gap-1">
                <cfg.Icon className="w-3 h-3" />{cfg.label}
              </Badge>
              {quote.urgency === 'urgent' && (
                <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Urgent</Badge>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-lhc-text-muted">
              <span className="flex items-center gap-1">
                <User className="w-3.5 h-3.5" />
                {quote.patient?.first_name} {quote.patient?.last_name}
              </span>
              {quote.patient?.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5" />{quote.patient.phone}
                </span>
              )}
              <span>{REQUEST_TYPE_LABELS[quote.request_type] ?? quote.request_type}</span>
              {quote.preferred_date && (
                <span className="flex items-center gap-1">
                  <CalendarDays className="w-3.5 h-3.5" />Preferred: {formatDate(quote.preferred_date)}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />{timeAgo(quote.created_at)}
              </span>
            </div>
          </div>
        </div>

        {quote.patient_notes && (
          <div className="rounded-md bg-lhc-background border border-lhc-border p-2.5 flex gap-2">
            <FileText className="w-3.5 h-3.5 text-lhc-text-muted shrink-0 mt-0.5" />
            <p className="text-xs text-lhc-text-muted italic">{quote.patient_notes}</p>
          </div>
        )}

        {/* Response summary (if already responded) */}
        {quote.status === 'responded' && quote.estimated_cost != null && (
          <div className="rounded-md bg-lhc-background border border-lhc-border p-2.5 flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1 font-medium text-lhc-text-main">
              <DollarSign className="w-3.5 h-3.5" />${Number(quote.estimated_cost).toFixed(2)}
            </span>
            {quote.estimated_rebate != null && (
              <span className="text-green-600">Rebate: ${Number(quote.estimated_rebate).toFixed(2)}</span>
            )}
            {quote.estimated_gap != null && (
              <span className="text-lhc-primary font-medium">Gap: ${Number(quote.estimated_gap).toFixed(2)}</span>
            )}
            {quote.payment_options && (
              <span className="flex items-center gap-1 text-lhc-text-muted">
                <CreditCard className="w-3.5 h-3.5" />
                {PAYMENT_OPTIONS.find(p => p.value === quote.payment_options)?.label ?? quote.payment_options}
              </span>
            )}
            {quote.responded_at && (
              <span className="text-lhc-text-muted ml-auto">Sent {timeAgo(quote.responded_at)}</span>
            )}
          </div>
        )}

        <div className="flex items-center gap-2">
          {canRespond && (
            <Button size="sm" onClick={() => setSelectedQuote(quote)} className="h-7 text-xs px-3">
              Respond
            </Button>
          )}
          {quote.status === 'pending' && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs px-3"
              disabled={updatingId === quote.id}
              onClick={() => handleInlineStatusUpdate(quote.id, 'in_review')}
            >
              {updatingId === quote.id ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Mark In Review'}
            </Button>
          )}
          {(quote.status === 'responded') && (
            <Button size="sm" onClick={() => setSelectedQuote(quote)} variant="outline" className="h-7 text-xs px-3">
              Update Response
            </Button>
          )}
          {(quote.status === 'pending' || quote.status === 'in_review') && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs px-2 text-lhc-text-muted"
              disabled={updatingId === quote.id}
              onClick={() => handleInlineStatusUpdate(quote.id, 'expired')}
            >
              {updatingId === quote.id ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Expire'}
            </Button>
          )}
        </div>
      </div>
    )
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lhc-text-main flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-lhc-primary" />
              Quote Requests
              {statusCounts['pending'] > 0 && (
                <Badge variant="destructive" className="text-xs ml-1">{statusCounts['pending']} pending</Badge>
              )}
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={refetch} disabled={loading} className="h-7 px-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            </Button>
          </div>

          {/* Status filter tabs */}
          {quotes.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {(['all', 'pending', 'in_review', 'responded', 'accepted', 'declined', 'cancelled', 'expired'] as const).map((s) => {
                const count = s === 'all' ? quotes.length : (statusCounts[s] ?? 0)
                if (s !== 'all' && count === 0) return null
                const cfg = s === 'all' ? null : STATUS[s]
                return (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={cn(
                      'text-xs px-2.5 py-1 rounded-full border transition-colors flex items-center gap-1',
                      statusFilter === s
                        ? 'bg-lhc-primary text-white border-lhc-primary'
                        : 'border-lhc-border text-lhc-text-muted hover:border-lhc-primary/50'
                    )}
                  >
                    {s === 'all' ? 'All' : cfg?.label ?? s}
                    <span className="opacity-70">({count})</span>
                  </button>
                )
              })}
            </div>
          )}
        </CardHeader>

        <CardContent>
          {loading && quotes.length === 0 ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-5 h-5 animate-spin text-lhc-text-muted" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-sm text-lhc-text-muted">
                {statusFilter === 'all'
                  ? 'No quote requests yet. Enable quotes in your clinic settings to start receiving requests.'
                  : `No ${STATUS[statusFilter]?.label ?? statusFilter} requests.`}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((q) => <QuoteRow key={q.id} quote={q} />)}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedQuote && (
        <RespondDialog
          quote={selectedQuote}
          open={!!selectedQuote}
          onOpenChange={(open) => { if (!open) setSelectedQuote(null) }}
          onSubmit={respondToQuote}
        />
      )}
    </>
  )
}
