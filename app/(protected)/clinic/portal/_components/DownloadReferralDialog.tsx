'use client'

import { useState, useEffect } from 'react'
import { Loader2, AlertTriangle, LockKeyhole } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { ReceivedReferral } from '@/lib/hooks/useClinicReferrals'

interface DownloadReferralDialogProps {
  open: boolean
  onClose: () => void
  referral: ReceivedReferral | null
  onVerify: (referralId: string, password: string) => Promise<{
    success: boolean
    error?: string
    attemptsRemaining?: number
    locked?: boolean
  }>
  onSuccess: () => void
}

export default function DownloadReferralDialog({
  open,
  onClose,
  referral,
  onVerify,
  onSuccess,
}: DownloadReferralDialogProps) {
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [attemptsLeft, setAttemptsLeft] = useState<number | undefined>(undefined)
  const [locked, setLocked] = useState(false)

  // Reset state when dialog opens or referral changes
  useEffect(() => {
    if (open) {
      setPassword('')
      setError('')
      setAttemptsLeft(undefined)
      setLocked(false)
      setLoading(false)
    }
  }, [open, referral?.id])

  async function handleVerify() {
    if (!referral || !password.trim()) return
    setLoading(true)
    setError('')
    const result = await onVerify(referral.id, password.toUpperCase())
    setLoading(false)

    if (result.success) {
      onSuccess()
      onClose()
    } else {
      setError(result.error ?? 'Verification failed.')
      if (result.attemptsRemaining !== undefined) setAttemptsLeft(result.attemptsRemaining)
      if (result.locked) setLocked(true)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-sm">
        {referral ? (
          <>
            <DialogHeader>
              <DialogTitle className="text-lhc-text-main">Download Referral</DialogTitle>
            </DialogHeader>

            {/* Document info */}
            <div className="p-3 rounded-md bg-lhc-surface border border-lhc-border text-sm space-y-1">
              <p className="font-medium text-lhc-text-main">{referral.document_title}</p>
              <p className="text-lhc-text-muted">From: {referral.source_clinic_name}</p>
            </div>

            {locked ? (
              <div className="flex items-start gap-3 p-4 rounded-md bg-red-50 border border-red-200 text-sm">
                <LockKeyhole className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-red-800">Access Locked</p>
                  <p className="text-red-600 mt-1">
                    Too many failed attempts. Contact the referring clinic to resend the password.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Enter Password</Label>
                  <Input
                    value={password}
                    onChange={e => setPassword(e.target.value.toUpperCase())}
                    maxLength={8}
                    placeholder="8-character password"
                    autoComplete="off"
                    className="font-mono text-lg tracking-widest text-center uppercase"
                    onKeyDown={e => { if (e.key === 'Enter') handleVerify() }}
                  />
                </div>

                {error && (
                  <div className="flex items-start gap-2 text-sm">
                    <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                    <span className="text-red-600">{error}</span>
                  </div>
                )}

                {attemptsLeft !== undefined && !locked && (
                  <p className="text-sm text-amber-600 text-center">
                    {attemptsLeft} attempt{attemptsLeft !== 1 ? 's' : ''} remaining
                  </p>
                )}
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              {!locked && (
                <Button onClick={handleVerify} disabled={!password.trim() || loading}>
                  {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Download
                </Button>
              )}
            </DialogFooter>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
