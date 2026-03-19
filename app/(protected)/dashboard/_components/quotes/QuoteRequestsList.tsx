'use client'

import { useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Clock, AlertCircle, CheckCircle, XCircle, ChevronDown, ChevronRight,
  RefreshCw, GitCompare, Loader2, ListFilter,
} from 'lucide-react'
import type { QuoteRequest } from '@/lib/hooks/useQuoteRequests'
import QuoteDetailsDialog from './QuoteDetailsDialog'
import { cn } from '@/lib/utils'

// ── Status config ─────────────────────────────────────────────────────────────
type StatusConfig = { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive'; Icon: React.ElementType }
const STATUS: Record<string, StatusConfig> = {
  pending:    { label: 'Pending',        variant: 'outline',     Icon: Clock },
  in_review:  { label: 'In Review',      variant: 'secondary',   Icon: AlertCircle },
  responded:  { label: 'Quote Received', variant: 'default',     Icon: CheckCircle },
  accepted:   { label: 'Accepted',       variant: 'default',     Icon: CheckCircle },
  declined:   { label: 'Declined',       variant: 'destructive', Icon: XCircle },
  expired:    { label: 'Expired',        variant: 'secondary',   Icon: Clock },
  cancelled:  { label: 'Cancelled',      variant: 'destructive', Icon: XCircle },
}

const REQUEST_TYPE_LABELS: Record<string, string> = {
  general: 'General Enquiry',
  treatment_plan: 'Treatment Plan',
  insurance_estimate: 'Insurance Estimate',
  procedure_quote: 'Procedure Quote',
  other: 'Other',
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function formatCurrency(n?: number | null) {
  if (n == null) return null
  return `$${Number(n).toFixed(2)}`
}

interface BatchGroup {
  batchId: string
  serviceName: string
  requestType: string
  createdAt: string
  quotes: QuoteRequest[]
  respondedCount: number
}

interface Props {
  quotes: QuoteRequest[]
  loading: boolean
  refetch: () => void
  updateQuoteStatus: (quoteId: string, status: string) => Promise<boolean>
  onBookAppointment: (clinicId: string) => void
}

export default function QuoteRequestsList({ quotes, loading, refetch, updateQuoteStatus, onBookAppointment }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const statusFilter = searchParams.get('qstatus') ?? 'all'
  const [expandedBatches, setExpandedBatches] = useState<Set<string>>(new Set())
  const [selectedQuote, setSelectedQuote] = useState<QuoteRequest | null>(null)

  function setStatusFilter(status: string) {
    const p = new URLSearchParams(searchParams.toString())
    p.set('qstatus', status)
    router.replace(`?${p.toString()}`)
  }

  // Group by batch_id
  const { batches, standalone } = useMemo(() => {
    const batchMap = new Map<string, BatchGroup>()
    const standalone: QuoteRequest[] = []

    quotes.forEach((q) => {
      if (q.quote_batch_id) {
        const existing = batchMap.get(q.quote_batch_id)
        if (existing) {
          existing.quotes.push(q)
          // Count any status where the clinic has taken action (not still waiting)
          if (q.status !== 'pending' && q.status !== 'in_review') existing.respondedCount++
        } else {
          batchMap.set(q.quote_batch_id, {
            batchId: q.quote_batch_id,
            serviceName: q.service_name,
            requestType: q.request_type,
            createdAt: q.created_at,
            quotes: [q],
            respondedCount: (q.status !== 'pending' && q.status !== 'in_review') ? 1 : 0,
          })
        }
      } else {
        standalone.push(q)
      }
    })

    const batchArr = Array.from(batchMap.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    return { batches: batchArr, standalone }
  }, [quotes])

  function toggleBatch(batchId: string) {
    setExpandedBatches((prev) => {
      const next = new Set(prev)
      if (next.has(batchId)) next.delete(batchId)
      else next.add(batchId)
      return next
    })
  }

  const filteredBatches = statusFilter === 'all'
    ? batches
    : batches.filter((b) => b.quotes.some((q) => q.status === statusFilter))

  const filteredStandalone = statusFilter === 'all'
    ? standalone
    : standalone.filter((q) => q.status === statusFilter)

  const isEmpty = filteredBatches.length === 0 && filteredStandalone.length === 0

  function QuoteCard({ quote, indent = false }: { quote: QuoteRequest; indent?: boolean }) {
    const cfg = STATUS[quote.status] ?? STATUS.pending
    const cost = formatCurrency(quote.estimated_cost)
    const rebate = formatCurrency(quote.estimated_rebate)
    const gap = formatCurrency(quote.estimated_gap)

    return (
      <div className={cn(
        'rounded-lg border bg-lhc-surface p-3',
        indent ? 'border-l-4 border-l-lhc-primary/30 border-lhc-border ml-2' : 'border-lhc-border'
      )}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            {!indent && (
              <p className="text-sm font-medium text-lhc-text-main truncate">{quote.service_name}</p>
            )}
            <p className="text-xs text-lhc-text-muted truncate">
              {indent ? quote.clinic?.name ?? 'Unknown clinic' : REQUEST_TYPE_LABELS[quote.request_type] ?? quote.request_type}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge variant={cfg.variant} className="text-[10px] px-1.5 py-0.5 gap-1 whitespace-nowrap">
              <cfg.Icon className="w-3 h-3" />{cfg.label}
            </Badge>
          </div>
        </div>

        {quote.status === 'responded' && cost && (
          <div className="mt-2 flex items-center gap-3 text-xs">
            <span className="font-semibold text-lhc-text-main">{cost}</span>
            {rebate && <span className="text-green-600">Rebate: {rebate}</span>}
            {gap && <span className="text-lhc-primary font-medium">Gap: {gap}</span>}
          </div>
        )}

        <div className="mt-2 flex items-center justify-between gap-2">
          <p className="text-[11px] text-lhc-text-muted">{timeAgo(quote.created_at)}</p>
          <Button size="sm" variant="outline" className="h-6 text-xs px-2" onClick={() => setSelectedQuote(quote)}>
            Details
          </Button>
        </div>
      </div>
    )
  }

  function BatchCard({ batch }: { batch: BatchGroup }) {
    const isExpanded = expandedBatches.has(batch.batchId)
    const hasResponded = batch.respondedCount > 0

    return (
      <div className="rounded-lg border border-lhc-border bg-lhc-surface">
        {/* Header */}
        <button
          className="w-full flex items-center gap-3 p-3 text-left"
          onClick={() => toggleBatch(batch.batchId)}
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-medium text-lhc-text-main truncate">{batch.serviceName}</p>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-1 shrink-0">
                <GitCompare className="w-3 h-3" />{batch.quotes.length} clinic{batch.quotes.length !== 1 ? 's' : ''}
              </Badge>
            </div>
            <div className="flex items-center gap-3 mt-0.5">
              <p className="text-xs text-lhc-text-muted">{timeAgo(batch.createdAt)}</p>
              {hasResponded && (
                <p className="text-xs text-lhc-primary font-medium">
                  {batch.respondedCount}/{batch.quotes.length} responded
                </p>
              )}
            </div>
          </div>
          {isExpanded ? <ChevronDown className="w-4 h-4 text-lhc-text-muted shrink-0" /> : <ChevronRight className="w-4 h-4 text-lhc-text-muted shrink-0" />}
        </button>

        {/* Expanded clinic list — filtered to match active status filter */}
        {isExpanded && (
          <div className="px-3 pb-3 space-y-2 border-t border-lhc-border pt-2">
            {(statusFilter === 'all' ? batch.quotes : batch.quotes.filter((q) => q.status === statusFilter))
              .map((q) => <QuoteCard key={q.id} quote={q} indent />)}
          </div>
        )}
      </div>
    )
  }

  // Status filter options — fixed logical order, only show statuses present in data
  const STATUS_ORDER = ['pending', 'in_review', 'responded', 'accepted', 'declined', 'expired', 'cancelled'] as const
  const statusOptions = useMemo(() => {
    const present = new Set(quotes.map((q) => q.status))
    return STATUS_ORDER.filter((s) => present.has(s))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quotes])

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base text-lhc-text-main">Your Quote Requests</CardTitle>
            <Button variant="ghost" size="sm" onClick={refetch} disabled={loading} className="h-7 px-2">
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            </Button>
          </div>
          {/* Filter */}
          {statusOptions.length > 1 && (
            <div className="flex items-center gap-1.5 flex-wrap mt-1">
              <ListFilter className="w-3.5 h-3.5 text-lhc-text-muted" />
              {['all', ...statusOptions].map((s) => {
                const cfg = s === 'all' ? null : STATUS[s]
                return (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={cn(
                      'text-[11px] px-2 py-0.5 rounded-full border transition-colors',
                      statusFilter === s
                        ? 'bg-lhc-primary text-white border-lhc-primary'
                        : 'border-lhc-border text-lhc-text-muted hover:border-lhc-primary/50'
                    )}
                  >
                    {s === 'all' ? 'All' : cfg?.label ?? s}
                  </button>
                )
              })}
            </div>
          )}
        </CardHeader>

        <CardContent className="space-y-3">
          {loading && quotes.length === 0 ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-lhc-text-muted" />
            </div>
          ) : isEmpty ? (
            <div className="py-8 text-center">
              <p className="text-sm text-lhc-text-muted">
                {statusFilter === 'all'
                  ? 'No quote requests yet. Use the form to request your first quote!'
                  : `No ${STATUS[statusFilter]?.label ?? statusFilter} quotes.`}
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-0.5">
              {filteredBatches.map((b) => <BatchCard key={b.batchId} batch={b} />)}
              {filteredStandalone.map((q) => <QuoteCard key={q.id} quote={q} />)}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedQuote && (
        <QuoteDetailsDialog
          quote={selectedQuote}
          open={!!selectedQuote}
          onOpenChange={(open) => { if (!open) setSelectedQuote(null) }}
          onUpdateStatus={updateQuoteStatus}
          onBookAppointment={(clinicId) => {
            setSelectedQuote(null)
            onBookAppointment(clinicId)
          }}
        />
      )}
    </>
  )
}
