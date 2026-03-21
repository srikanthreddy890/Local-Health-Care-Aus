'use client'

import { useState, useEffect } from 'react'
import { Loader2, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import type { ClinicOption, ClinicDocument } from '@/lib/hooks/useClinicReferrals'

interface ShareClinicReferralDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  allClinics: ClinicOption[]
  clinicDocuments: ClinicDocument[]
  onLoadClinics: () => Promise<void>
  onLoadDocuments: () => Promise<void>
  onSubmit: (params: {
    targetClinicId: string
    documentIds: string[]
    patientName?: string
    referralNotes?: string
  }) => Promise<boolean>
}

function docTypeLabel(t: string) {
  return t.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export default function ShareClinicReferralDialog({
  open,
  onOpenChange,
  allClinics,
  clinicDocuments,
  onLoadClinics,
  onLoadDocuments,
  onSubmit,
}: ShareClinicReferralDialogProps) {
  const [targetClinicId, setTargetClinicId] = useState('')
  const [selectedDocIds, setSelectedDocIds] = useState<Set<string>>(new Set())
  const [patientName, setPatientName] = useState('')
  const [referralNotes, setReferralNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      onLoadClinics()
      onLoadDocuments()
    }
    // Only trigger on open state change, not on function identity
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  function resetForm() {
    setTargetClinicId('')
    setSelectedDocIds(new Set())
    setPatientName('')
    setReferralNotes('')
  }

  function toggleDoc(docId: string) {
    setSelectedDocIds(prev => {
      const next = new Set(prev)
      if (next.has(docId)) next.delete(docId)
      else next.add(docId)
      return next
    })
  }

  async function handleSubmit() {
    if (!targetClinicId || selectedDocIds.size === 0) return
    setSubmitting(true)
    const success = await onSubmit({
      targetClinicId,
      documentIds: Array.from(selectedDocIds),
      patientName: patientName.trim() || undefined,
      referralNotes: referralNotes.trim() || undefined,
    })
    setSubmitting(false)
    if (success) {
      resetForm()
      onOpenChange(false)
    }
  }

  const docCount = selectedDocIds.size

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v) }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lhc-text-main">Send Referral</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Target Clinic */}
          <div className="space-y-1.5">
            <Label>Receiving Clinic *</Label>
            <Select value={targetClinicId} onValueChange={setTargetClinicId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a clinic" />
              </SelectTrigger>
              <SelectContent>
                {allClinics.map(c => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Documents */}
          <div className="space-y-1.5">
            <Label>Documents to Share *</Label>
            <div className="max-h-48 overflow-y-auto border border-lhc-border rounded-md p-2 space-y-2">
              {clinicDocuments.length === 0 ? (
                <p className="text-lhc-text-muted text-sm py-2 text-center">No documents uploaded yet.</p>
              ) : (
                clinicDocuments.map(doc => (
                  <label
                    key={doc.id}
                    className="flex items-center gap-2 p-1.5 rounded hover:bg-lhc-surface cursor-pointer"
                  >
                    <Checkbox
                      checked={selectedDocIds.has(doc.id)}
                      onCheckedChange={() => toggleDoc(doc.id)}
                    />
                    <span className="text-sm text-lhc-text-main flex-1 truncate">{doc.title}</span>
                    <span className="text-xs text-lhc-text-muted">{docTypeLabel(doc.document_type)}</span>
                  </label>
                ))
              )}
            </div>
          </div>

          {/* Patient Name */}
          <div className="space-y-1.5">
            <Label>Patient Name (optional)</Label>
            <Input
              value={patientName}
              onChange={e => setPatientName(e.target.value)}
              placeholder="For reference only"
            />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label>Referral Notes (optional)</Label>
            <Textarea
              value={referralNotes}
              onChange={e => setReferralNotes(e.target.value)}
              placeholder="Any additional information for the receiving clinic"
              rows={3}
            />
          </div>

          {/* Info box */}
          <div className="flex gap-2 p-3 rounded-md bg-lhc-surface text-sm text-lhc-text-muted">
            <Info className="w-4 h-4 mt-0.5 shrink-0" />
            <p>
              The receiving clinic will get two emails: one with referral details and a separate one with a download password. Documents expire after 30 days.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { resetForm(); onOpenChange(false) }}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!targetClinicId || docCount === 0 || submitting}
          >
            {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {docCount > 1 ? `Send Referral (${docCount} docs)` : 'Send Referral'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
