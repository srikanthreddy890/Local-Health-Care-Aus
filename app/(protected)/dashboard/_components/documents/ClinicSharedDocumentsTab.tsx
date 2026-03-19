'use client'

import { useState, useEffect, useMemo } from 'react'
import { Download, Loader2, Building2, FileText, Search, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import { toast } from '@/lib/toast'

interface SharedDoc {
  share_id: string
  document_id: string
  file_name: string
  title: string
  document_type: string
  file_size: number | null
  shared_at: string
  expires_at: string | null
  is_downloaded: boolean
  password_attempts: number
  max_password_attempts: number
  access_revoked: boolean
  notes: string | null
  clinic_id: string
  clinic_name: string
  clinic_logo: string | null
}

interface ClinicGroup {
  clinic_id: string
  clinic_name: string
  clinic_logo: string | null
  docs: SharedDoc[]
}

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
  shareId: string
  fileName: string
  attemptsUsed: number
  maxAttempts: number
  onSuccess: (shareId: string) => void
}

function OtpDialog({ open, onClose, shareId, fileName, attemptsUsed, maxAttempts, onSuccess }: OtpDialogProps) {
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) { setOtp(''); setError('') }
  }, [open])

  async function verify() {
    if (!otp.trim()) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/documents/verify-clinic-document-download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shareId, otp: otp.trim() }),
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
      // Trigger download
      const a = window.document.createElement('a')
      a.href = data.signedUrl
      a.download = fileName
      a.click()
      onSuccess(shareId)
      onClose()
      toast({ title: 'Download started' })
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const remaining = maxAttempts - attemptsUsed
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Enter OTP to Download</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-lhc-text-muted">
            Enter the one-time code provided by the clinic for: <strong>{fileName}</strong>
          </p>
          <div className="space-y-1">
            <Label htmlFor="otp-input">One-time code</Label>
            <Input
              id="otp-input"
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
          {attemptsUsed > 0 && !error && (
            <p className="text-xs text-amber-600">{remaining} attempt{remaining !== 1 ? 's' : ''} remaining.</p>
          )}
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

interface ClinicSharedDocumentsTabProps {
  userId: string
}

export default function ClinicSharedDocumentsTab({ userId }: ClinicSharedDocumentsTabProps) {
  const [docs, setDocs] = useState<SharedDoc[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [otpTarget, setOtpTarget] = useState<SharedDoc | null>(null)
  const [downloadedIds, setDownloadedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!userId) return
    setLoading(true)
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(supabase as any)
      .rpc('get_shared_documents_for_patient', { p_patient_id: userId })
      .then(({ data, error }: { data: SharedDoc[] | null; error: unknown }) => {
        if (!error) setDocs(data ?? [])
        setLoading(false)
      })
  }, [userId])

  const filtered = useMemo(() => {
    if (!search) return docs
    const q = search.toLowerCase()
    return docs.filter((d) =>
      d.title.toLowerCase().includes(q) ||
      d.file_name.toLowerCase().includes(q) ||
      d.clinic_name.toLowerCase().includes(q)
    )
  }, [docs, search])

  const groups = useMemo<ClinicGroup[]>(() => {
    const map = new Map<string, ClinicGroup>()
    for (const doc of filtered) {
      if (!map.has(doc.clinic_id)) {
        map.set(doc.clinic_id, { clinic_id: doc.clinic_id, clinic_name: doc.clinic_name, clinic_logo: doc.clinic_logo, docs: [] })
      }
      map.get(doc.clinic_id)!.docs.push(doc)
    }
    return Array.from(map.values())
  }, [filtered])

  function handleDownloadSuccess(shareId: string) {
    setDownloadedIds((prev) => new Set([...prev, shareId]))
  }

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="w-6 h-6 animate-spin text-lhc-text-muted" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-lhc-text-muted" />
        <Input
          placeholder="Search documents or clinics…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {groups.length === 0 ? (
        <div className="text-center py-12">
          <Building2 className="w-10 h-10 mx-auto mb-3 text-lhc-text-muted opacity-40" />
          <p className="text-sm text-lhc-text-muted">No documents have been shared with you by clinics yet.</p>
        </div>
      ) : (
        groups.map((group) => (
          <Card key={group.clinic_id}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                {group.clinic_logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={group.clinic_logo} alt={group.clinic_name} className="w-6 h-6 rounded object-cover" />
                ) : (
                  <Building2 className="w-5 h-5 text-lhc-text-muted" />
                )}
                {group.clinic_name}
                <Badge variant="outline" className="ml-auto text-xs font-normal">
                  {group.docs.length} {group.docs.length === 1 ? 'document' : 'documents'}
                </Badge>
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
                    <Button
                      size="sm"
                      variant={isDownloaded ? 'outline' : 'default'}
                      className="flex-shrink-0"
                      disabled={locked && !isDownloaded}
                      onClick={() => setOtpTarget(doc)}
                    >
                      <Download className="w-3.5 h-3.5 mr-1.5" />
                      {isDownloaded ? 'Re-download' : 'Download'}
                    </Button>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        ))
      )}

      {otpTarget && (
        <OtpDialog
          open={!!otpTarget}
          onClose={() => setOtpTarget(null)}
          shareId={otpTarget.share_id}
          fileName={otpTarget.file_name}
          attemptsUsed={otpTarget.password_attempts ?? 0}
          maxAttempts={otpTarget.max_password_attempts ?? 5}
          onSuccess={handleDownloadSuccess}
        />
      )}
    </div>
  )
}
