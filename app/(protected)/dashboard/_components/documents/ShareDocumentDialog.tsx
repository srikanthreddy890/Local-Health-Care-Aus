'use client'

import { useState, useEffect } from 'react'
import { Copy, Check, Share2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from '@/lib/toast'
import { usePatientDocumentSharing } from '@/lib/hooks/usePatientDocumentSharing'
import type { PatientDocument } from '@/lib/hooks/usePatientDocuments'
import type { EligibleClinic } from '@/lib/hooks/usePatientDocumentSharing'

interface ShareDocumentDialogProps {
  document: PatientDocument | null
  open: boolean
  onOpenChange: (v: boolean) => void
  patientId: string
}

type Step = 'select' | 'otp'

export default function ShareDocumentDialog({
  document,
  open,
  onOpenChange,
  patientId,
}: ShareDocumentDialogProps) {
  const { fetchEligibleClinics } = usePatientDocumentSharing(patientId)

  const [step, setStep] = useState<Step>('select')
  const [clinics, setClinics] = useState<EligibleClinic[]>([])
  const [loadingClinics, setLoadingClinics] = useState(false)
  const [selectedClinicId, setSelectedClinicId] = useState<string>('')
  const [notes, setNotes] = useState('')
  const [expiryDate, setExpiryDate] = useState('')
  const [sharing, setSharing] = useState(false)
  const [otp, setOtp] = useState('')
  const [copied, setCopied] = useState(false)
  const [confirmed, setConfirmed] = useState(false)

  useEffect(() => {
    if (open) {
      setLoadingClinics(true)
      fetchEligibleClinics()
        .then((data) => { setClinics(data); setLoadingClinics(false) })
        .catch(() => setLoadingClinics(false))
      // Reset state when dialog opens
      setStep('select')
      setSelectedClinicId('')
      setNotes('')
      setExpiryDate('')
      setOtp('')
      setCopied(false)
      setConfirmed(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  async function handleShare() {
    if (!document || !selectedClinicId) return
    setSharing(true)
    try {
      const body: Record<string, unknown> = {
        documentId: document.id,
        clinicId: selectedClinicId,
        patientId,
        notes: notes || null,
      }
      if (expiryDate) {
        body.expiresAt = new Date(expiryDate).toISOString()
      }

      const res = await fetch('/api/documents/share-patient-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to share')
      setOtp(data.otp)
      setStep('otp')
    } catch (err) {
      toast({ title: 'Share failed', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' })
    } finally {
      setSharing(false)
    }
  }

  function copyOtp() {
    navigator.clipboard.writeText(otp)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleClose() {
    if (step === 'otp' && !confirmed) {
      toast({ title: 'Please confirm you have noted the OTP before closing.' })
      return
    }
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-4 h-4" />
            Share Document
          </DialogTitle>
        </DialogHeader>

        {step === 'select' && (
          <div className="space-y-4">
            <p className="text-sm text-lhc-text-muted">
              Sharing: <span className="font-medium text-lhc-text-main">{document?.title}</span>
            </p>

            <div className="space-y-2">
              <Label>Select Clinic</Label>
              {loadingClinics ? (
                <div className="flex items-center gap-2 text-sm text-lhc-text-muted py-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading clinics…
                </div>
              ) : clinics.length === 0 ? (
                <p className="text-sm text-lhc-text-muted py-2">
                  No eligible clinics found. You must have a booking with a clinic before sharing documents.
                </p>
              ) : (
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {clinics.map((clinic) => (
                    <label
                      key={clinic.id}
                      className={`flex items-center gap-3 p-2 rounded-lg border cursor-pointer transition-colors ${
                        selectedClinicId === clinic.id
                          ? 'border-lhc-primary bg-lhc-primary/5'
                          : 'border-lhc-border hover:bg-lhc-surface'
                      }`}
                    >
                      <input
                        type="radio"
                        name="clinic"
                        value={clinic.id}
                        checked={selectedClinicId === clinic.id}
                        onChange={() => setSelectedClinicId(clinic.id)}
                        className="accent-lhc-primary"
                      />
                      <span className="text-sm font-medium text-lhc-text-main">{clinic.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add a note for the clinic…"
                className="h-20 resize-none"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="expiry">Expires (optional)</Label>
              <Input
                id="expiry"
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
              <p className="text-xs text-lhc-text-muted">Defaults to 48 hours if not set.</p>
            </div>

            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={handleShare}
                disabled={sharing || !selectedClinicId || clinics.length === 0}
              >
                {sharing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Share &amp; Generate OTP
              </Button>
            </div>
          </div>
        )}

        {step === 'otp' && (
          <div className="space-y-4">
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 text-center space-y-2">
              <p className="text-xs text-amber-700 font-medium uppercase tracking-wider">Your one-time code</p>
              <div className="flex items-center justify-center gap-3">
                <span className="text-4xl font-mono font-bold tracking-widest text-amber-900">{otp}</span>
                <Button size="icon" variant="ghost" onClick={copyOtp} className="text-amber-700 hover:bg-amber-100">
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            <p className="text-sm text-lhc-text-muted">
              Share this code with the clinic — verbally or by message. The clinic must enter it to download
              the document. This code expires and can only be used once.
            </p>

            <div className="flex items-center gap-2">
              <Checkbox
                id="confirm"
                checked={confirmed}
                onCheckedChange={(v) => setConfirmed(!!v)}
              />
              <Label htmlFor="confirm" className="text-sm cursor-pointer">
                I&apos;ve noted the OTP
              </Label>
            </div>

            <Button
              className="w-full"
              onClick={() => onOpenChange(false)}
              disabled={!confirmed}
            >
              Done
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
