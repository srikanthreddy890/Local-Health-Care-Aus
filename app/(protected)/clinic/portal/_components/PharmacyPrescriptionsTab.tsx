'use client'

import { useState, useEffect, useRef } from 'react'
import { format, parseISO } from 'date-fns'
import {
  Inbox, Pill, RefreshCw, Search, Loader2, Download,
  CheckCircle, XCircle, Stethoscope, Clock,
  Building2, MessageSquare, FileText,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { usePharmacyPrescriptions } from '@/lib/hooks/usePharmacyPrescriptions'
import type { IncomingPrescription, Medication } from '@/lib/prescriptions/types'
import { isPrescriptionExpired } from '@/lib/prescriptions/types'
import { ShareStatusBadge, ShareStatusIcon } from '@/components/prescriptions/StatusBadge'

// ── Status filter ────────────────────────────────────────────────────────────

type StatusFilter = 'all' | 'pending' | 'viewed' | 'dispensed'

// ── Main component ───────────────────────────────────────────────────────────

export default function PharmacyPrescriptionsTab({ clinicId }: { clinicId: string }) {
  const { incoming, loading, refetch, updateShareStatus, downloadPrescriptionFile } =
    usePharmacyPrescriptions(clinicId)

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  // Action confirmation state
  const [actionTarget, setActionTarget] = useState<IncomingPrescription | null>(null)
  const [actionType, setActionType] = useState<'dispensed' | 'rejected'>('dispensed')
  const [actionNotes, setActionNotes] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  // Track which shares have been auto-marked as viewed
  const viewedRef = useRef<Set<string>>(new Set())

  const selected = incoming.find((i) => i.share_id === selectedId) ?? null

  // Auto-mark as viewed when detail opens
  useEffect(() => {
    if (selected && selected.share_status === 'pending' && !viewedRef.current.has(selected.share_id)) {
      viewedRef.current.add(selected.share_id)
      updateShareStatus(selected.share_id, 'viewed')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.share_id, selected?.share_status])

  // Filter
  const filtered = incoming.filter((item) => {
    if (statusFilter !== 'all' && item.share_status !== statusFilter) return false
    const q = search.toLowerCase()
    const patientName = [item.patient_first_name, item.patient_last_name].filter(Boolean).join(' ').toLowerCase()
    return (
      item.title.toLowerCase().includes(q) ||
      patientName.includes(q) ||
      (item.prescribing_clinic_name ?? '').toLowerCase().includes(q)
    )
  })

  // Status counts
  const counts = {
    all: incoming.length,
    pending: incoming.filter((i) => i.share_status === 'pending').length,
    viewed: incoming.filter((i) => i.share_status === 'viewed').length,
    dispensed: incoming.filter((i) => i.share_status === 'dispensed').length,
  }

  // Action handlers
  function openAction(item: IncomingPrescription, type: 'dispensed' | 'rejected') {
    setActionTarget(item)
    setActionType(type)
    setActionNotes('')
  }

  async function confirmAction() {
    if (!actionTarget) return
    if (actionType === 'rejected' && !actionNotes.trim()) return

    setActionLoading(true)
    const result = await updateShareStatus(
      actionTarget.share_id,
      actionType,
      actionNotes.trim() || undefined
    )
    setActionLoading(false)

    if (result.success) {
      setActionTarget(null)
      setSelectedId(null)
    }
  }

  const canAction = (item: IncomingPrescription) => {
    if (item.share_status === 'dispensed' || item.share_status === 'rejected') return false
    if (isPrescriptionExpired(item.expires_at)) return false
    return true
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Inbox className="w-5 h-5 text-primary" /> Incoming Prescriptions
          </h2>
          <p className="text-sm text-muted-foreground">Prescriptions shared by patients for dispensing</p>
        </div>
        <Button variant="ghost" size="sm" onClick={refetch} disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search by patient, title, or clinic…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Status tabs */}
      <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
        <TabsList>
          <TabsTrigger value="all">All ({counts.all})</TabsTrigger>
          <TabsTrigger value="pending">Pending ({counts.pending})</TabsTrigger>
          <TabsTrigger value="viewed">Viewed ({counts.viewed})</TabsTrigger>
          <TabsTrigger value="dispensed">Dispensed ({counts.dispensed})</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Empty */}
      {!loading && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Inbox className="w-10 h-10 text-muted-foreground mb-3" />
          <p className="text-muted-foreground">No incoming prescriptions.</p>
        </div>
      )}

      {/* List */}
      {!loading && filtered.length > 0 && (
        <div className="space-y-3">
          {filtered.map((item) => {
            const patientName = [item.patient_first_name, item.patient_last_name].filter(Boolean).join(' ') || 'Unknown Patient'
            return (
              <button
                key={item.share_id}
                type="button"
                onClick={() => setSelectedId(item.share_id)}
                className="w-full text-left bg-lhc-surface border border-lhc-border rounded-xl p-4 hover:border-primary/40 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="shrink-0 w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                    <Pill className="w-4 h-4 text-primary" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm truncate">{item.title}</span>
                      <ShareStatusBadge status={item.share_status} />
                    </div>

                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                      <span className="truncate">{patientName}</span>
                    </div>

                    {item.prescribing_clinic_name && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                        <Building2 className="w-3 h-3 shrink-0" />
                        <span className="truncate">{item.prescribing_clinic_name}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                      <Clock className="w-3 h-3 shrink-0" />
                      Received {format(parseISO(item.shared_at), 'PP')}
                    </div>
                  </div>

                  {/* Action buttons */}
                  {canAction(item) && (
                    <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-white"
                        onClick={() => openAction(item, 'dispensed')}
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        Dispense
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-red-300 text-red-600 hover:bg-red-50"
                        onClick={() => openAction(item, 'rejected')}
                      >
                        <XCircle className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* Detail dialog */}
      <Dialog open={!!selected} onOpenChange={(o) => { if (!o) setSelectedId(null) }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 flex-wrap">
              {selected?.title}
              {selected && <ShareStatusBadge status={selected.share_status} />}
            </DialogTitle>
            <DialogDescription>
              Received {selected?.shared_at ? format(parseISO(selected.shared_at), 'PPP') : ''}
            </DialogDescription>
          </DialogHeader>

          {selected && (
            <div className="space-y-4 text-sm">
              {/* Patient */}
              <div>
                <p className="font-medium text-muted-foreground">Patient</p>
                <p>{[selected.patient_first_name, selected.patient_last_name].filter(Boolean).join(' ') || 'Unknown'}</p>
              </div>

              {/* Prescribing clinic */}
              {selected.prescribing_clinic_name && (
                <div>
                  <p className="font-medium text-muted-foreground flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5" /> Prescribing Clinic
                  </p>
                  <p>{selected.prescribing_clinic_name}</p>
                </div>
              )}

              {/* Doctor */}
              {selected.doctor_name && (
                <div>
                  <p className="font-medium text-muted-foreground flex items-center gap-1">
                    <Stethoscope className="w-3.5 h-3.5" /> Prescribed by
                  </p>
                  <p>{selected.doctor_name}</p>
                </div>
              )}

              {/* Prescription date */}
              {selected.prescription_date && (
                <div>
                  <p className="font-medium text-muted-foreground">Prescription Date</p>
                  <p>{format(parseISO(selected.prescription_date), 'PPP')}</p>
                </div>
              )}

              {/* Expiry */}
              {selected.expires_at && (
                <div>
                  <p className="font-medium text-muted-foreground">Valid Until</p>
                  <p className={isPrescriptionExpired(selected.expires_at) ? 'text-red-600 font-medium' : ''}>
                    {format(parseISO(selected.expires_at), 'PPP')}
                    {isPrescriptionExpired(selected.expires_at) && ' (Expired)'}
                  </p>
                </div>
              )}

              {/* Patient notes */}
              {selected.patient_notes && (
                <div>
                  <p className="font-medium text-muted-foreground flex items-center gap-1">
                    <MessageSquare className="w-3.5 h-3.5" /> Patient Message
                  </p>
                  <p className="mt-0.5 bg-blue-50 border border-blue-200 rounded p-2 text-xs">
                    {selected.patient_notes}
                  </p>
                </div>
              )}

              {/* Prescription text */}
              {selected.prescription_text && (
                <div>
                  <p className="font-medium text-muted-foreground">Prescription Details</p>
                  <p className="whitespace-pre-wrap mt-0.5 bg-muted/40 rounded p-2 text-xs leading-relaxed">
                    {selected.prescription_text}
                  </p>
                </div>
              )}

              {/* Medications */}
              <div>
                <p className="font-medium text-muted-foreground">Medications</p>
                {selected.medications.length === 0 ? (
                  <p className="text-muted-foreground mt-1 text-xs">No specific medications listed.</p>
                ) : (
                  <div className="space-y-2 mt-1">
                    {selected.medications.map((med: Medication, i: number) => (
                      <Card key={i} className="p-3">
                        <p className="font-medium">{med.name}</p>
                        {[med.dosage, med.frequency, med.duration].filter(Boolean).length > 0 && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {[med.dosage, med.frequency, med.duration].filter(Boolean).join(' · ')}
                          </p>
                        )}
                        {med.notes && <p className="text-xs text-muted-foreground mt-1">{med.notes}</p>}
                      </Card>
                    ))}
                  </div>
                )}
              </div>

              {/* File */}
              {selected.file_path && (
                <div>
                  <p className="font-medium text-muted-foreground">Attached File</p>
                  <div className="mt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => downloadPrescriptionFile(selected.file_path!, selected.file_name ?? 'prescription')}
                    >
                      <Download className="w-3.5 h-3.5" />
                      {selected.file_name ?? 'Download'}
                    </Button>
                  </div>
                </div>
              )}

              {/* Response notes (if already actioned) */}
              {selected.response_notes && (
                <div>
                  <p className="font-medium text-muted-foreground">Your Response</p>
                  <p className="mt-0.5 bg-muted/40 rounded p-2 text-xs">{selected.response_notes}</p>
                </div>
              )}

              {/* Actions */}
              {canAction(selected) && (
                <div className="flex gap-2 pt-1">
                  <Button
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => openAction(selected, 'dispensed')}
                  >
                    <CheckCircle className="w-4 h-4" /> Dispense
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 border-red-300 text-red-600 hover:bg-red-50"
                    onClick={() => openAction(selected, 'rejected')}
                  >
                    <XCircle className="w-4 h-4" /> Reject
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Action confirmation dialog */}
      <Dialog open={!!actionTarget} onOpenChange={(o) => { if (!o) { setActionTarget(null); setActionNotes('') } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {actionType === 'dispensed' ? 'Confirm Dispense' : 'Confirm Rejection'}
            </DialogTitle>
            <DialogDescription>
              {actionType === 'dispensed'
                ? 'Confirm that this prescription has been dispensed to the patient.'
                : 'Please provide a reason for rejecting this prescription.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">
              Notes {actionType === 'rejected' ? '(required)' : '(optional)'}
            </label>
            <Textarea
              placeholder={
                actionType === 'dispensed'
                  ? 'Any notes about the dispensing…'
                  : 'Reason for rejection…'
              }
              value={actionNotes}
              onChange={(e) => setActionNotes(e.target.value)}
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { setActionTarget(null); setActionNotes('') }}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmAction}
              disabled={actionLoading || (actionType === 'rejected' && !actionNotes.trim())}
              className={actionType === 'dispensed' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
            >
              {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              {actionType === 'dispensed' ? 'Confirm Dispense' : 'Confirm Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
