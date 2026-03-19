'use client'

import { useState } from 'react'
import { Download, Loader2, FileText, Users, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from '@/lib/toast'
import { useClinicDocumentSharing, type SharedDocumentFromPatient } from '@/lib/hooks/useClinicDocumentSharing'

function formatFileSize(bytes: number | null) {
  if (!bytes) return ''
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function docTypeLabel(t: string) {
  return t.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

interface OtpDialogProps {
  open: boolean
  onClose: () => void
  share: SharedDocumentFromPatient
  onSuccess: (shareId: string) => void
}

function OtpDialog({ open, onClose, share, onSuccess }: OtpDialogProps) {
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function verify() {
    if (!otp.trim()) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/documents/verify-patient-document-download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shareId: share.share_id, otp: otp.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (res.status === 401 && data.attemptsRemaining !== undefined) {
          setError(`Incorrect OTP. ${data.attemptsRemaining} attempt${data.attemptsRemaining !== 1 ? 's' : ''} remaining.`)
        } else {
          setError(data.error ?? 'Verification failed')
        }
        return
      }
      const a = window.document.createElement('a')
      a.href = data.signedUrl
      a.download = share.file_name
      a.click()
      onSuccess(share.share_id)
      onClose()
      toast({ title: 'Download started' })
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Enter OTP to Download</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-lhc-text-muted">
            The patient must provide the one-time code for: <strong>{share.file_name}</strong>
          </p>
          <div className="space-y-1">
            <Label htmlFor="clinic-otp">One-time code</Label>
            <Input
              id="clinic-otp"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              className="text-center text-2xl tracking-widest font-mono"
              maxLength={6}
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && verify()}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button className="flex-1" onClick={verify} disabled={loading || otp.length < 6}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Download className="w-4 h-4 mr-2" />}
              Download
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

interface PatientGroup {
  patient_id: string
  first_name: string | null
  last_name: string | null
  docs: SharedDocumentFromPatient[]
}

export default function PatientSharedDocuments({ clinicId }: { clinicId: string }) {
  const { docsFromPatients, loading, revokePatientAccess } = useClinicDocumentSharing(clinicId)
  const [otpTarget, setOtpTarget] = useState<SharedDocumentFromPatient | null>(null)
  const [downloadedIds, setDownloadedIds] = useState<Set<string>>(new Set())

  // Group by patient
  const groups: PatientGroup[] = []
  const seen = new Map<string, PatientGroup>()
  for (const doc of docsFromPatients) {
    if (!seen.has(doc.patient_id)) {
      const g: PatientGroup = { patient_id: doc.patient_id, first_name: doc.first_name, last_name: doc.last_name, docs: [] }
      seen.set(doc.patient_id, g)
      groups.push(g)
    }
    seen.get(doc.patient_id)!.docs.push(doc)
  }

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="w-6 h-6 animate-spin text-lhc-text-muted" />
      </div>
    )
  }

  if (groups.length === 0) {
    return (
      <div className="text-center py-12">
        <Users className="w-10 h-10 mx-auto mb-3 text-lhc-text-muted opacity-40" />
        <p className="text-sm text-lhc-text-muted">No patients have shared documents with your clinic yet.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <Card key={group.patient_id}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              {group.first_name || group.last_name
                ? `${group.first_name ?? ''} ${group.last_name ?? ''}`.trim()
                : 'Unknown Patient'}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 divide-y divide-lhc-border">
            {group.docs.map((doc) => {
              const isDownloaded = doc.is_downloaded || downloadedIds.has(doc.share_id)
              const locked = (doc.password_attempts ?? 0) >= (doc.max_password_attempts ?? 5)
              return (
                <div key={doc.share_id} className="py-3 flex items-start gap-3">
                  <FileText className="w-5 h-5 text-lhc-text-muted flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-lhc-text-main">{doc.title}</p>
                    <p className="text-xs text-lhc-text-muted">{doc.file_name}{doc.file_size ? ` · ${formatFileSize(doc.file_size)}` : ''}</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      <Badge variant="outline" className="text-xs">{docTypeLabel(doc.document_type)}</Badge>
                      {isDownloaded && (
                        <Badge className="text-xs bg-green-100 text-green-700 border-green-200">
                          <Check className="w-3 h-3 mr-1" />Downloaded
                        </Badge>
                      )}
                      {locked && !isDownloaded && (
                        <Badge variant="destructive" className="text-xs">Locked</Badge>
                      )}
                    </div>
                    <p className="text-xs text-lhc-text-muted mt-1">
                      Shared {new Date(doc.shared_at).toLocaleDateString()}
                      {doc.expires_at ? ` · Expires ${new Date(doc.expires_at).toLocaleDateString()}` : ''}
                    </p>
                    {doc.notes && <p className="text-xs text-lhc-text-muted italic mt-0.5">{doc.notes}</p>}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Button
                      size="sm"
                      variant={isDownloaded ? 'outline' : 'default'}
                      disabled={locked && !isDownloaded}
                      onClick={() => setOtpTarget(doc)}
                    >
                      <Download className="w-3.5 h-3.5 mr-1.5" />
                      {isDownloaded ? 'Re-download' : 'Download'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs text-destructive hover:text-destructive"
                      onClick={() => revokePatientAccess(doc.share_id)}
                    >
                      Revoke
                    </Button>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      ))}

      {otpTarget && (
        <OtpDialog
          open={!!otpTarget}
          onClose={() => setOtpTarget(null)}
          share={otpTarget}
          onSuccess={(id) => setDownloadedIds((prev) => new Set([...prev, id]))}
        />
      )}
    </div>
  )
}
