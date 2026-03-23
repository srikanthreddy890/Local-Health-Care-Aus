'use client'

import { useState, useMemo } from 'react'
import { Download, Loader2, FileText, Users, Check, Search, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from '@/lib/toast'
import { useClinicDocumentSharing, type SharedDocumentFromPatient } from '@/lib/hooks/useClinicDocumentSharing'
import DocumentViewer from './DocumentViewer'

const DOCUMENT_TYPE_FILTERS = [
  { value: 'all', label: 'All Types' },
  { value: 'treatment_plan', label: 'Treatment Plan' },
  { value: 'prescription', label: 'Prescription' },
  { value: 'test_result', label: 'Test Result' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'medical_report', label: 'Medical Report' },
  { value: 'referral', label: 'Referral' },
  { value: 'other', label: 'Other' },
]

function formatFileSize(bytes: number | null) {
  if (!bytes) return ''
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function docTypeLabel(t: string) {
  return t.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function canPreview(mimeType: string | null): boolean {
  if (!mimeType) return false
  return mimeType === 'application/pdf' || mimeType.startsWith('image/')
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
  const [previewTarget, setPreviewTarget] = useState<SharedDocumentFromPatient | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')

  // Filter and group by patient
  const groups = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    const filtered = docsFromPatients.filter((doc) => {
      if (typeFilter !== 'all' && doc.document_type !== typeFilter) return false
      if (q) {
        const haystack = [doc.title, doc.first_name, doc.last_name, doc.notes, doc.file_name]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        if (!haystack.includes(q)) return false
      }
      return true
    })

    const result: PatientGroup[] = []
    const seen = new Map<string, PatientGroup>()
    for (const doc of filtered) {
      if (!seen.has(doc.patient_id)) {
        const g: PatientGroup = { patient_id: doc.patient_id, first_name: doc.first_name, last_name: doc.last_name, docs: [] }
        seen.set(doc.patient_id, g)
        result.push(g)
      }
      seen.get(doc.patient_id)!.docs.push(doc)
    }
    return result
  }, [docsFromPatients, searchQuery, typeFilter])

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="w-6 h-6 animate-spin text-lhc-text-muted" />
      </div>
    )
  }

  if (docsFromPatients.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="w-16 h-16 rounded-full bg-[#F0FDF4] flex items-center justify-center mb-4">
          <Users className="w-8 h-8 text-[#059669]" />
        </div>
        <h3 className="text-[15px] font-medium text-lhc-text-main mb-1.5">No patient documents yet</h3>
        <p className="text-[13px] text-lhc-text-muted text-center max-w-[400px] mb-6">
          When patients share health records, X-rays, or referral letters with your clinic, they&apos;ll appear here.
        </p>
        <div className="grid grid-cols-2 gap-3 max-w-sm w-full">
          <div className="border border-lhc-border rounded-xl p-4 text-center">
            <FileText className="w-5 h-5 mx-auto mb-2 text-lhc-text-muted" />
            <p className="text-xs font-medium text-lhc-text-main mb-1">Send a document request</p>
            <p className="text-[10px] text-lhc-text-muted mb-2">Ask a patient to upload a specific document</p>
          </div>
          <div className="border border-lhc-border rounded-xl p-4 text-center">
            <Search className="w-5 h-5 mx-auto mb-2 text-lhc-text-muted" />
            <p className="text-xs font-medium text-lhc-text-main mb-1">Share via message</p>
            <p className="text-[10px] text-lhc-text-muted mb-2">Send your clinic docs to a patient directly</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Search & Filter Bar */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-lhc-text-muted" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, title, or notes…"
            className="pl-9"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DOCUMENT_TYPE_FILTERS.map((t) => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {groups.length === 0 ? (
        <div className="text-center py-10">
          <Search className="w-10 h-10 mx-auto mb-3 text-lhc-text-muted opacity-40" />
          <p className="text-sm text-lhc-text-muted">No documents match your search.</p>
        </div>
      ) : (
        groups.map((group) => (
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
                      {canPreview(doc.mime_type) && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setPreviewTarget(doc)}
                        >
                          <Eye className="w-3.5 h-3.5 mr-1.5" />Preview
                        </Button>
                      )}
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
        ))
      )}

      {otpTarget && (
        <OtpDialog
          open={!!otpTarget}
          onClose={() => setOtpTarget(null)}
          share={otpTarget}
          onSuccess={(id) => setDownloadedIds((prev) => new Set([...prev, id]))}
        />
      )}

      {previewTarget && (
        <DocumentViewer
          open={!!previewTarget}
          onClose={() => setPreviewTarget(null)}
          filePath={previewTarget.file_path}
          fileName={previewTarget.file_name}
          mimeType={previewTarget.mime_type}
          storageBucket="patient-documents"
        />
      )}
    </div>
  )
}
