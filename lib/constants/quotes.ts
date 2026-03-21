import type { ElementType } from 'react'
import { Clock, AlertCircle, CheckCircle, XCircle } from 'lucide-react'

// ── Max clinics per batch ─────────────────────────────────────────────────────
export const MAX_CLINICS_PER_BATCH = 5

// ── Valid enum values (must match DB CHECK constraints) ───────────────────────
export const VALID_REQUEST_TYPES = ['general', 'treatment_plan', 'insurance_estimate', 'procedure_quote', 'other'] as const
export const VALID_URGENCY = ['normal', 'urgent'] as const
export const VALID_STATUSES = ['pending', 'in_review', 'responded', 'accepted', 'declined', 'expired', 'cancelled'] as const
export const VALID_PAYMENT_OPTIONS = ['upfront', 'payment_plan', 'health_fund', 'mixed'] as const

export type QuoteRequestType = (typeof VALID_REQUEST_TYPES)[number]
export type QuoteUrgency = (typeof VALID_URGENCY)[number]
export type QuoteStatus = (typeof VALID_STATUSES)[number]
export type PaymentOption = (typeof VALID_PAYMENT_OPTIONS)[number]

// ── Labels ────────────────────────────────────────────────────────────────────
export const REQUEST_TYPE_LABELS: Record<string, string> = {
  general: 'General Enquiry',
  treatment_plan: 'Treatment Plan',
  insurance_estimate: 'Insurance Estimate',
  procedure_quote: 'Procedure Quote',
  other: 'Other',
}

export const PAYMENT_LABELS: Record<string, string> = {
  upfront: 'Upfront Payment',
  payment_plan: 'Payment Plan',
  health_fund: 'Health Fund',
  mixed: 'Mixed Options',
}

export const PAYMENT_OPTIONS = VALID_PAYMENT_OPTIONS.map((v) => ({
  value: v,
  label: PAYMENT_LABELS[v],
}))

// ── Status config (patient-facing labels) ─────────────────────────────────────
type BadgeVariant = 'default' | 'secondary' | 'outline' | 'destructive'
export interface StatusConfig {
  label: string
  variant: BadgeVariant
  Icon: ElementType
}

/** Patient-facing status labels */
export const PATIENT_STATUS: Record<string, StatusConfig> = {
  pending:    { label: 'Pending',        variant: 'outline',     Icon: Clock },
  in_review:  { label: 'In Review',      variant: 'secondary',   Icon: AlertCircle },
  responded:  { label: 'Quote Received', variant: 'default',     Icon: CheckCircle },
  accepted:   { label: 'Accepted',       variant: 'default',     Icon: CheckCircle },
  declined:   { label: 'Declined',       variant: 'destructive', Icon: XCircle },
  expired:    { label: 'Expired',        variant: 'secondary',   Icon: Clock },
  cancelled:  { label: 'Cancelled',      variant: 'destructive', Icon: XCircle },
}

/** Clinic-facing status labels */
export const CLINIC_STATUS: Record<string, StatusConfig> = {
  pending:    { label: 'Pending',    variant: 'outline',     Icon: Clock },
  in_review:  { label: 'In Review',  variant: 'secondary',   Icon: AlertCircle },
  responded:  { label: 'Responded',  variant: 'default',     Icon: CheckCircle },
  accepted:   { label: 'Accepted',   variant: 'default',     Icon: CheckCircle },
  declined:   { label: 'Declined',   variant: 'destructive', Icon: XCircle },
  expired:    { label: 'Expired',    variant: 'secondary',   Icon: Clock },
  cancelled:  { label: 'Cancelled',  variant: 'destructive', Icon: XCircle },
}

// ── Shared utilities ──────────────────────────────────────────────────────────
export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export function formatCurrency(n?: number | null): string | null {
  if (n == null) return null
  return `$${Number(n).toFixed(2)}`
}

export function formatCurrencyOrDash(n?: number | null): string {
  if (n == null) return '—'
  return `$${Number(n).toFixed(2)}`
}

export function formatDate(d?: string | null): string | null {
  if (!d) return null
  return new Date(d).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}
