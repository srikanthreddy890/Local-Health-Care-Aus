'use client'

import { useMemo, useState } from 'react'
import { format } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  DollarSign, Clock,
  RefreshCw, Loader2, User, Phone, CalendarDays, FileText, CreditCard,
} from 'lucide-react'
import { useClinicQuotes, type QuoteRequest, type RespondToQuoteData } from '@/lib/hooks/useQuoteRequests'
import { CLINIC_STATUS, REQUEST_TYPE_LABELS, PAYMENT_OPTIONS, timeAgo, formatDate } from '@/lib/constants/quotes'
import { createClient } from '@/lib/supabase/client'
import { toast } from '@/lib/toast'
import { cn } from '@/lib/utils'

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
  const [validUntilDate, setValidUntilDate] = useState<Date>(
    quote.valid_until ? new Date(quote.valid_until) : new Date(Date.now() + 30 * 86400000)
  )
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [paymentOptions, setPaymentOptions] = useState(quote.payment_options ?? '')
  const [clinicNotes, setClinicNotes] = useState(quote.clinic_notes ?? '')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Auto-calculate gap when cost and rebate change
  function handleCostOrRebateChange(cost: string, rebate: string) {
    const c = parseFloat(cost)
    if (isNaN(c)) return
    const r = parseFloat(rebate)
    setEstimatedGap(Math.max(0, c - (isNaN(r) ? 0 : r)).toFixed(2))
  }

  const costNum = parseFloat(estimatedCost)
  const rebateNum = parseFloat(estimatedRebate)
  const costError = estimatedCost && (isNaN(costNum) || costNum <= 0) ? 'Cost must be greater than $0' :
    costNum > 999999 ? 'Cost cannot exceed $999,999' : null
  const rebateError = estimatedRebate && !isNaN(rebateNum) && !isNaN(costNum) && rebateNum > costNum
    ? 'Rebate cannot exceed cost' : null

  async function handleSubmit() {
    const cost = parseFloat(estimatedCost)
    if (isNaN(cost) || cost <= 0 || costError || rebateError) return
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
      valid_until: validUntilDate ? format(validUntilDate, 'yyyy-MM-dd') : null,
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
                min="0.01"
                max="999999"
                step="0.01"
                placeholder="0.00"
                value={estimatedCost}
                onChange={(e) => {
                  setEstimatedCost(e.target.value)
                  handleCostOrRebateChange(e.target.value, estimatedRebate)
                }}
              />
              {costError && <p className="text-[10px] text-red-500 mt-0.5">{costError}</p>}
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
              {rebateError && <p className="text-[10px] text-red-500 mt-0.5">{rebateError}</p>}
            </div>
            <div>
              <Label className="text-xs mb-1 block">Gap (out-of-pocket)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={estimatedGap}
                disabled
                className="bg-lhc-background text-lhc-text-muted"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs mb-1 block">Quote Valid Until</Label>
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !validUntilDate && 'text-lhc-text-muted',
                    )}
                  >
                    <CalendarDays className="mr-2 h-4 w-4" />
                    {validUntilDate ? format(validUntilDate, 'dd MMM yyyy') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={validUntilDate}
                    onSelect={(date) => {
                      if (date) setValidUntilDate(date)
                      setCalendarOpen(false)
                    }}
                    disabled={{ before: new Date() }}
                  />
                </PopoverContent>
              </Popover>
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
          <Button onClick={handleSubmit} disabled={isSubmitting || !estimatedCost || !!costError || !!rebateError}>
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
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [confirmExpireId, setConfirmExpireId] = useState<string | null>(null)

  async function handleInlineStatusUpdate(quoteId: string, status: string) {
    setUpdatingId(quoteId)
    await updateQuoteStatus(quoteId, status)
    setUpdatingId(null)
  }

  const { pendingQuotes, respondedQuotes } = useMemo(() => {
    const pending: QuoteRequest[] = []
    const responded: QuoteRequest[] = []
    quotes.forEach((q) => {
      if (q.status === 'pending' || q.status === 'in_review') pending.push(q)
      else responded.push(q)
    })
    return { pendingQuotes: pending, respondedQuotes: responded }
  }, [quotes])

  function QuoteRow({ quote }: { quote: QuoteRequest }) {
    const cfg = CLINIC_STATUS[quote.status] ?? CLINIC_STATUS.pending
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
        {quote.estimated_cost != null && ['responded', 'accepted', 'declined'].includes(quote.status) && (
          <div className="rounded-md bg-lhc-background border border-lhc-border p-2.5 flex items-center flex-wrap gap-4 text-xs">
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
            {quote.clinic_notes && (
              <span className="flex items-center gap-1 text-lhc-text-muted basis-full mt-1">
                <FileText className="w-3.5 h-3.5" />{quote.clinic_notes}
              </span>
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
          {quote.status === 'responded' && (
            <Button size="sm" onClick={() => setSelectedQuote(quote)} variant="outline" className="h-7 text-xs px-3">
              Update Response
            </Button>
          )}
          {canRespond && confirmExpireId !== quote.id && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs px-2 text-lhc-text-muted"
              disabled={updatingId === quote.id}
              onClick={() => setConfirmExpireId(quote.id)}
              aria-label="Expire this quote request"
            >
              {updatingId === quote.id ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Expire'}
            </Button>
          )}
          {confirmExpireId === quote.id && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-lhc-text-muted">Expire?</span>
              <Button
                size="sm"
                variant="destructive"
                className="h-6 text-xs px-2"
                disabled={updatingId === quote.id}
                onClick={() => { handleInlineStatusUpdate(quote.id, 'expired'); setConfirmExpireId(null) }}
              >
                Yes
              </Button>
              <Button size="sm" variant="outline" className="h-6 text-xs px-2" onClick={() => setConfirmExpireId(null)}>
                No
              </Button>
            </div>
          )}
        </div>
      </div>
    )
  }

  function QuoteList({ items, emptyMessage }: { items: QuoteRequest[]; emptyMessage: string }) {
    if (loading && quotes.length === 0) {
      return (
        <div className="flex justify-center py-10" role="status" aria-live="polite">
          <Loader2 className="w-5 h-5 animate-spin text-lhc-text-muted" />
          <span className="sr-only">Loading quote requests...</span>
        </div>
      )
    }
    if (items.length === 0) {
      return (
        <div className="py-10 text-center">
          <p className="text-sm text-lhc-text-muted">{emptyMessage}</p>
        </div>
      )
    }
    return (
      <div className="space-y-3">
        {items.map((q) => <QuoteRow key={q.id} quote={q} />)}
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
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={refetch} disabled={loading} className="h-7 px-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          <Tabs defaultValue="pending">
            <TabsList className="w-full justify-start">
              <TabsTrigger value="pending" className="flex items-center gap-1.5">
                Pending
                {pendingQuotes.length > 0 && (
                  <Badge variant="destructive" className="text-[10px] px-1.5 py-0 ml-0.5">
                    {pendingQuotes.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="responded" className="flex items-center gap-1.5">
                History
                {respondedQuotes.length > 0 && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 ml-0.5">
                    {respondedQuotes.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="mt-4">
              <QuoteList
                items={pendingQuotes}
                emptyMessage="No pending quote requests. New requests from patients will appear here."
              />
            </TabsContent>

            <TabsContent value="responded" className="mt-4">
              <QuoteList
                items={respondedQuotes}
                emptyMessage="No quote history yet."
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {selectedQuote && (
        <RespondDialog
          key={selectedQuote.id}
          quote={selectedQuote}
          open={!!selectedQuote}
          onOpenChange={(open) => { if (!open) setSelectedQuote(null) }}
          onSubmit={respondToQuote}
        />
      )}
    </>
  )
}
