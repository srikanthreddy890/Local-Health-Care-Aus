'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Check, X, Loader2, Mail, Phone, FileText, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { useAdminContext } from './AdminContext'
import { useAdminClaims } from '@/lib/hooks/useAdminClaims'

interface ClaimNotes {
  contactName?: string
  jobTitle?: string
  phone?: string
  reason?: string
}

function parseClaimNotes(raw: string | null): ClaimNotes {
  if (!raw) return {}
  try {
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

const statusConfig: Record<string, { label: string; variant: string }> = {
  pending: { label: 'Pending', variant: 'bg-amber-100 text-amber-700' },
  verified_pending_approval: { label: 'Verified — Pending Approval', variant: 'bg-blue-100 text-blue-700' },
  approved: { label: 'Approved', variant: 'bg-green-100 text-green-700' },
  rejected: { label: 'Rejected', variant: 'bg-red-100 text-red-700' },
}

export default function AdminClaims() {
  const { userId } = useAdminContext()
  const { claims, pendingCount, isLoading, approveClaim, rejectClaim, isApproving, isRejecting } =
    useAdminClaims(userId)

  const [rejectId, setRejectId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  function handleReject() {
    if (!rejectId || !rejectReason.trim()) return
    rejectClaim({ claimId: rejectId, reason: rejectReason.trim() })
    setRejectId(null)
    setRejectReason('')
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-lhc-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-lhc-text-main">Clinic Profile Claims</h2>
        <p className="text-sm text-lhc-text-muted">
          {pendingCount > 0
            ? `${pendingCount} claim${pendingCount > 1 ? 's' : ''} awaiting review`
            : 'No pending claims'}
        </p>
      </div>

      {claims.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-lhc-text-muted">No claims found.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {claims.map((claim) => {
            const notes = parseClaimNotes(claim.claim_notes)
            const cfg = statusConfig[claim.claim_status] ?? { label: claim.claim_status, variant: '' }
            const isPending =
              claim.claim_status === 'pending' || claim.claim_status === 'verified_pending_approval'

            return (
              <Card key={claim.id}>
                <CardContent className="py-4">
                  <div className="flex gap-4">
                    {/* Clinic image */}
                    <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-lhc-surface">
                      {claim.clinic_image ? (
                        <Image src={claim.clinic_image} alt={claim.clinic_name ?? ''} fill className="object-cover" sizes="64px" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Building2 className="w-6 h-6 text-lhc-text-muted" />
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-medium text-lhc-text-main">
                            {claim.clinic_name ?? 'Unknown Clinic'}
                          </h3>
                          {claim.clinic_address && (
                            <p className="text-xs text-lhc-text-muted">{claim.clinic_address}</p>
                          )}
                        </div>
                        <Badge className={`text-xs flex-shrink-0 ${cfg.variant}`}>{cfg.label}</Badge>
                      </div>

                      {/* Contact info */}
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-lhc-text-muted">
                        {notes.contactName && (
                          <span className="font-medium text-lhc-text-main">{notes.contactName}</span>
                        )}
                        {notes.jobTitle && <span>{notes.jobTitle}</span>}
                        {claim.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3" /> {claim.email}
                          </span>
                        )}
                        {notes.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" /> {notes.phone}
                          </span>
                        )}
                      </div>

                      {notes.reason && (
                        <p className="text-xs text-lhc-text-muted mt-2 bg-lhc-surface p-2 rounded">
                          <FileText className="w-3 h-3 inline mr-1" />
                          {notes.reason}
                        </p>
                      )}

                      {claim.submitted_at && (
                        <p className="text-xs text-lhc-text-muted mt-2">
                          Submitted: {new Date(claim.submitted_at).toLocaleString()}
                        </p>
                      )}

                      {claim.rejection_reason && (
                        <p className="text-xs text-red-600 mt-1">
                          Rejection reason: {claim.rejection_reason}
                        </p>
                      )}

                      {/* Actions */}
                      {isPending && (
                        <div className="flex items-center gap-2 mt-3">
                          <Button
                            size="sm"
                            onClick={() => approveClaim(claim.id)}
                            disabled={isApproving}
                          >
                            <Check className="w-4 h-4 mr-1" /> Approve
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setRejectId(claim.id)}
                          >
                            <X className="w-4 h-4 mr-1" /> Reject
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Reject dialog */}
      <Dialog open={!!rejectId} onOpenChange={() => setRejectId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Claim</DialogTitle>
            <DialogDescription>
              Provide a reason for rejection. The claimant will see this message.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Reason for rejection..."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!rejectReason.trim() || isRejecting}
            >
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
