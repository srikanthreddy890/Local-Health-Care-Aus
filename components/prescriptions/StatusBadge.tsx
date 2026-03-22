'use client'

import {
  AlertCircle, Eye, CheckCircle, XCircle,
} from 'lucide-react'

// ── Prescription status badge ────────────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  dispensed: 'bg-blue-100 text-blue-700',
  partially_dispensed: 'bg-yellow-100 text-yellow-700',
  expired: 'bg-gray-100 text-gray-700',
  cancelled: 'bg-red-100 text-red-700',
}

export function PrescriptionStatusBadge({ status }: { status: string }) {
  const cls = STATUS_STYLES[status] ?? 'bg-gray-100 text-gray-700'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${cls}`}>
      {status.replace(/_/g, ' ')}
    </span>
  )
}

// ── Share status badge ───────────────────────────────────────────────────────

const SHARE_STATUS_STYLES: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  viewed: 'bg-blue-100 text-blue-700',
  dispensed: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
}

export function ShareStatusBadge({ status }: { status: string }) {
  const cls = SHARE_STATUS_STYLES[status] ?? 'bg-gray-100 text-gray-700'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${cls}`}>
      {status}
    </span>
  )
}

// ── Share status icon ────────────────────────────────────────────────────────

export function ShareStatusIcon({ status }: { status: string }) {
  if (status === 'pending')   return <AlertCircle className="w-4 h-4 text-yellow-500" />
  if (status === 'viewed')    return <Eye className="w-4 h-4 text-blue-500" />
  if (status === 'dispensed') return <CheckCircle className="w-4 h-4 text-green-500" />
  if (status === 'rejected')  return <XCircle className="w-4 h-4 text-red-500" />
  return <AlertCircle className="w-4 h-4 text-muted-foreground" />
}
