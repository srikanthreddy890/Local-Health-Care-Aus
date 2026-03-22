'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { format, parseISO } from 'date-fns'
import {
  Pill, FileText, Building2, Clock, Hash,
  RefreshCw, Download, Share2, Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { usePrescriptions } from '@/lib/hooks/usePrescriptions'
import type { Prescription, PrescriptionShare } from '@/lib/prescriptions/types'
import { isPrescriptionExpired } from '@/lib/prescriptions/types'
import { PrescriptionStatusBadge, ShareStatusIcon } from '@/components/prescriptions/StatusBadge'
import SharePrescriptionDialog from './SharePrescriptionDialog'

// ── Detail dialog ─────────────────────────────────────────────────────────────

interface DetailDialogProps {
  prescription: Prescription | null
  shares: PrescriptionShare[]
  patientId: string
  shareOpen: boolean
  onClose: () => void
  onOpenShare: () => void
  onCloseShare: () => void
  onDownload: (filePath: string, fileName: string) => void
  onRevoke: (shareId: string, prescriptionId: string) => void
  onShareSuccess: (prescriptionId: string) => void
  revoking: boolean
}

function DetailDialog({
  prescription, shares, patientId, shareOpen,
  onClose, onOpenShare, onCloseShare,
  onDownload, onRevoke, onShareSuccess, revoking,
}: DetailDialogProps) {
  const [revokeTarget, setRevokeTarget] = useState<PrescriptionShare | null>(null)

  const isExpired = prescription ? isPrescriptionExpired(prescription.expires_at) : false
  const canShare = prescription?.status === 'active' && !isExpired

  return (
    <>
      <Dialog open={!!prescription} onOpenChange={(o) => { if (!o) onClose() }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 flex-wrap">
              {prescription?.title}
              {prescription && <PrescriptionStatusBadge status={isExpired ? 'expired' : prescription.status} />}
            </DialogTitle>
            <DialogDescription>
              {prescription?.prescription_date
                ? format(parseISO(prescription.prescription_date), 'PPP')
                : 'Prescription details'}
            </DialogDescription>
          </DialogHeader>

          {prescription && (
            <div className="space-y-4 text-sm">
              {/* Valid Until */}
              {prescription.expires_at && (
                <div>
                  <p className="font-medium text-muted-foreground">Valid Until</p>
                  <p className={isExpired ? 'text-red-600 font-medium' : ''}>
                    {format(parseISO(prescription.expires_at), 'PPP')}
                    {isExpired && ' (Expired)'}
                  </p>
                </div>
              )}

              {/* Appointment Reference */}
              {prescription.booking_reference && (
                <div>
                  <p className="font-medium text-muted-foreground flex items-center gap-1">
                    <Hash className="w-3.5 h-3.5" />Appointment Reference
                  </p>
                  <p className="font-mono text-xs mt-0.5 bg-muted/40 rounded px-2 py-1 inline-block">
                    {prescription.booking_reference}
                  </p>
                </div>
              )}

              {/* Prescribed by */}
              {prescription.doctor_name && (
                <div>
                  <p className="font-medium text-muted-foreground">Prescribed by</p>
                  <p>{prescription.doctor_name}</p>
                </div>
              )}

              {/* Description */}
              {prescription.description && (
                <div>
                  <p className="font-medium text-muted-foreground">Description</p>
                  <p className="mt-0.5">{prescription.description}</p>
                </div>
              )}

              {/* Prescription Details */}
              {prescription.prescription_text && (
                <div>
                  <p className="font-medium text-muted-foreground">Prescription Details</p>
                  <p className="whitespace-pre-wrap mt-0.5 bg-muted/40 rounded p-2 text-xs leading-relaxed">
                    {prescription.prescription_text}
                  </p>
                </div>
              )}

              {/* Medications */}
              <div>
                <p className="font-medium text-muted-foreground">Medications</p>
                {prescription.medications.length === 0 ? (
                  <p className="text-muted-foreground mt-1 text-xs">No specific medications listed.</p>
                ) : (
                  <div className="space-y-2 mt-1">
                    {prescription.medications.map((med, i) => (
                      <Card key={i} className="p-3">
                        <p className="font-medium">{med.name}</p>
                        {[med.dosage, med.frequency, med.duration].filter(Boolean).length > 0 && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {[med.dosage, med.frequency, med.duration].filter(Boolean).join(' · ')}
                          </p>
                        )}
                        {med.notes && (
                          <p className="text-xs text-muted-foreground mt-1">{med.notes}</p>
                        )}
                      </Card>
                    ))}
                  </div>
                )}
              </div>

              {/* Attached File */}
              {prescription.file_path && (
                <div>
                  <p className="font-medium text-muted-foreground">Attached File</p>
                  <div className="mt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onDownload(prescription.file_path!, prescription.file_name ?? 'prescription')}
                    >
                      <Download className="w-3.5 h-3.5" />
                      {prescription.file_name ?? 'Download'}
                    </Button>
                  </div>
                </div>
              )}

              {/* Shared With */}
              {shares.length > 0 && (
                <div>
                  <p className="font-medium text-muted-foreground">Shared With</p>
                  <div className="space-y-2 mt-1">
                    {shares.map((share) => (
                      <div key={share.id} className="flex items-center gap-2 justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <ShareStatusIcon status={share.status} />
                          <div className="min-w-0">
                            <p className="truncate font-medium text-xs">{share.pharmacy_name ?? 'Pharmacy'}</p>
                            <p className="text-xs text-muted-foreground capitalize">
                              {share.status.replace(/_/g, ' ')} · {format(parseISO(share.shared_at), 'PP')}
                            </p>
                          </div>
                        </div>
                        {share.status === 'pending' && !share.access_revoked && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive shrink-0"
                            disabled={revoking}
                            onClick={() => setRevokeTarget(share)}
                          >
                            {revoking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                            Revoke
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Share with Pharmacy */}
              {canShare && (
                <Button className="w-full" onClick={onOpenShare}>
                  <Share2 className="w-4 h-4" />
                  Share with Pharmacy
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Revoke confirmation dialog */}
      <Dialog open={!!revokeTarget} onOpenChange={(o) => { if (!o) setRevokeTarget(null) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Revoke Access</DialogTitle>
            <DialogDescription>
              Are you sure you want to revoke access for {revokeTarget?.pharmacy_name ?? 'this pharmacy'}?
              They will no longer be able to view this prescription.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setRevokeTarget(null)} disabled={revoking}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={revoking}
              onClick={() => {
                if (!revokeTarget || !prescription) return
                onRevoke(revokeTarget.id, prescription.id)
                setRevokeTarget(null)
              }}
            >
              {revoking && <Loader2 className="w-4 h-4 animate-spin" />}
              Revoke Access
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Share sub-dialog */}
      {prescription && (
        <SharePrescriptionDialog
          open={shareOpen}
          onOpenChange={(o) => { if (!o) onCloseShare() }}
          prescriptionId={prescription.id}
          patientId={patientId}
          onSuccess={() => {
            onCloseShare()
            onShareSuccess(prescription.id)
          }}
        />
      )}
    </>
  )
}

// ── Main tab ──────────────────────────────────────────────────────────────────

export default function PrescriptionsTab({ userId }: { userId: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const { prescriptions, sharesMap, loading, refetch, downloadPrescriptionFile, revokeShare, refetchShares } =
    usePrescriptions(userId)

  const [search, setSearch] = useState('')
  const [revoking, setRevoking] = useState(false)

  // Quick-share from list row
  const [quickShareId, setQuickShareId] = useState<string | null>(null)

  // URL-driven dialog state
  const selectedId  = searchParams.get('rx')
  const shareActive = searchParams.get('rx_share') === '1'

  // ── URL navigation helpers ─────────────────────────────────────────────────

  function openDetail(prescriptionId: string) {
    const p = new URLSearchParams(searchParams.toString())
    p.set('rx', prescriptionId)
    p.delete('rx_share')
    router.push(`?${p.toString()}`)
  }

  function closeDetail() {
    const p = new URLSearchParams(searchParams.toString())
    p.delete('rx')
    p.delete('rx_share')
    router.push(`?${p.toString()}`)
  }

  function openShare() {
    const p = new URLSearchParams(searchParams.toString())
    p.set('rx_share', '1')
    router.replace(`?${p.toString()}`)
  }

  function closeShare() {
    const p = new URLSearchParams(searchParams.toString())
    p.delete('rx_share')
    router.replace(`?${p.toString()}`)
  }

  // ── Derived state ──────────────────────────────────────────────────────────
  const selected       = prescriptions.find((p) => p.id === selectedId) ?? null
  const selectedShares = selected ? (sharesMap[selected.id] ?? []) : []

  const filtered = prescriptions.filter((p) => {
    const q = search.toLowerCase()
    return (
      p.title.toLowerCase().includes(q) ||
      (p.clinic_name ?? '').toLowerCase().includes(q) ||
      (p.doctor_name ?? '').toLowerCase().includes(q)
    )
  })

  async function handleRevoke(shareId: string, prescriptionId: string) {
    setRevoking(true)
    await revokeShare(shareId, prescriptionId)
    setRevoking(false)
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">My Prescriptions</h2>
        <Button variant="ghost" size="sm" onClick={refetch} disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Search */}
      <Input
        placeholder="Search by title, clinic or doctor…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />

      {/* Loading state */}
      {loading && (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Empty state */}
      {!loading && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <FileText className="w-10 h-10 text-muted-foreground mb-3" />
          <p className="text-muted-foreground">No prescriptions yet.</p>
        </div>
      )}

      {/* List */}
      {!loading && filtered.length > 0 && (
        <div className="space-y-3">
          {filtered.map((p) => {
            const shares = sharesMap[p.id] ?? []
            const activeShares = shares.filter((s) => !s.access_revoked)
            const isExpired = isPrescriptionExpired(p.expires_at)
            const canShare = p.status === 'active' && !isExpired

            return (
              <div
                key={p.id}
                role="button"
                tabIndex={0}
                onClick={() => openDetail(p.id)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDetail(p.id) } }}
                className="w-full text-left bg-lhc-surface border border-lhc-border rounded-xl p-4 hover:border-primary/40 transition-colors cursor-pointer"
              >
                <div className="flex items-start gap-3">
                  <div className="shrink-0 w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                    <Pill className="w-4 h-4 text-primary" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm truncate">{p.title}</span>
                      <PrescriptionStatusBadge status={isExpired ? 'expired' : p.status} />
                    </div>

                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                      <Building2 className="w-3 h-3 shrink-0" />
                      <span className="truncate">
                        {[p.clinic_name, p.doctor_name].filter(Boolean).join(' · ')}
                      </span>
                    </div>

                    {p.prescription_date && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                        <Clock className="w-3 h-3 shrink-0" />
                        {format(parseISO(p.prescription_date), 'PP')}
                      </div>
                    )}

                    {activeShares.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Shared with {activeShares.length} {activeShares.length === 1 ? 'pharmacy' : 'pharmacies'}
                      </p>
                    )}
                  </div>

                  {/* Row actions */}
                  <div
                    className="flex items-center gap-1 shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {p.file_path && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => downloadPrescriptionFile(p.file_path!, p.file_name ?? 'prescription')}
                      >
                        <Download className="w-3.5 h-3.5" />
                      </Button>
                    )}
                    {canShare && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); setQuickShareId(p.id) }}
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        Share
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Detail dialog */}
      <DetailDialog
        prescription={selected}
        shares={selectedShares}
        patientId={userId}
        shareOpen={shareActive && !!selected}
        onClose={closeDetail}
        onOpenShare={openShare}
        onCloseShare={closeShare}
        onDownload={downloadPrescriptionFile}
        onRevoke={handleRevoke}
        onShareSuccess={(prescriptionId) => refetchShares(prescriptionId)}
        revoking={revoking}
      />

      {/* Quick-share dialog */}
      <SharePrescriptionDialog
        open={!!quickShareId}
        onOpenChange={(o) => { if (!o) setQuickShareId(null) }}
        prescriptionId={quickShareId ?? ''}
        patientId={userId}
        onSuccess={() => {
          const id = quickShareId
          setQuickShareId(null)
          if (id) refetchShares(id)
        }}
      />
    </div>
  )
}
